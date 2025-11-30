import os
import json
import magic 
from psycopg2.extras import RealDictCursor
import xml.etree.ElementTree as ET
from flask import Flask, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pydantic import ValidationError

# --- IMPORTS ---
from backend.services.parsers.flowchart import parse_drawio_xml as parse_flowchart
from backend.services.parsers.nassi import parse_nassi_shneiderman_xml as parse_ns
from backend.services.parsers.image import parse_image_diagram
from backend.services.grading.ai_grader import grade_with_ai
from backend.schemas.validation import (
    AssignmentCreateSchema, SubmissionCreateSchema, 
    UserRegisterSchema, UserLoginSchema, SeminarCreateSchema
)
from backend.core.auth import hash_password, verify_password, decode_token, generate_tokens
from backend.services.analysis.complexity import calculate_cyclomatic_complexity
from backend.services.analysis.plagiarism import detect_plagiarism, extract_graph_signature
from backend.services.analysis.cfg import analyze_flowchart_cfg
# UPDATED IMPORT: Added release_db_connection
from backend.core.database import get_db_connection, release_db_connection
from backend.services.grading.static_analysis import analyze_code_style
from backend.services.grading.keyword import grade_with_keywords
from backend.services.execution.engine import run_test_cases
from backend.services.chatbot import chat_with_tutor

# --- CONFIGURATION ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR) 
UPLOAD_FOLDER = os.path.join(PROJECT_ROOT, 'uploads')
TEMPLATE_FOLDER = os.path.join(UPLOAD_FOLDER, 'templates')
SUBMISSION_FOLDER = os.path.join(UPLOAD_FOLDER, 'submissions')
STATIC_FOLDER = os.path.join(BASE_DIR, 'static')

for d in [UPLOAD_FOLDER, TEMPLATE_FOLDER, SUBMISSION_FOLDER]:
    os.makedirs(d, exist_ok=True)

app = Flask(__name__, static_folder=STATIC_FOLDER, static_url_path='/')
CORS(app, resources={r"/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization"])

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 

limiter = Limiter(get_remote_address, app=app, default_limits=["200 per day", "50 per hour"], storage_uri="memory://")

# --- HELPERS ---

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header: return None
    try:
        token = auth_header.split(" ")[1]
    except IndexError:
        return None
    return decode_token(token, verify_type='access')

def validate_file_content(file_stream, expected_type):
    header = file_stream.read(2048)
    file_stream.seek(0) 
    mime = magic.from_buffer(header, mime=True)
    if expected_type == 'image':
        if not mime.startswith('image/'): return False, f"Invalid file content. Expected image, got {mime}"
    elif expected_type == 'xml':
        valid_xml_mimes = ['text/xml', 'application/xml', 'text/plain'] 
        if mime not in valid_xml_mimes: return False, f"Invalid file content. Expected XML, got {mime}"
    return True, mime

def detect_diagram_type(file_path):
    try:
        tree = ET.parse(file_path); root = tree.getroot()
        return 'flowchart' if len(root.findall(".//mxCell[@edge='1']")) > 0 else 'nassi_shneiderman'
    except: return 'flowchart'

def validate_code_safety(code, language):
    forbidden_patterns = {
        'python': ['import os', 'import sys', 'import subprocess', 'from os', 'from sys', 'exec(', 'eval(', 'open(', '__import__', 'os.system'],
        'cpp': ['system(', 'popen(', 'fork(', 'execv', 'execl', '<cstdlib>'],
        'java': ['Runtime.getRuntime', 'ProcessBuilder', 'System.exit']
    }
    patterns = forbidden_patterns.get(language, [])
    for pattern in patterns:
        if pattern in code:
            return False, pattern
    return True, None

# --- ROUTES ---

@app.route("/api/status")
def hello(): return "Backend server (Header Auth + Sandbox + Chatbot) is running!"

