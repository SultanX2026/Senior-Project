# Community-first: include community stance signal.
# Inputs: quote (Finnhub), community_score (-1..1), news_sentiment (-1..1)

def compute_features(quote, community_score: float, news_sentiment: float):
    f = {}
    # Finnhub quote: dp = percent change
    f["price_change"] = max(-1.0, min(1.0, (quote.get("dp", 0.0) or 0.0) / 10.0))
    f["community"] = max(-1.0, min(1.0, community_score))
    f["news"] = max(-1.0, min(1.0, news_sentiment))
    return f


def weighted_score(features):
    # Tilt weight toward community as requested
    weights = {"community": 0.5, "news": 0.3, "price_change": 0.2}
    score = sum(features[k] * w for k, w in weights.items())
    return score, weights


def to_label(score):
    if score >= 0.70:
        return "Strong Buy"
    if score >= 0.45:
        return "Buy"
    if score >= 0.30:
        return "Hold"
    return "Avoid"


def rank_with_explain(features):
    score, weights = weighted_score(features)
    contributions = {k: round(features[k] * w, 4) for k, w in weights.items()}
    return {
        "score": round(score, 4),
        "label": to_label(score),
        "features": features,
        "contributions": contributions,
    }