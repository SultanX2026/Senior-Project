# server/services/newsfeed.py
import os, datetime as dt, requests
from core.config import Config

FINNHUB_KEY = (os.getenv("FINNHUB_KEY") or "").strip()

def finnhub_company_news(symbol: str, limit: int = 8):
    if not FINNHUB_KEY:
        return []
    base = "https://finnhub.io/api/v1/company-news"
    to = dt.date.today()
    frm = to - dt.timedelta(days=14)  # 2 weeks window
    r = requests.get(base, params={
        "symbol": symbol,
        "from": frm.isoformat(),
        "to": to.isoformat(),
        "token": FINNHUB_KEY
    }, timeout=10)
    if r.status_code != 200:
        return []
    data = r.json() or []
    # Normalize to our Article shape
    out = []
    for a in data[:limit*2]:  # fetch extra, we may filter later
        out.append({
            "title": a.get("headline") or "",
            "url": a.get("url") or "#",
            "image": a.get("image"),
            "source": a.get("source"),
            "publishedAt": int(a["datetime"]) if a.get("datetime") else None,
            "description": a.get("summary"),
        })
    return out[:limit]