@app.route('/auth/register', methods=['POST'])
@limiter.limit("5 per minute")
def register():
    try:
        data = request.json
        validated = UserRegisterSchema(**data)
    except ValidationError as e: return jsonify({"error": str(e)}), 400

    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT 1 FROM users WHERE email=%s", (validated.email,))
        if cur.fetchone(): return jsonify({"error": "User exists"}), 409
        
        cur.execute("INSERT INTO users (username, email, password_hash, role) VALUES (%s,%s,%s,%s) RETURNING id", 
                   (validated.username, validated.email, hash_password(validated.password), validated.role))
        uid = cur.fetchone()[0]; conn.commit()
        
        access_token, refresh_token = generate_tokens(uid, validated.role, validated.username)
        
        return jsonify({
            "message": "User registered successfully", 
            "token": access_token,
            "refresh_token": refresh_token,
            "user": {"id": uid, "role": validated.role, "username": validated.username}
        }), 201

    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/auth/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    try:
        data = request.json
        validated = UserLoginSchema(**data) 
    except ValidationError as e: return jsonify({"error": str(e)}), 400
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM users WHERE email=%s OR username=%s", (validated.identifier, validated.identifier))
        u = cur.fetchone()
        
        if u and verify_password(u['password_hash'], validated.password):
            access_token, refresh_token = generate_tokens(u['id'], u['role'], u['username'])
            
            return jsonify({
                "message": "Login successful", 
                "token": access_token,
                "refresh_token": refresh_token,
                "user": {"id": u['id'], "role": u['role'], "username": u['username']}
            }), 200
            
        return jsonify({"error": "Invalid credentials"}), 401
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/auth/refresh', methods=['POST'])
def refresh_token():
    data = request.json or {}
    ref_token = data.get('refresh_token')
    if not ref_token: return jsonify({"error": "Missing refresh token"}), 401
    
    payload = decode_token(ref_token, verify_type='refresh')
    if not payload: return jsonify({"error": "Invalid or expired refresh token"}), 401
    
    new_acc_token, new_ref_token = generate_tokens(payload['user_id'], payload['role'], payload.get('username', 'User'))
    
    return jsonify({
        "token": new_acc_token,
        "refresh_token": new_ref_token
    }), 200

@app.route('/auth/logout', methods=['POST'])
def logout():
    return jsonify({"message": "Logged out"}), 200

@app.route('/auth/me', methods=['GET'])
def get_me():
    u = get_current_user()
    if not u: return jsonify({"error": "Unauthorized"}), 401
    return jsonify({"user": {"id": u['user_id'], "role": u['role'], "username": u['username']}})

@app.route('/chat', methods=['POST'])
@limiter.limit("10 per minute")
def chat():
    user = get_current_user()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    message = data.get('message', '').strip()
    history = data.get('history', []) 
    
    if not message: return jsonify({"error": "Message cannot be empty"}), 400
    if not isinstance(history, list): history = []
        
    response = chat_with_tutor(message, history)
    if 'error' in response: return jsonify(response), 500
    return jsonify(response), 200

@app.route('/seminars', methods=['GET'])
def list_seminars():
    u = get_current_user(); 
    if not u: return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT s.*, u.username as creator_name FROM seminars s JOIN seminar_members sm ON s.id=sm.seminar_id JOIN users u ON s.creator_id=u.id WHERE sm.user_id=%s ORDER BY s.created_at DESC", (u['user_id'],))
        return jsonify(cur.fetchall())
    # ADDED: finally block to prevent leaks
    finally: cur.close(); release_db_connection(conn)

