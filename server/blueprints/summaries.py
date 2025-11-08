from flask import Blueprint, request, jsonify
from services.ollama_client import generate_with_ollama
from services.llm_fallback import generate_with_openai
from core.db import threads, comments

summaries_bp = Blueprint("summaries", __name__, url_prefix="/api/summaries")


def _collect_symbol_context(symbol: str, limit_threads=10, limit_comments=30):
    th = list(threads.find({"symbol": symbol}).sort("reliabilityScore", -1).limit(limit_threads))
    tids = [t.get("_id") for t in th]
    cm = list(comments.find({"threadId": {"$in": tids}}).sort("createdAt", -1).limit(limit_comments))
    def clean(t):
        return {
            "title": t.get("title"),
            "stance": t.get("stance"),
            "rs": float(t.get("reliabilityScore", 0.0)),
        }
    def clean_c(c):
        return {"body": c.get("body", "")[:200]}
    return [clean(x) for x in th], [clean_c(x) for x in cm]


@summaries_bp.get("/community/<symbol>")
def summarize_community(symbol):
    symbol = (symbol or "").upper().strip()
    th, cm = _collect_symbol_context(symbol)
    prompt = (
        "Summarize the community's current impression of {sym}. "
        "Use 3 concise bullet points: overall stance, key arguments (both sides), "
        "and risk/uncertainty. Be neutral; do NOT give financial advice.\n\n"
        f"Threads: {th}\nComments: {cm}"
    ).format(sym=symbol)
    txt = generate_with_ollama(prompt) or generate_with_openai(prompt) or "Summary unavailable."
    return jsonify({"symbol": symbol, "summary": txt, "threads_count": len(th)})