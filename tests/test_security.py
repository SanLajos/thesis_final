import pytest
from auth import hash_password, verify_password, generate_tokens, decode_token
import time

def test_password_hashing():
    """Ensure passwords are never stored in plain text."""
    pwd = "mySuperSecretPassword"
    hashed = hash_password(pwd)
    
    assert hashed != pwd
    assert "pbkdf2" in hashed or "scrypt" in hashed or "sha256" in hashed 

def test_password_verification():
    """Ensure hash verification works."""
    pwd = "password123"
    hashed = hash_password(pwd)
    
    assert verify_password(hashed, pwd) is True
    assert verify_password(hashed, "wrongpassword") is False

def test_jwt_token_generation():
    """Ensure tokens contain correct payload."""
    user_id = 1
    role = "teacher"
    username = "MrSmith"
    
    acc, ref = generate_tokens(user_id, role, username)
    
    assert acc is not None
    assert ref is not None
    
    decoded = decode_token(acc, verify_type='access')
    assert decoded['user_id'] == user_id
    assert decoded['role'] == role
    assert decoded['username'] == username

def test_token_expiration_logic():
    """
    Note: We can't easily wait for expiration in unit tests without mocking time,
    but we can check the 'exp' claim existence.
    """
    acc, _ = generate_tokens(1, "student", "user")
    decoded = decode_token(acc)
    
    assert 'exp' in decoded
    # Expiration should be in the future
    assert decoded['exp'] > time.time()