@app.route('/seminar', methods=['POST'])
@limiter.limit("5 per minute")
def create_seminar():
    u = get_current_user(); 
    if not u or u['role'] != 'teacher': return jsonify({"error": "Teachers only"}), 403
    try: d = SeminarCreateSchema(**request.json)
    except ValidationError as e: return jsonify({"error": str(e)}), 400
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("INSERT INTO seminars (title, description, invite_code, creator_id) VALUES (%s,%s,%s,%s) RETURNING id", (d.title, d.description, d.invite_code, u['user_id']))
        sid = cur.fetchone()[0]
        cur.execute("INSERT INTO seminar_members (user_id, seminar_id) VALUES (%s,%s)", (u['user_id'], sid))
        conn.commit(); return jsonify({"message": "Created", "id": sid}), 201
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/seminar/join', methods=['POST'])
@limiter.limit("10 per minute")
def join_seminar():
    u = get_current_user(); 
    if not u: return jsonify({"error": "Unauthorized"}), 401
    data = request.json
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("SELECT id FROM seminars WHERE invite_code=%s", (data.get('invite_code'),))
        res = cur.fetchone()
        if not res: return jsonify({"error": "Invalid code"}), 404
        try: 
            cur.execute("INSERT INTO seminar_members (user_id, seminar_id) VALUES (%s,%s)", (u['user_id'], res[0]))
            conn.commit(); return jsonify({"message": "Joined"}), 200
        except: return jsonify({"message": "Already member"}), 200
    # ADDED: finally block to prevent leaks
    finally: cur.close(); release_db_connection(conn)

@app.route('/seminar/<int:seminar_id>/leave', methods=['POST'])
def leave_seminar(seminar_id):
    user = get_current_user()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("DELETE FROM seminar_members WHERE user_id = %s AND seminar_id = %s", (user['user_id'], seminar_id))
        conn.commit(); return jsonify({"message": "Left seminar"}), 200
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/assignments', methods=['GET'])
def list_assignments():
    u = get_current_user(); sid = request.args.get('seminar_id')
    if not u or not sid: return jsonify({"error": "Invalid"}), 400
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT 1 FROM seminar_members WHERE user_id=%s AND seminar_id=%s", (u['user_id'], sid))
        if not cur.fetchone(): return jsonify({"error": "Access denied"}), 403
        cur.execute("SELECT * FROM assignments WHERE seminar_id=%s ORDER BY created_at DESC", (sid,))
        return jsonify(cur.fetchall())
    # ADDED: finally block to prevent leaks
    finally: cur.close(); release_db_connection(conn)

