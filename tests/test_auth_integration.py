import pytest
from backend.main import app
from backend.core.database import get_db_connection, release_db_connection

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def clean_db():
    """Cleanup database before/after tests."""
    conn = get_db_connection()
    cur = conn.cursor()
    # Cascading delete clears dependent tables (submissions, assignments, etc.)
    cur.execute("TRUNCATE TABLE users RESTART IDENTITY CASCADE;")
    conn.commit()
    cur.close()
    release_db_connection(conn)
    yield
    # Optional: cleanup after

def get_auth_header(client, username, role="student"):
    """Helper to register, login, and return headers."""
    email = f"{username}@test.com"
    client.post('/auth/register', json={
        "username": username, "email": email, "password": "password123", "role": role
    })
    res = client.post('/auth/login', json={"identifier": username, "password": "password123"})
    return {"Authorization": f"Bearer {res.json['token']}"}

def test_full_seminar_lifecycle(client, clean_db):
    """
    Integration Scenario:
    1. Teacher registers and creates a seminar.
    2. Student registers and tries to join.
    3. Verify database relationships.
    """
    # 1. Teacher Actions
    teacher_headers = get_auth_header(client, "profsnape", "teacher")
    
    sem_payload = {
        "title": "Defense Against the Dark Arts",
        "invite_code": "EXPELLIARMUS"
    }
    res_create = client.post('/seminar', json=sem_payload, headers=teacher_headers)
    assert res_create.status_code == 201
    seminar_id = res_create.json['id']

    # 2. Student Actions
    student_headers = get_auth_header(client, "harry", "student")
    
    # Try joining with wrong code
    res_fail = client.post('/seminar/join', json={"invite_code": "AVADAKEDAVRA"}, headers=student_headers)
    assert res_fail.status_code == 404

    # Join with correct code
    res_join = client.post('/seminar/join', json={"invite_code": "EXPELLIARMUS"}, headers=student_headers)
    assert res_join.status_code == 200

    # 3. Verify Database State
    conn = get_db_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM seminar_members WHERE seminar_id = %s", (seminar_id,))
    members = cur.fetchall()
    cur.close()
    release_db_connection(conn)
    
    # Should have 2 members (Teacher + Student)
    assert len(members) == 2

def test_rbac_security(client, clean_db):
    """Test Role-Based Access Control (RBAC)."""
    student_headers = get_auth_header(client, "ron", "student")
    
    # Student tries to create a seminar (Should fail)
    res = client.post('/seminar', json={"title": "Chess", "invite_code": "CHECKMATE"}, headers=student_headers)
    assert res.status_code == 403
    assert "Teachers only" in res.json['error']