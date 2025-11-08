# server/blueprints/news.py
from flask import Blueprint, request, jsonify
from services.newsapi import headlines_for_symbol

news_bp = Blueprint("news", __name__, url_prefix="/api")

@news_bp.get("/news")
def news():
    symbol = (request.args.get("symbol") or "").upper().strip()
    try:
        limit = int(request.args.get("limit") or 8)
    except Exception:
        limit = 8

    if not symbol:
        return jsonify({"ok": False, "error": "symbol required"}), 400

    try:
        items = headlines_for_symbol(symbol, page_size=limit)
        # Normalize for the client
        articles = [{
            "title": i.get("title") or "",
            "url": i.get("url") or "#",
            "image": i.get("urlToImage"),
            "source": i.get("source"),
            "publishedAt": i.get("publishedAt"),
            "description": i.get("description"),
        } for i in items]
        return jsonify({"ok": True, "articles": articles})
    except Exception as e:
        # fail-soft: no 500s to the UI
        return jsonify({"ok": True, "articles": [], "warning": str(e)}), 200
