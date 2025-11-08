from flask import Blueprint, request, jsonify
from bson import ObjectId
from core.db import users
from core.auth import hash_pw, verify_pw, make_token, require_auth
from core.utils import utcnow

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def _user_doc(u):
    return {"id": str(u["_id"]), "email": u["email"], "username": u.get("username")}

@auth_bp.post("/register")
def register():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    if users.find_one({"email": email}):
        return jsonify({"error": "exists"}), 409

    default_username = email.split("@")[0] if "@" in email else email
    uid = users.insert_one(
        {
            "email": email,
            "username": default_username,
            "password": hash_pw(password),
            "createdAt": utcnow(),
        }
    ).inserted_id

    token = make_token(str(uid), email)
    u = users.find_one({"_id": uid})
    return jsonify({"token": token, "user": _user_doc(u)}), 200

@auth_bp.post("/login")
def login():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    u = users.find_one({"email": email})
    if not u or not verify_pw(password, u.get("password", "")):
        return jsonify({"error": "bad creds"}), 401
    token = make_token(str(u["_id"]), u["email"])
    return jsonify({"token": token, "user": _user_doc(u)}), 200

@auth_bp.get("/me")
@require_auth
def me():
    u = users.find_one({"_id": ObjectId(request.user_id)})
    return jsonify(_user_doc(u)) if u else (jsonify({"error": "not found"}), 404)

@auth_bp.patch("/profile")
@require_auth
def update_profile():
    data = request.get_json(force=True) or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "username required"}), 400
    users.update_one({"_id": ObjectId(request.user_id)}, {"$set": {"username": username}})
    u = users.find_one({"_id": ObjectId(request.user_id)})
    return jsonify({"user": _user_doc(u)})
