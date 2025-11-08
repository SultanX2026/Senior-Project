import os, jwt
from flask import Blueprint, request, jsonify
from passlib.hash import bcrypt
from core.db import users
from core.utils import utcnow

SECRET = os.environ.get("JWT_SECRET", "devsecret")
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# ----- tokens -----
def make_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "iat": int(utcnow().timestamp())}
    return jwt.encode(payload, SECRET, algorithm="HS256")

# backward-compat alias for older imports
def make_jwt(uid: str, email: str) -> str:
    return make_token(uid, email)

def verify_token(token: str):
    return jwt.decode(token, SECRET, algorithms=["HS256"])

# ----- passwords -----
def hash_pw(pw: str) -> str:
    return bcrypt.hash(pw)

def verify_pw(pw: str, hashv: str) -> bool:
    return bcrypt.verify(pw, hashv)

# ----- decorator -----
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

# ----- endpoints (kept simple) -----
@auth_bp.post("/register")
def register():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error":"email and password required"}), 400
    if users.find_one({"email": email}):
        return jsonify({"error":"exists"}), 409
    uid = users.insert_one({"email": email, "password": hash_pw(password), "createdAt": utcnow()}).inserted_id
    token = make_token(str(uid), email)
    return jsonify({"token": token, "user": {"id": str(uid), "email": email}})

@auth_bp.post("/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = users.find_one({"email": email})
    if not user or not verify_pw(password, user.get("password","")):
        return jsonify({"error":"bad creds"}), 401
    token = make_token(str(user["_id"]), user["email"])
    return jsonify({"token": token, "user": {"id": str(user["_id"]), "email": user["email"]}})

@auth_bp.get("/me")
@require_auth
def me():
    # Echo identity from token
    return jsonify({"id": request.user_id, "email": request.user_email})
