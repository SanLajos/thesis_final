import pytest
import io
import json
from unittest.mock import patch, MagicMock
from backend.main import app
from backend.core.database import get_db_connection, release_db_connection

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def setup_assignment(client):
    """Sets up a Teacher, Seminar, and Assignment."""
    # 1. Clear DB
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
    conn.commit()
    cur.close()
    release_db_connection(conn)

    # 2. Create Teacher & Seminar
    client.post('/auth/register', json={"username": "teacher", "email": "t@t.com", "password": "pwd", "role": "teacher"})
    login_res = client.post('/auth/login', json={"identifier": "teacher", "password": "pwd"})
    headers = {"Authorization": f"Bearer {login_res.json['token']}"}
    
    sem_res = client.post('/seminar', json={"title": "CS101", "invite_code": "CS101"}, headers=headers)
    sem_id = sem_res.json['id']

    # 3. Create Assignment
    data = {
        "seminar_id": sem_id,
        "title": "Test Assignment",
        "language": "python",
        "grading_type": "ai"
    }
    # Mock file for template
    data['template_code'] = (io.BytesIO(b"print('hello')"), 'template.py')
    
    assign_res = client.post('/assignment', data=data, content_type='multipart/form-data', headers=headers)
    return assign_res.json['id'], headers

def test_submission_flow_with_mocked_ai(client, setup_assignment):
    """
    Test uploading a diagram, parsing it, and getting a (mocked) AI grade.
    """
    assignment_id, teacher_headers = setup_assignment
    
    # 1. Register Student & Join Seminar
    client.post('/auth/register', json={"username": "student", "email": "s@s.com", "password": "pwd", "role": "student"})
    login_res = client.post('/auth/login', json={"identifier": "student", "password": "pwd"})
    student_headers = {"Authorization": f"Bearer {login_res.json['token']}"}
    client.post('/seminar/join', json={"invite_code": "CS101"}, headers=student_headers)

    # 2. Mock External Services
    # We mock 'post_with_retries' which is used by ai_grader.py
    with patch('backend.services.grading.ai_grader.post_with_retries') as mock_post:
        
        # Configure the Mock to return a valid Gemini-like JSON response
        mock_response = MagicMock()
        ai_output = {
            "overall_score": 85,
            "feedback_summary": "Good logic, but missing edge cases.",
            "reasoning_trace": "Step 1: Analyzed loop...",
            "rubric_breakdown": {"logic_correctness": 90, "syntax_structure": 100, "efficiency": 80, "completeness": 70},
            "complexity_analysis": {"time_complexity": "O(n)", "space_complexity": "O(1)", "assessment": "Good"},
            "is_correct": True,
            "critical_issues": [],
            "improvement_suggestions": ["Check for null input"],
            "corrected_code_snippet": "print('Fixed')"
        }
        
        # Gemini wraps response in candidates[0].content.parts[0].text
        gemini_structure = {
            "candidates": [{
                "content": {
                    "parts": [{ "text": json.dumps(ai_output) }]
                }
            }]
        }
        mock_response.json.return_value = gemini_structure
        mock_post.return_value = mock_response

        # 3. Prepare Submission (Mock Image)
        # We use a dummy bytes object but name it .png so validation passes
        fake_image = (io.BytesIO(b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR"), 'diagram.png')
        
        submission_data = {
            "submission_mode": "image",
            "diagram_type": "flowchart",
            "description": "Calculates fibonacci sequence",
            "diagram_file": fake_image
        }

        # 4. Perform POST Request
        # Note: We also need to mock 'parse_image_diagram' since we aren't uploading a real flowchart
        # and we don't want the backend to actually try processing bytes with OpenCV
        with patch('backend.main.parse_image_diagram') as mock_parser:
            mock_parser.return_value = "print('Generated Code from Image')"
            
            res = client.post(f'/submit/{assignment_id}', data=submission_data, 
                             content_type='multipart/form-data', headers=student_headers)

    # 5. Assertions
    assert res.status_code == 200
    data = res.json
    
    # Verify Mocked Data made it through
    assert data['grading_result']['score'] == 85
    assert data['generated_code'] == "print('Generated Code from Image')"
    assert "Execution Test Results" not in data['grading_result']['feedback'] # No tests configured

    # 6. Verify Database Persistence
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT grading_result, generated_code FROM submissions WHERE assignment_id=%s", (assignment_id,))
    row = cur.fetchone()
    cur.close()
    release_db_connection(conn)

    assert row is not None
    assert row[1] == "print('Generated Code from Image')"
    assert row[0]['score'] == 85