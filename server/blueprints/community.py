from flask import Blueprint, request, jsonify
from bson import ObjectId
from core.db import threads, comments, votes
from core.auth import require_auth
from core.utils import utcnow
from models.schemas import validate_thread, validate_comment

community_bp = Blueprint("community", __name__, url_prefix="/api/community")

def _oid(x): return ObjectId(x) if isinstance(x, str) else x

@community_bp.get("/threads")
def list_threads():
    symbol = (request.args.get("symbol") or "").upper().strip()
    q = {"symbol": symbol} if symbol else {}
    items = []
    for t in threads.find(q).sort("createdAt", -1).limit(50):
        t["_id"] = str(t["_id"])
        items.append(t)
    return jsonify({"threads": items})

@community_bp.post("/threads")
@require_auth
def create_thread():
    data = validate_thread(request.get_json(force=True))
    doc = {
        **data,
        "createdBy": request.user_id,
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
    if not tid: return jsonify({"error":"threadId required"}), 400
    items = []
    for c in comments.find({"threadId": _oid(tid)}).sort("createdAt", 1).limit(200):
        c["_id"] = str(c["_id"]); c["threadId"] = str(c["threadId"])
        items.append(c)
    return jsonify({"comments": items})

@community_bp.post("/comments")
@require_auth
def add_comment():
    data = validate_comment(request.get_json(force=True))
    doc = {
        **data,
        "threadId": _oid(data["threadId"]),
        "createdBy": request.user_id,
        "createdAt": utcnow(),
        "up": 0, "down": 0,
    }
    _id = comments.insert_one(doc).inserted_id
    doc["_id"] = str(_id); doc["threadId"] = str(doc["threadId"])
    return jsonify(doc)

@community_bp.post("/vote")
@require_auth
def vote():
    p = request.get_json(force=True)
    typ = p.get("type")
    entity_id = p.get("entityId")
    up = bool(p.get("up", True))
    if typ not in ("thread","comment"): return jsonify({"error":"type must be thread|comment"}), 400
    coll = threads if typ=="thread" else comments
    oid = _oid(entity_id)

    # fetch existing vote
    v = votes.find_one({"userId": request.user_id, "type": typ, "entityId": str(oid)})
    item = coll.find_one({"_id": oid}) or {}

    def apply_counts(delta_up, delta_down):
        coll.update_one({"_id": oid}, {"$inc": {"up": delta_up, "down": delta_down}})
    # toggle logic
    if v is None:
        votes.insert_one({"userId": request.user_id, "type": typ, "entityId": str(oid), "up": up, "createdAt": utcnow()})
        apply_counts(1 if up else 0, 0 if up else 1)
    else:
        if v["up"] == up:
            # undo
            votes.delete_one({"_id": v["_id"]})
            apply_counts(-1 if up else 0, 0 if up else -1)
        else:
            # flip
            votes.update_one({"_id": v["_id"]}, {"$set": {"up": up}})
            apply_counts(+1 if up else -1, -1 if up else +1)

    # recompute reliability for threads
    t = coll.find_one({"_id": oid})
    if typ == "thread" and t:
        upv, dnv = int(t.get("up",0)), int(t.get("down",0))
        rs = (upv - dnv) / max(1, (upv + dnv + 5))
        threads.update_one({"_id": oid}, {"$set": {"reliabilityScore": float(rs)}})
        t["reliabilityScore"] = rs
    if t:
        t["_id"] = str(t["_id"])
        if t.get("threadId"): t["threadId"] = str(t["threadId"])
    return jsonify(t or {"ok": True})

@community_bp.get("/sentiment")
def community_sentiment():
    symbol = (request.args.get("symbol") or "").upper().strip()
    if not symbol: return jsonify({"error":"symbol required"}), 400
    cur = list(threads.find({"symbol": symbol}))
    if not cur: return jsonify({"symbol": symbol, "score": 0.0, "method": "empty"})
    cur.sort(key=lambda x: x.get("reliabilityScore", 0.0), reverse=True)
    k = max(3, max(1, int(len(cur) * 0.1)))
    top = cur[:k]
    def v(s): return 1 if s=="buy" else (-1 if s=="sell" else 0)
    score = sum(v(t.get("stance","neutral")) for t in top) / max(1, len(top))
    return jsonify({"symbol": symbol, "score": float(score), "n": len(top), "method": "top10pct"})
