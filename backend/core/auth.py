import jwt
import datetime
import os
from werkzeug.security import generate_password_hash, check_password_hash

# In production, this should be loaded from os.environ
SECRET_KEY = os.environ.get("SECRET_KEY", "thesis_super_secret_key_change_this")

def hash_password(password):
    """Encrypts a plaintext password."""
    return generate_password_hash(password)

def verify_password(stored_hash, provided_password):
    """Checks if the password matches the hash."""
    return check_password_hash(stored_hash, provided_password)

def generate_tokens(user_id, role, username):
    """Generates Access and Refresh tokens."""
    access_payload = {
        'user_id': user_id,
        'role': role,
        'username': username,
        'type': 'access',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=2)
    }
    access_token = jwt.encode(access_payload, SECRET_KEY, algorithm='HS256')

    refresh_payload = {
        'user_id': user_id,
        'role': role,
        'type': 'refresh',
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    refresh_token = jwt.encode(refresh_payload, SECRET_KEY, algorithm='HS256')

    return access_token, refresh_token

def decode_token(token, verify_type=None):
    """Decodes a JWT token."""
    try:
        if token.startswith("Bearer "):
            token = token.split(" ")[1]
        
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        
        if verify_type and payload.get('type') != verify_type:
            return None
            
        return payload
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None