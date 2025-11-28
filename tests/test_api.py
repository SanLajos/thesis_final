import pytest
import json
from main_server import app
from db_utils import get_db_connection

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def auth_header(client):
    # Register a test user
    client.post('/auth/register', json={
        "username": "testuser",
        "email": "test@example.com",
        "password": "password123",
        "role": "student"
    })
    # Login to get token
    res = client.post('/auth/login', json={
        "identifier": "testuser",
        "password": "password123"
    })
    token = res.json['token']
    return {"Authorization": f"Bearer {token}"}

def test_root_route(client):
    """Ensure the server is running."""
    res = client.get('/')
    assert res.status_code == 200
    assert b"Backend server" in res.data

def test_register_duplicate_user(client):
    """Test registration logic enforces unique emails."""
    payload = {
        "username": "unique_user",
        "email": "unique@example.com",
        "password": "password123",
        "role": "student"
    }
    # First registration
    res1 = client.post('/auth/register', json=payload)
    assert res1.status_code == 201
    
    # Duplicate registration
    res2 = client.post('/auth/register', json=payload)
    assert res2.status_code == 409
    assert b"User exists" in res2.data

def test_login_invalid_credentials(client):
    """Test login security."""
    res = client.post('/auth/login', json={
        "identifier": "nonexistent",
        "password": "wrong"
    })
    assert res.status_code == 401

def test_protected_route_access(client, auth_header):
    """Test JWT middleware."""
    # Without token
    res_no_auth = client.get('/auth/me')
    assert res_no_auth.status_code == 401
    
    # With token
    res_auth = client.get('/auth/me', headers=auth_header)
    assert res_auth.status_code == 200
    assert res_auth.json['user']['username'] == "testuser"

def test_seminar_creation_permission(client, auth_header):
    """Test Role-Based Access Control (RBAC)."""
    # Student tries to create seminar (Should Fail)
    payload = {
        "title": "Hacking 101", 
        "invite_code": "HACK1", 
        "description": "Test"
    }
    res = client.post('/seminar', json=payload, headers=auth_header)
    assert res.status_code == 403 # Forbidden for students
    
    # Admin/Teacher test would go here