@app.route('/assignment', methods=['POST'])
def create_assignment():
    user = get_current_user()
    if not user or user['role'] != 'teacher': return jsonify({"error": "Teachers only"}), 403
    try:
        form_data = request.form.to_dict()
        if 'plagiarism_check_enabled' in form_data: form_data['plagiarism_check_enabled'] = form_data['plagiarism_check_enabled'].lower() == 'true'
        if 'static_analysis_enabled' in form_data: form_data['static_analysis_enabled'] = form_data['static_analysis_enabled'].lower() == 'true'
        if 'test_cases' not in form_data or not form_data['test_cases']: form_data['test_cases'] = '[]'
        validated_data = AssignmentCreateSchema(**form_data)
    except ValidationError as e: return jsonify({"error": "Validation", "details": e.errors()}), 400

    if 'template_code' not in request.files: return jsonify({"error": "No file"}), 400
    file = request.files['template_code']
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO assignments (seminar_id, creator_id, title, description, grading_prompt, language, plagiarism_check_enabled, grading_type, static_analysis_enabled, test_cases, template_path) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) RETURNING id;""",
            (validated_data.seminar_id, user['user_id'], validated_data.title, validated_data.description, validated_data.grading_prompt, validated_data.language, validated_data.plagiarism_check_enabled, validated_data.grading_type, validated_data.static_analysis_enabled, validated_data.test_cases, "placeholder"))
        assignment_id = cur.fetchone()[0]
        
        filename = f"template_{assignment_id}{os.path.splitext(file.filename)[1]}"
        template_path = os.path.join(TEMPLATE_FOLDER, filename)
        file.save(template_path)
        
        cur.execute("UPDATE assignments SET template_path = %s WHERE id = %s;", (template_path, assignment_id))
        conn.commit(); return jsonify({"message": "Created", "id": assignment_id}), 201
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/assignment/<int:assignment_id>', methods=['DELETE'])
def delete_assignment(assignment_id):
    user = get_current_user()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT creator_id, template_path FROM assignments WHERE id = %s", (assignment_id,))
        assignment = cur.fetchone()
        if not assignment: return jsonify({"error": "Not found"}), 404
        if user['role'] != 'admin' and assignment['creator_id'] != user['user_id']: return jsonify({"error": "Permission denied"}), 403
        cur.execute("SELECT file_path FROM submissions WHERE assignment_id = %s", (assignment_id,))
        submissions = cur.fetchall()
        cur.execute("DELETE FROM assignments WHERE id = %s", (assignment_id,))
        conn.commit()
        if os.path.exists(assignment['template_path']): os.remove(assignment['template_path'])
        for sub in submissions:
            if os.path.exists(sub['file_path']): os.remove(sub['file_path'])
        return jsonify({"message": "Deleted"}), 200
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/assignment/<int:aid>/submissions', methods=['GET'])
def list_assignment_submissions(aid):
    u = get_current_user()
    if not u: return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT creator_id FROM assignments WHERE id=%s", (aid,))
        a = cur.fetchone()
        if u['role']!='admin' and a['creator_id']!=u['user_id']: return jsonify({"error": "Denied"}), 403
        cur.execute("SELECT * FROM submissions WHERE assignment_id=%s ORDER BY created_at DESC", (aid,))
        return jsonify(cur.fetchall())
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/assignment/<int:assignment_id>/my-submissions', methods=['GET'])
def get_my_submissions(assignment_id):
    user = get_current_user()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""SELECT id, created_at, submission_mode, grading_result, plagiarism_score, complexity, generated_code, test_results, static_analysis_report FROM submissions WHERE assignment_id = %s AND student_id = %s ORDER BY created_at DESC""", (assignment_id, user['user_id']))
        return jsonify(cur.fetchall())
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/submit/<int:assignment_id>', methods=['POST'])
@limiter.limit("5 per minute")
def submit_for_grading(assignment_id):
    user = get_current_user()
    if not user: return jsonify({"error": "Unauthorized"}), 401
    try:
        form_data = request.form.to_dict()
        validated_data = SubmissionCreateSchema(**form_data)
    except ValidationError as e: return jsonify({"error": "Validation", "details": e.errors()}), 400
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT * FROM assignments WHERE id = %s", (assignment_id,))
        assignment = cur.fetchone()
        if not assignment: return jsonify({"error": "Not found"}), 404
        cur.execute("SELECT 1 FROM seminar_members WHERE user_id = %s AND seminar_id = %s", (user['user_id'], assignment['seminar_id']))
        if not cur.fetchone(): return jsonify({"error": "Not a member of this seminar"}), 403
        if 'diagram_file' not in request.files: return jsonify({"error": "No file"}), 400
        diagram_file = request.files['diagram_file']
        filename = secure_filename(diagram_file.filename)
        
        is_image_ext = filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp'))
        expected_type = 'image' if is_image_ext else 'xml'
        is_valid, mime_msg = validate_file_content(diagram_file.stream, expected_type)
        if not is_valid: return jsonify({"error": mime_msg}), 400
        
        cur.execute("INSERT INTO submissions (assignment_id, student_id, file_path, original_filename, submission_mode) VALUES (%s, %s, %s, %s, %s) RETURNING id;", (assignment_id, user['user_id'], "placeholder", filename, validated_data.submission_mode))
        submission_id = cur.fetchone()['id']
        submission_filename = f"sub_{assignment_id}_{submission_id}_{filename}"
        submission_path = os.path.join(SUBMISSION_FOLDER, submission_filename)
        diagram_file.save(submission_path)

        target_language = assignment['language']
        generated_code = ""; used_method = ""; complexity_score = 1
        dead_code_report = []; uninit_vars_report = []; graph_signature = None

        if validated_data.submission_mode == 'image' or (validated_data.submission_mode == 'auto' and is_image_ext):
            used_method = "ai_vision"
            generated_code = parse_image_diagram(submission_path, validated_data.description, language=target_language)
            complexity_score = calculate_cyclomatic_complexity(generated_code, language=target_language)
        else:
            used_method = validated_data.diagram_type 
            if used_method == 'auto': used_method = detect_diagram_type(submission_path)
            if used_method == 'flowchart':
                generated_code, nodes, edges, start_id = parse_flowchart(submission_path, language=target_language, return_graph=True)
                cfg_stats = analyze_flowchart_cfg(nodes, edges, start_id)
                complexity_score = cfg_stats['cyclomatic_complexity']; dead_code_report = cfg_stats['dead_code_nodes']; uninit_vars_report = cfg_stats['uninitialized_vars']
                graph_signature = extract_graph_signature(nodes, edges)
            else:
                generated_code = parse_ns(submission_path, language=target_language)
                complexity_score = calculate_cyclomatic_complexity(generated_code, language=target_language)

        # --- SECURITY CHECK ---
        is_safe, unsafe_keyword = validate_code_safety(generated_code, target_language)
        if not is_safe:
            conn.rollback()
            return jsonify({"error": f"Security Violation: Your diagram produces code with forbidden keyword '{unsafe_keyword}'."}), 400

        static_report = None
        if assignment.get('static_analysis_enabled'): static_report = analyze_code_style(generated_code, language=target_language)
        
        plagiarism_score = 0
        if assignment['plagiarism_check_enabled']:
            cur.execute("SELECT generated_code FROM submissions WHERE assignment_id=%s AND student_id!=%s", (assignment_id, user['user_id']))
            previous_subs = cur.fetchall()
            plag_subs = [{'id': 0, 'generated_code': r['generated_code'], 'graph_signature': None} for r in previous_subs]
            plagiarism_score, _ = detect_plagiarism(generated_code, graph_signature, plag_subs)

        test_results = None
        if generated_code and target_language == 'python':
             test_cases_data = assignment.get('test_cases')
             if test_cases_data:
                 if isinstance(test_cases_data, str):
                     try: test_cases_data = json.loads(test_cases_data)
                     except: pass
                 if isinstance(test_cases_data, list) and len(test_cases_data) > 0:
                     test_results = run_test_cases(generated_code, test_cases_data, language=target_language)

        grade_result = {}
        if assignment.get('grading_type') == 'keyword':
            keywords = assignment.get('grading_prompt', '')
            grade_result = grade_with_keywords(generated_code, keywords)
        else:
            with open(assignment['template_path'], 'r') as f: template_code = f.read()
            grade_result = grade_with_ai(generated_code, template_code, assignment['description'], assignment.get('grading_prompt', ''))

        if uninit_vars_report or dead_code_report:
            grade_result['feedback'] += "\n\n[Automated Analysis Warnings]:"
            if dead_code_report: grade_result['feedback'] += f"\n- Dead code detected in {len(dead_code_report)} blocks."
            if uninit_vars_report: grade_result['feedback'] += "\n- " + "\n- ".join(uninit_vars_report[:3])
        
        if test_results:
            grade_result['feedback'] += f"\n\n[Execution Test Results]: Passed {test_results['passed']}/{test_results['total']} tests."

        cur.execute("""UPDATE submissions SET file_path=%s, generated_code=%s, grading_result=%s, diagram_type=%s, complexity=%s, plagiarism_score=%s, static_analysis_report=%s, test_results=%s WHERE id=%s""", 
                   (submission_path, generated_code, json.dumps(grade_result), used_method, complexity_score, plagiarism_score, json.dumps(static_report), json.dumps(test_results) if test_results else None, submission_id))
        conn.commit()
        
        return jsonify({
            "generated_code": generated_code, "grading_result": grade_result, 
            "language": target_language, "complexity": complexity_score, 
            "plagiarism_score": plagiarism_score, "dead_code": dead_code_report, 
            "static_analysis": static_report,
            "test_results": test_results
        }), 200
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/seminar/<int:sid>/analytics', methods=['GET'])
def analytics(sid):
    user = get_current_user(); 
    if not user or user['role']!='teacher': return jsonify({"error": "Forbidden"}), 403
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database unavailable"}), 503
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT COUNT(*) as c FROM seminar_members WHERE seminar_id=%s", (sid,))
        sc = cur.fetchone()['c'] - 1
        cur.execute("SELECT COUNT(*) as c FROM assignments WHERE seminar_id=%s", (sid,))
        ac = cur.fetchone()['c']
        cur.execute("""SELECT a.title, AVG(CAST(s.grading_result->>'score' AS INT)) as avg_score FROM assignments a LEFT JOIN submissions s ON a.id=s.assignment_id WHERE a.seminar_id=%s GROUP BY a.id""", (sid,))
        perf = cur.fetchall()
        cur.execute("""SELECT CASE WHEN CAST(s.grading_result->>'score' AS INT) >= 90 THEN 'A' ELSE 'B-F' END as grade_range, COUNT(*) as count FROM submissions s JOIN assignments a ON s.assignment_id=a.id WHERE a.seminar_id=%s GROUP BY grade_range""", (sid,))
        dist = cur.fetchall()
        cur.execute("""SELECT u.username, AVG(CAST(s.grading_result->>'score' AS INT)) as avg_grade, COUNT(s.id) as submissions FROM users u JOIN seminar_members sm ON u.id=sm.user_id LEFT JOIN submissions s ON u.id=s.student_id JOIN assignments a ON s.assignment_id=a.id WHERE sm.seminar_id=%s AND u.role='student' GROUP BY u.id HAVING AVG(CAST(s.grading_result->>'score' AS INT)) < 70 LIMIT 5""", (sid,))
        risk = cur.fetchall()
        return jsonify({"student_count": sc, "assignment_count": ac, "assignment_performance": perf, "grade_distribution": dist, "at_risk_students": risk})
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/admin/stats', methods=['GET'])
def admin_stats():
    user = get_current_user()
    if not user or user['role'] != 'admin': return jsonify({"error": "Admin only"}), 403
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT COUNT(*) as count FROM users")
        uc = cur.fetchone()['count']
        cur.execute("SELECT COUNT(*) as count FROM seminars")
        sc = cur.fetchone()['count']
        cur.execute("SELECT COUNT(*) as count FROM submissions")
        subc = cur.fetchone()['count']
        return jsonify({"users": uc, "seminars": sc, "submissions": subc})
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/admin/users', methods=['GET'])
def admin_list_users():
    user = get_current_user()
    if not user or user['role'] != 'admin': return jsonify({"error": "Admin only"}), 403
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC")
        return jsonify(cur.fetchall())
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/admin/user/<int:user_id>', methods=['DELETE'])
def admin_delete_user(user_id):
    user = get_current_user()
    if not user or user['role'] != 'admin': return jsonify({"error": "Admin only"}), 403
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit(); return jsonify({"message": "User deleted"})
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/admin/seminars', methods=['GET'])
def admin_list_seminars():
    user = get_current_user()
    if not user or user['role'] != 'admin': return jsonify({"error": "Admin only"}), 403
    conn = get_db_connection(); cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute("""SELECT s.id, s.title, s.invite_code, s.created_at, u.username as creator FROM seminars s JOIN users u ON s.creator_id = u.id ORDER BY s.created_at DESC""")
        return jsonify(cur.fetchall())
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

@app.route('/admin/seminar/<int:seminar_id>', methods=['DELETE'])
def admin_delete_seminar(seminar_id):
    user = get_current_user()
    if not user or user['role'] != 'admin': return jsonify({"error": "Admin only"}), 403
    conn = get_db_connection(); cur = conn.cursor()
    try:
        cur.execute("DELETE FROM seminars WHERE id = %s", (seminar_id,))
        conn.commit(); return jsonify({"message": "Seminar deleted"})
    except Exception as e: conn.rollback(); return jsonify({"error": str(e)}), 500
    # CHANGED: release_db_connection
    finally: cur.close(); release_db_connection(conn)

# --- FRONTEND CATCH-ALL ROUTE ---
# Serves React Frontend for any route not matched by the API
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)