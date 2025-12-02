import requests
from urllib.parse import urlparse
from core.config import Config
from datetime import datetime

NEWSAPI_BASE = "https://newsapi.org/v2/everything"
FINNHUB_BASE = "https://finnhub.io/api/v1"

# Financial news sources - more reliable for market news
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
    "bloomberg.com",
    "wsj.com",
    "ft.com",
    "investor.vanguard.com",
    "morningstar.com",
}

def _host(u: str) -> str:
    try:
        return urlparse(u).netloc.replace("www.", "").lower()
    except Exception:
        return ""

def headlines_for_symbol(symbol: str, page_size: int = 10):
    """
    Get accurate market news for a stock symbol.
    Tries Finnhub first (more accurate for company-specific news), 
    falls back to NewsAPI with domain filtering.
    """
    return headlines_for_symbol_finnhub(symbol, page_size)

def headlines_for_symbol_finnhub(symbol: str, page_size: int = 10):
    """
    Fetch company news from Finnhub - more accurate for specific stock symbols.
    Finnhub returns news directly related to the company, not just keyword matches.
    """
    try:
        params = {
            "symbol": symbol,
            "token": Config.FINNHUB_API_KEY,
        }
        r = requests.get(f"{FINNHUB_BASE}/company-news", params=params, timeout=10)
        r.raise_for_status()
        articles = r.json()
        
        # Finnhub news format is different - map it to our standard format
        result = []
        for a in articles[:page_size]:
            result.append({
                "title": a.get("headline", ""),
                "source": a.get("source", "Finnhub"),
                "url": a.get("url", "#"),
                "urlToImage": a.get("image"),
                "publishedAt": datetime.fromtimestamp(a.get("datetime", 0)).isoformat() if a.get("datetime") else None,
                "description": a.get("summary", ""),
            })
        return result
    except Exception as e:
        print(f"Finnhub news fetch failed: {e}")
        # Fallback to NewsAPI
        return headlines_for_symbol_newsapi(symbol, page_size)

def headlines_for_symbol_newsapi(symbol: str, page_size: int = 10):
    """
    Fallback: Fetch from NewsAPI with domain filtering for quality financial news.
    Prioritizes articles with symbol in title/description, then fills with general domain-whitelisted articles.
    """
    try:
        params = {
            "q": symbol,
            "sortBy": "publishedAt",
            "pageSize": page_size * 5,   # get extra, we'll filter down
            "language": "en",
            "apiKey": Config.NEWSAPI_KEY,
            "domains": ",".join(DOMAIN_WHITELIST),
        }
        r = requests.get(NEWSAPI_BASE, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()

        raw = data.get("articles", []) or []
        symbol_matched = []  # Articles with symbol in title/description
        domain_matched = []  # Articles from whitelisted domains only
        symbol_lower = symbol.lower()
        
        for a in raw:
            url = a.get("url") or ""
            title = a.get("title") or ""
            description = a.get("description") or ""
            
            # Check if URL is from whitelisted domain
            if _host(url) not in DOMAIN_WHITELIST:
                continue
            
            article = {
                "title": title,
                "source": (a.get("source") or {}).get("name"),
                "url": url,
                "urlToImage": a.get("urlToImage"),
                "publishedAt": a.get("publishedAt"),
                "description": description,
            }
            
            # Check if symbol appears in title or description
            if symbol_lower in title.lower() or symbol_lower in description.lower():
                symbol_matched.append(article)
            else:
                domain_matched.append(article)
        
        # Combine: prioritize symbol-matched articles, then fill with domain-matched
        result = symbol_matched + domain_matched
        return result[:page_size]
    except Exception as e:
        print(f"NewsAPI fetch failed: {e}")
        return []
