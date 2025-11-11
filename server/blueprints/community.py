from flask import Blueprint, request, jsonify
from bson import ObjectId
from core.db import threads, comments, votes, users
from core.auth import require_auth
from core.utils import utcnow
from models.schemas import validate_thread, validate_comment

community_bp = Blueprint("community", __name__, url_prefix="/api/community")

def _oid(x): 
    return ObjectId(x) if isinstance(x, str) else x

def _author_doc(uid: str):
    """Fetch minimal public user fields for denormalization."""
    u = users.find_one({"_id": _oid(uid)}, {"username": 1, "email": 1, "avatarColor": 1})
    if not u:
        # fallback if user missing; derive username from email
        email = ""
        uname = ""
        if u and u.get("email"):
            email = u["email"]
        if email:
            uname = (email.split("@",1)[0] or "user")[:24]
        return {"id": uid, "username": uname or "user", "avatarColor": "#6E85B7"}
    uname = u.get("username")
    if not uname:
        email = u.get("email","")
        uname = (email.split("@",1)[0] or "user")[:24]
    color = u.get("avatarColor") or "#6E85B7"
    return {"id": str(u["_id"]), "username": uname, "avatarColor": color}

def _public_thread(t):
    t = dict(t)
    t["_id"] = str(t["_id"])
    t["createdAt"] = t.get("createdAt")
    if "threadId" in t and isinstance(t["threadId"], ObjectId):
        t["threadId"] = str(t["threadId"])
    # normalize author
    a = t.get("author")
    if not a and t.get("createdBy"):
        t["author"] = _author_doc(t["createdBy"])
    return t

def _public_comment(c):
    c = dict(c)
    c["_id"] = str(c["_id"])
    if isinstance(c.get("threadId"), ObjectId):
        c["threadId"] = str(c["threadId"])
    if c.get("parentId") and isinstance(c["parentId"], ObjectId):
        c["parentId"] = str(c["parentId"])
    # normalize author
    a = c.get("author")
    if not a and c.get("createdBy"):
        c["author"] = _author_doc(c["createdBy"])
    return c

@community_bp.get("/threads")
def list_threads():
    symbol = (request.args.get("symbol") or "").upper().strip()
    q = {"symbol": symbol} if symbol else {}
    items = []
    for t in threads.find(q).sort("createdAt", -1).limit(50):
        items.append(_public_thread(t))
    return jsonify({"threads": items})

@community_bp.post("/threads")
@require_auth
def create_thread():
    data = validate_thread(request.get_json(force=True))
    author = _author_doc(request.user_id)
    doc = {
        **data,
        "createdBy": request.user_id,
        "author": author,  # denormalized snapshot
        "createdAt": utcnow(),
        "up": 0, "down": 0,
        "reliabilityScore": 0.0,
    }
    _id = threads.insert_one(doc).inserted_id
    doc["_id"] = str(_id)
    return jsonify(doc)

@community_bp.get("/comments")
def list_comments():
    tid = request.args.get("threadId")
    if not tid: 
        return jsonify({"error":"threadId required"}), 400
    items = []
    for c in comments.find({"threadId": _oid(tid)}).sort("createdAt", 1).limit(500):
        items.append(_public_comment(c))
    return jsonify({"comments": items})

@community_bp.post("/comments")
@require_auth
def add_comment():
    data = validate_comment(request.get_json(force=True))
    parent_id = data.get("parentId")
    author = _author_doc(request.user_id)
    doc = {
        "threadId": _oid(data["threadId"]),
        "parentId": _oid(parent_id) if parent_id else None,
        "body": data["body"],
        "createdBy": request.user_id,
        "author": author,  # denormalized snapshot
        "createdAt": utcnow(),
        "up": 0, "down": 0,
    }
    _id = comments.insert_one(doc).inserted_id
    doc["_id"] = str(_id)
    doc["threadId"] = str(doc["threadId"])
    if doc["parentId"]:
        doc["parentId"] = str(doc["parentId"])
    return jsonify(doc)

@community_bp.post("/vote")
@require_auth
def vote():
    p = request.get_json(force=True)
    typ = p.get("type")
    entity_id = p.get("entityId")
    up = bool(p.get("up", True))
    if typ not in ("thread","comment"): 
        return jsonify({"error":"type must be thread|comment"}), 400
    coll = threads if typ=="thread" else comments
    oid = _oid(entity_id)

    # existing vote?
    v = votes.find_one({"userId": request.user_id, "type": typ, "entityId": str(oid)})
    def apply_counts(delta_up, delta_down):
        coll.update_one({"_id": oid}, {"$inc": {"up": delta_up, "down": delta_down}})

    if v is None:
        votes.insert_one({"userId": request.user_id, "type": typ, "entityId": str(oid), "up": up, "createdAt": utcnow()})
        apply_counts(1 if up else 0, 0 if up else 1)
    else:
        if v["up"] == up:
            votes.delete_one({"_id": v["_id"]})
            apply_counts(-1 if up else 0, 0 if up else -1)
        else:
            votes.update_one({"_id": v["_id"]}, {"$set": {"up": up}})
            apply_counts(+1 if up else -1, -1 if up else +1)

    # recompute reliability ONLY for threads (comments do not affect stock rating)
    if typ == "thread":
        t = coll.find_one({"_id": oid}) or {}
        upv, dnv = int(t.get("up",0)), int(t.get("down",0))
        rs = (upv - dnv) / max(1, (upv + dnv + 5))
        threads.update_one({"_id": oid}, {"$set": {"reliabilityScore": float(rs)}})

    item = coll.find_one({"_id": oid}) or {}
    # normalize for response
    if typ == "thread":
        return jsonify(_public_thread(item))
    else:
        return jsonify(_public_comment(item))

@community_bp.get("/sentiment")
def community_sentiment():
    symbol = (request.args.get("symbol") or "").upper().strip()
    if not symbol: 
        return jsonify({"error":"symbol required"}), 400
    cur = list(threads.find({"symbol": symbol}))
    if not cur: 
        return jsonify({"symbol": symbol, "score": 0.0, "method": "empty"})
    cur.sort(key=lambda x: x.get("reliabilityScore", 0.0), reverse=True)
    k = max(3, max(1, int(len(cur) * 0.1)))
    top = cur[:k]
    def v(s): return 1 if s=="buy" else (-1 if s=="sell" else 0)
    score = sum(v(t.get("stance","neutral")) for t in top) / max(1, len(top))
    return jsonify({"symbol": symbol, "score": float(score), "n": len(top), "method": "top10pct"})
