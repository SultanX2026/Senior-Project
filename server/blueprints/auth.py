from flask import Blueprint, request, jsonify
from bson import ObjectId
from core.db import users
from core.auth import hash_pw, verify_pw, make_token, require_auth
from core.utils import utcnow

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

def _user_doc(u):
    if not u:
        return None
    username = u.get("username") or ""
    return {
        "id": str(u.get("_id", "")),
        "email": u.get("email", ""),
        "username": username,
        "displayName": u.get("displayName") or username or "",
        "avatarColor": u.get("avatarColor") or "#667eea"
    }

@auth_bp.post("/register")
def register():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    username = (data.get("username") or "").strip()
    security_question = (data.get("securityQuestion") or "").strip()
    security_answer = (data.get("securityAnswer") or "").strip().lower()
    
    # Validation
    if not email or not password:
        return jsonify({"error": "email and password required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if not username:
        return jsonify({"error": "username required"}), 400
    if len(username) < 2:
        return jsonify({"error": "username must be at least 2 characters"}), 400
    if len(username) > 24:
        return jsonify({"error": "username must be less than 24 characters"}), 400
    # Check username format
    if not all(c.isalnum() or c in "._-" for c in username):
        return jsonify({"error": "username can only contain letters, numbers, dots, dashes, and underscores"}), 400
    
    # Security question validation (optional during registration, but if provided must be valid)
    user_data = {
        "email": email,
        "username": username,
        "password": hash_pw(password),
        "createdAt": utcnow(),
    }
    
    if security_question or security_answer:
        # If either is provided, both must be valid
        if not security_question or security_question not in SECURITY_QUESTIONS:
            return jsonify({"error": "invalid security question"}), 400
        if not security_answer or len(security_answer) < 2:
            return jsonify({"error": "security answer too short"}), 400
        user_data["securityQuestion"] = security_question
        user_data["securityAnswer"] = hash_pw(security_answer)
    
    # Check email uniqueness
    if users.find_one({"email": email}):
        return jsonify({"error": "exists"}), 409
    
    # Check username uniqueness (case-insensitive)
    if users.find_one({"username": {"$regex": f"^{username}$", "$options": "i"}}):
        return jsonify({"error": "username already taken"}), 409

    uid = users.insert_one(user_data).inserted_id

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
    update_data = {}
    
    username = (data.get("username") or "").strip()
    if username:
        update_data["username"] = username
    
    display_name = (data.get("displayName") or "").strip()
    if display_name:
        update_data["displayName"] = display_name
    
    avatar_color = (data.get("avatarColor") or "").strip()
    if avatar_color:
        update_data["avatarColor"] = avatar_color
    
    if not update_data:
        return jsonify({"error": "no fields to update"}), 400
    
    users.update_one({"_id": ObjectId(request.user_id)}, {"$set": update_data})
    u = users.find_one({"_id": ObjectId(request.user_id)})
    return jsonify({"user": _user_doc(u)})

@auth_bp.patch("/me")
@require_auth
def update_me():
    """Alias for PATCH /profile - same functionality"""
    data = request.get_json(force=True) or {}
    update_data = {}
    
    username = (data.get("username") or "").strip()
    if username:
        update_data["username"] = username
    
    display_name = (data.get("displayName") or "").strip()
    if display_name:
        update_data["displayName"] = display_name
    
    avatar_color = (data.get("avatarColor") or "").strip()
    if avatar_color:
        update_data["avatarColor"] = avatar_color
    
    if not update_data:
        return jsonify({"error": "no fields to update"}), 400
    
    users.update_one({"_id": ObjectId(request.user_id)}, {"$set": update_data})
    u = users.find_one({"_id": ObjectId(request.user_id)})
    return jsonify({"user": _user_doc(u)})

# === Forgot Password Flow ===

SECURITY_QUESTIONS = [
    "What is your favorite color?",
    "What is the name of your first pet?",
    "What is your mother's maiden name?",
    "What city were you born in?",
    "What is your favorite movie?",
    "What is the name of your best friend?",
    "What is your favorite book?",
    "What is your dream vacation destination?",
]

@auth_bp.post("/forgot-password/setup")
@require_auth
def setup_security_question():
    """Set up a security question and answer for password recovery"""
    data = request.get_json(force=True) or {}
    question = (data.get("securityQuestion") or data.get("question") or "").strip()
    answer = (data.get("securityAnswer") or data.get("answer") or "").strip().lower()
    
    if question not in SECURITY_QUESTIONS:
        return jsonify({"error": "invalid security question"}), 400
    if not answer or len(answer) < 2:
        return jsonify({"error": "answer too short"}), 400
    
    users.update_one(
        {"_id": ObjectId(request.user_id)},
        {
            "$set": {
                "securityQuestion": question,
                "securityAnswer": hash_pw(answer),
                "updatedAt": utcnow(),
            }
        }
    )
    return jsonify({"success": True, "message": "Security question set"}), 200

@auth_bp.post("/forgot-password/verify")
def verify_security_question():
    """Verify identity via security question to get reset token"""
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    answer = (data.get("answer") or "").strip().lower()
    
    if not email or not answer:
        return jsonify({"error": "email and answer required"}), 400
    
    u = users.find_one({"email": email})
    if not u:
        # Don't reveal if email exists
        return jsonify({"error": "verification failed"}), 401
    
    if not u.get("securityAnswer"):
        return jsonify({"error": "security question not set up"}), 400
    
    if not verify_pw(answer, u.get("securityAnswer", "")):
        return jsonify({"error": "incorrect answer"}), 401
    
    # Generate temporary reset token (valid for 30 minutes)
    reset_token = make_token(str(u["_id"]), u["email"], expires_in=1800)
    return jsonify({"success": True, "resetToken": reset_token}), 200

@auth_bp.post("/forgot-password/reset")
def reset_password():
    """Reset password using reset token from verification"""
    data = request.get_json(force=True) or {}
    reset_token = (data.get("resetToken") or "").strip()
    new_password = data.get("newPassword") or ""
    
    if not reset_token or not new_password or len(new_password) < 6:
        return jsonify({"error": "invalid token or password too short"}), 400
    
    # Verify reset token
    from core.auth import verify_token
    try:
        payload = verify_token(reset_token)
        user_id = payload.get("sub")  # Token uses "sub" not "user_id"
    except Exception as e:
        print(f"Token verification failed: {e}")
        return jsonify({"error": "invalid or expired reset token"}), 401
    
    if not user_id:
        print(f"No user_id in token payload: {payload}")
        return jsonify({"error": "invalid reset token"}), 401
    
    # Update password
    print(f"Resetting password for user: {user_id}")
    result = users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": {"password": hash_pw(new_password), "updatedAt": utcnow()}}
    )
    print(f"Update result: modified={result.modified_count}, matched={result.matched_count}")
    
    if result.matched_count == 0:
        return jsonify({"error": "user not found"}), 404
    
    return jsonify({"success": True, "message": "Password reset successfully"}), 200

@auth_bp.get("/forgot-password/questions")
def get_security_questions():
    """Get list of available security questions"""
    return jsonify({"questions": SECURITY_QUESTIONS}), 200
