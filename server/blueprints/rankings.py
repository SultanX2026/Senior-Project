from flask import Blueprint, request, jsonify
from services import finnhub, newsapi, sentiment as sent
from services.ranking_model import compute_features, rank_with_explain
from core.db import threads

rank_bp = Blueprint("rankings", __name__, url_prefix="/api/rankings")


def _community_score(symbol: str):
    cur = list(threads.find({"symbol": symbol}))
    if not cur:
        return 0.0
    cur.sort(key=lambda x: x.get("reliabilityScore", 0.0), reverse=True)
    k = max(3, max(1, int(len(cur) * 0.1)))
    top = cur[:k]
    def val(s):
        return 1 if s == "buy" else (-1 if s == "sell" else 0)
    return sum(val(t.get("stance", "neutral")) for t in top) / max(1, len(top))


@rank_bp.get("/one")
def one():
    symbol = (request.args.get("symbol") or "").upper().strip()
    if not symbol:
        return jsonify({"error": "symbol required"}), 400
    q = finnhub.quote(symbol)
    headlines = newsapi.headlines_for_symbol(symbol, page_size=8)
    news_s = sent.headline_sentiment(headlines)
    comm_s = _community_score(symbol)
    features = compute_features(q, community_score=comm_s, news_sentiment=news_s)
    result = rank_with_explain(features)
    result.update({"symbol": symbol, "newsSentiment": news_s, "communityScore": comm_s})
    return jsonify(result)