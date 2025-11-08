# server/services/newsapi.py  (or wherever it lives)
import requests
from urllib.parse import urlparse
from core.config import Config

BASE = "https://newsapi.org/v2/everything"

# Edit this to your taste. Keep it short so results stay focused.
DOMAIN_WHITELIST = {
    "finance.yahoo.com",
    "news.yahoo.com",
    "reuters.com",
    "marketwatch.com",
    "fool.com",            # Motley Fool
    "seekingalpha.com",
    "investorplace.com",
    "barrons.com",
    "cnbc.com",
}

def _host(u: str) -> str:
    try:
        return urlparse(u).netloc.replace("www.", "").lower()
    except Exception:
        return ""

def headlines_for_symbol(symbol: str, page_size: int = 10):
    """
    Simple fetch + post-filter by domain.
    No scoring / regex — just keep articles whose URL host is whitelisted.
    """
    params = {
        "q": symbol,
        "sortBy": "publishedAt",
        "pageSize": page_size * 3,   # get extra, we’ll filter down
        "language": "en",
        "apiKey": Config.NEWSAPI_KEY,
        # NewsAPI supports 'domains', but we still filter locally in case
        # some domains aren’t accepted or return none.
        "domains": ",".join(DOMAIN_WHITELIST),
    }
    r = requests.get(BASE, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()

    raw = data.get("articles", []) or []
    whitelisted = []
    for a in raw:
        url = a.get("url") or ""
        if _host(url) in DOMAIN_WHITELIST:
            whitelisted.append({
                "title": a.get("title"),
                "source": (a.get("source") or {}).get("name"),
                "url": url,
                "urlToImage": a.get("urlToImage"),
                "publishedAt": a.get("publishedAt"),
                "description": a.get("description"),
            })
    # Trim to requested size after filtering
    return whitelisted[:page_size]
