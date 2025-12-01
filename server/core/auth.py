import os, jwt, re, random, time
from flask import request, jsonify
from passlib.hash import bcrypt

SECRET = os.environ.get("JWT_SECRET", "devsecret")

# ----------------- helpers -----------------



# ----------------- JWT -----------------

def make_token(uid: str, email: str, expires_in: int = None) -> str:
    """
    Create JWT token.
    expires_in: seconds until expiration (None = no expiration)
    """
    payload = {"sub": uid, "email": email, "iat": int(time.time())}
    if expires_in:
        payload["exp"] = int(time.time()) + expires_in
    return jwt.encode(payload, SECRET, algorithm="HS256")

# backward-compat alias for older imports
def make_jwt(uid: str, email: str) -> str:
    return make_token(uid, email)

def verify_token(token: str):
    return jwt.decode(token, SECRET, algorithms=["HS256"])

# ----------------- passwords -----------------

def hash_pw(pw: str) -> str:
    return bcrypt.hash(pw)

def verify_pw(pw: str, hashv: str) -> bool:
    return bcrypt.verify(pw, hashv)

# ----------------- auth guard -----------------

def require_auth(fn):
    from functools import wraps
    @wraps(fn)
    def _wrap(*args, **kwargs):
        auth = request.headers.get("Authorization","")
        if not auth.startswith("Bearer "):
            return jsonify({"error":"missing bearer"}), 401
        token = auth.split(" ",1)[1]
        try:
            payload = verify_token(token)
        except Exception:
            return jsonify({"error":"invalid token"}), 401
        request.user_id = payload["sub"]
        request.user_email = payload.get("email","")
        return fn(*args, **kwargs)
    return _wrap


