# Placeholder sentiment: neutral 0.0. You can wire VADER/TextBlob later.
# Expected return is in range [-1.0, 1.0].

def headline_sentiment(headlines):
    # naive: +0.1 if title contains "beat"; -0.1 if contains "miss"
    score = 0.0
    for h in headlines:
        t = (h.get("title") or "").lower()
        if "beat" in t:
            score += 0.1
        if "miss" in t:
            score -= 0.1
    return max(-1.0, min(1.0, score))