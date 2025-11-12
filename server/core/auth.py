import os, jwt, re, random
from flask import Blueprint, request, jsonify
from passlib.hash import bcrypt
from core.db import users
from core.utils import utcnow

SECRET = os.environ.get("JWT_SECRET", "devsecret")
auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

# ----------------- helpers -----------------

USERNAME_RE = re.compile(r"^[A-Za-z0-9_\-\.]{2,24}$")

PALETTE = [
    "#6E85B7", "#90CAF9", "#F28D35", "#6BD1FF", "#A3E635",
    "#F59E0B", "#34D399", "#C084FC", "#EF4444", "#14B8A6",
]

def _rand_color() -> str:
    return random.choice(PALETTE)

def _default_username(email: str) -> str:
    # First part of email, cleaned
    base = (email.split("@", 1)[0] or "user").strip()
    base = re.sub(r"[^A-Za-z0-9_\-\.]", "", base)[:24] or "user"
    return base

def _public_user(doc) -> dict:
    if not doc:
        return {}
    return {
        "id": str(doc["_id"]),
        "email": doc.get("email", ""),
        "username": doc.get("username") or _default_username(doc.get("email","")),
        "avatarColor": doc.get("avatarColor") or _rand_color(),
    }

# ----------------- JWT -----------------

def make_token(uid: str, email: str) -> str:
    payload = {"sub": uid, "email": email, "iat": int(utcnow().timestamp())}
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

# ----------------- endpoints -----------------

@auth_bp.post("/register")
def register():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error":"email and password required"}), 400
    if users.find_one({"email": email}):
        return jsonify({"error":"exists"}), 409

    doc = {
        "email": email,
        "password": hash_pw(password),
        "username": _default_username(email),
        "avatarColor": _rand_color(),
        "createdAt": utcnow(),
    }
    uid = users.insert_one(doc).inserted_id
    token = make_token(str(uid), email)
    return jsonify({"token": token, "user": _public_user({**doc, "_id": uid})})

@auth_bp.post("/login")
def login():
    data = request.get_json(force=True)
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    user = users.find_one({"email": email})
    if not user or not verify_pw(password, user.get("password","")):
        return jsonify({"error":"bad creds"}), 401
    token = make_token(str(user["_id"]), user["email"])
    return jsonify({"token": token, "user": _public_user(user)})

@auth_bp.get("/me")
@require_auth
def me():
    u = users.find_one({"_id": users.objectid(request.user_id)}) if hasattr(users, "objectid") else users.find_one({"_id": request.user_id})
    # If your core.db doesn't expose objectid helper, use bson import:
    # from bson import ObjectId; users.find_one({"_id": ObjectId(request.user_id)})
    if not u:
        # fallback from token only
        return jsonify({"id": request.user_id, "email": request.user_email, "username": _default_username(request.user_email), "avatarColor": _rand_color()})
    return jsonify(_public_user(u))

@auth_bp.patch("/profile")
@require_auth
def update_profile():
    data = request.get_json(force=True) or {}
    updates = {}

    # username
    if "username" in data:
        uname = (data.get("username") or "").strip()
        if not USERNAME_RE.match(uname):
            return jsonify({"error":"invalid username"}), 400
        # uniqueness check (case-insensitive)
        exists = users.find_one({"username": {"$regex": f"^{re.escape(uname)}$", "$options": "i"}, "_id": {"$ne": users.objectid(request.user_id)}})
        if exists:
            return jsonify({"error":"username taken"}), 409
        updates["username"] = uname

    # avatarColor
    if "avatarColor" in data:
        col = (data.get("avatarColor") or "").strip()
        if not re.match(r"^#([0-9A-Fa-f]{6})$", col):
            return jsonify({"error":"invalid color"}), 400
        updates["avatarColor"] = col

    if not updates:
        return jsonify({"error":"nothing to update"}), 400

    users.update_one({"_id": users.objectid(request.user_id)}, {"$set": updates})
    u = users.find_one({"_id": users.objectid(request.user_id)})
    return jsonify({"user": _public_user(u)})
