# server/blueprints/stocks.py
from flask import Blueprint, request, jsonify
import os, time, math, random, requests
from time import monotonic, sleep
from tenacity import retry, stop_after_attempt, wait_fixed, RetryError
from datetime import datetime, timedelta, timezone
try:
    from zoneinfo import ZoneInfo  # py3.9+
except Exception:
    ZoneInfo = None

# Import Yahoo Finance fallback
from services.yahoo_finance import (
    get_quote_yahoo,
    get_profile_yahoo,
    get_metrics_yahoo,
    get_candles_yahoo,
)

stocks_bp = Blueprint("stocks", __name__, url_prefix="/api/stocks")


# ---------- config ----------
FINNHUB_KEY = os.environ.get("FINNHUB_KEY", "").strip()
BASE = "https://finnhub.io/api/v1"
DEMO_MODE = os.getenv("DEMO_MODE", "0") not in ("0", "", "false", "False")

# cushion against 429 from provider
_FINN_MIN_GAP = float(os.getenv("FINN_MIN_GAP", "0.40"))  # seconds
_last_call = 0.0
def _throttle():
    global _last_call
    now = monotonic()
    gap = _FINN_MIN_GAP - (now - _last_call)
    if gap > 0:
        sleep(gap)
    _last_call = monotonic()


# --- NewsAPI integration ---
NEWSAPI_KEY = os.environ.get("NEWSAPI_KEY", "").strip()

# very small in-memory cache for news: key -> (expires_ts, payload)
_NEWS_CACHE = {}

def _news_cache_get(key):
    row = _NEWS_CACHE.get(key)
    if not row:
        return None
    exp, payload = row
    if exp > time.time():
        return payload
    _NEWS_CACHE.pop(key, None)
    return None

def _news_cache_set(key, payload, ttl=900):  # 15 minutes
    _NEWS_CACHE[key] = (time.time() + ttl, payload)


# ---------- small in-memory cache (valid_until) ----------
# key: (symbol, resolution, count) -> {"valid_until": ts, "payload": dict}
_CANDLE_CACHE: dict = {}

def _cache_get(key):
    row = _CANDLE_CACHE.get(key)
    if not row:
        return None
    if row.get("valid_until", 0) > time.time():
        return row["payload"]
    _CANDLE_CACHE.pop(key, None)
    return None

def _cache_set_until(key, payload, valid_until_ts: int):
    _CANDLE_CACHE[key] = {"valid_until": int(valid_until_ts), "payload": payload}

def _cache_set_ttl(key, payload, ttl_seconds: int):
    _cache_set_until(key, payload, int(time.time()) + int(ttl_seconds))

# ---------- utils ----------
def _key_ok() -> bool:
    return bool(FINNHUB_KEY)

def _err(status: int, msg: str):
    return jsonify({"ok": False, "error": msg}), status

def _demo_series(n=120, base=100.0):
    vals, v = [], float(base or 100)
    for i in range(n):
        v += math.sin(i/7.0)*0.6 + (random.random()-0.5)*0.8
        v = max(v, 1.0)
        vals.append(round(v, 2))
    return vals

@retry(stop=stop_after_attempt(2), wait=wait_fixed(0.3))
def _get(path, params):
    params = dict(params or {})
    params["token"] = FINNHUB_KEY
    _throttle()
    r = requests.get(f"{BASE}{path}", params=params, timeout=8)
    if r.status_code != 200:
        body = (r.text or "").strip()
        raise requests.HTTPError(f"{r.status_code} {body[:300]}", response=r, request=r.request)
    return r.json()

def _demo_candles(symbol: str, count: int, resolution: str):
    c = _demo_series(count, 100.0)
    t = list(range(len(c)))
    return {
        "ok": True, "symbol": symbol, "s": "ok",
        "t": t, "c": c, "o": [], "h": [], "l": [],
        "meta": {"source": "demo", "resolution": resolution, "from": 0, "to": len(t), "count": len(t)}
    }

# ---------- refresh policy (override with env if you want) ----------
# Intraday (60) short TTL; D/W/M cache until next close by default.
CANDLE_60_TTL = int(os.getenv("CANDLE_60_TTL", "1800"))   # 30 min
CANDLE_D_TTL  = int(os.getenv("CANDLE_D_TTL",  "0"))      # 0 => next close
CANDLE_W_TTL  = int(os.getenv("CANDLE_W_TTL",  "0"))
CANDLE_M_TTL  = int(os.getenv("CANDLE_M_TTL",  "0"))

def _next_nyse_close_ts(now_utc: datetime | None = None) -> int:
    """Return UNIX ts for next 4:00 PM America/New_York (with a 10-min buffer)."""
    if now_utc is None:
        now_utc = datetime.now(timezone.utc)
    if ZoneInfo is None:
        next_midnight = (now_utc + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return int(next_midnight.timestamp())

    ny = now_utc.astimezone(ZoneInfo("America/New_York"))
    close = ny.replace(hour=16, minute=0, second=0, microsecond=0)
    if ny >= close:
        close += timedelta(days=1)
    close = close + timedelta(minutes=10)
    return int(close.astimezone(timezone.utc).timestamp())

def _ttl_for(resolution: str) -> int | None:
    """Return TTL seconds for a resolution or None to use next-close logic."""
    if resolution == "60":
        return CANDLE_60_TTL
    if resolution == "D":
        return None if CANDLE_D_TTL == 0 else CANDLE_D_TTL
    if resolution == "W":
        return None if CANDLE_W_TTL == 0 else CANDLE_W_TTL
    if resolution == "M":
        return None if CANDLE_M_TTL == 0 else CANDLE_M_TTL
    return CANDLE_D_TTL or None

# ---------- Yahoo fallback (no key required) ----------
def _get_yahoo_candles(symbol: str, resolution: str, count: int):
    """
    Fetch candles from Yahoo Finance and map to our standard payload.
    """
    if resolution == "60":
        rng, interval = "5d", "60m"
    elif resolution == "W":
        rng, interval = "2y", "1wk"
    elif resolution == "M":
        rng, interval = "5y", "1mo"
    else:
        rng, interval = "6mo", "1d"

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "range": rng,
        "interval": interval,
        "includePrePost": "false",
        "events": "div,splits",
    }
    r = requests.get(url, params=params, timeout=10)
    if r.status_code != 200:
        raise requests.HTTPError(f"yahoo {r.status_code}: {r.text[:300]}")

    data = r.json()
    result = (data or {}).get("chart", {}).get("result", [])
    if not result:
        return {
            "ok": True, "symbol": symbol, "s": "no_data",
            "t": [], "c": [], "o": [], "h": [], "l": [],
            "meta": {"source": "yahoo", "resolution": resolution, "range": rng, "interval": interval, "count": 0}
        }

    res0 = result[0]
    ts = res0.get("timestamp") or []
    quote = (res0.get("indicators", {}).get("quote") or [{}])[0]
    c = quote.get("close") or []
    o = quote.get("open") or []
    h = quote.get("high") or []
    l = quote.get("low") or []

    n = min(len(ts), len(c), len(o), len(h), len(l))
    ts, c, o, h, l = ts[:n], c[:n], o[:n], h[:n], l[:n]

    if count and n > count:
        ts = ts[-count:]; c = c[-count:]; o = o[-count:]; h = h[-count:]; l = l[-count:]
        n = count

    return {
        "ok": True,
        "symbol": symbol,
        "s": "ok" if n else "no_data",
        "t": ts, "c": c, "o": o, "h": h, "l": l,
        "meta": {"source": "yahoo", "resolution": resolution, "range": rng, "interval": interval, "count": n},
    }

# ---------- QUOTE ----------
@stocks_bp.get("/quote")
def quote():
    symbol = (request.args.get("symbol") or "").upper()
    if not symbol:
        return _err(400, "symbol required")

    if not _key_ok() and DEMO_MODE:
        return jsonify({
            "ok": True, "c": 258.06, "d": 1.58, "dp": 0.616,
            "h": 258.52, "l": 256.11, "o": 256.52, "pc": 256.48, "t": int(time.time())
        })
    if not _key_ok():
        return _err(400, "FINNHUB_KEY missing")

    try:
        data = _get("/quote", {"symbol": symbol})
        return jsonify({"ok": True, **(data or {})})
    except (requests.HTTPError, requests.RequestException, RetryError) as e:
        # Fallback to Yahoo Finance
        try:
            data = get_quote_yahoo(symbol)
            if data:
                return jsonify(data)
        except Exception as yahoo_err:
            print(f"[FALLBACK] Yahoo Finance quote also failed: {yahoo_err}")
        
        if DEMO_MODE:
            return jsonify({
                "ok": True, "c": 258.06, "d": 1.58, "dp": 0.616,
                "h": 258.52, "l": 256.11, "o": 256.52, "pc": 256.48, "t": int(time.time())
            })
        code = getattr(getattr(e, "response", None), "status_code", 502) or 502
        return _err(code, f"finnhub: {e}")
    
# ---------- Yahoo ----------
    
def _get_yahoo_candles(symbol: str, resolution: str, count: int) -> dict:
    """
    Fetch candles from Yahoo Finance (no API key).
    Returns our standard payload shape.
    """
    # Choose a simple range/interval based on resolution
    if resolution == "60":
        rng, interval = "5d", "60m"
    elif resolution == "W":
        rng, interval = "2y", "1wk"
    elif resolution == "M":
        rng, interval = "5y", "1mo"
    else:
        rng, interval = "6mo", "1d"   # default to daily

    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
    params = {
        "range": rng,
        "interval": interval,
        "includePrePost": "false",
        "events": "div,splits",
    }
    r = requests.get(
        url,
        params=params,
        timeout=10,
        headers={"User-Agent": "Mozilla/5.0"}  # some proxies require UA
    )
    if r.status_code != 200:
        raise requests.HTTPError(f"yahoo {r.status_code}: {r.text[:200]}")

    data = r.json()
    result = (data or {}).get("chart", {}).get("result", [])
    if not result:
        return {
            "ok": True, "symbol": symbol, "s": "no_data",
            "t": [], "c": [], "o": [], "h": [], "l": [],
            "meta": {"source": "yahoo", "resolution": resolution,
                     "range": rng, "interval": interval, "count": 0}
        }

    res0 = result[0]
    ts = res0.get("timestamp") or []
    quote = (res0.get("indicators", {}).get("quote") or [{}])[0]
    c = quote.get("close") or []
    o = quote.get("open") or []
    h = quote.get("high") or []
    l = quote.get("low") or []

    n = min(len(ts), len(c), len(o), len(h), len(l))
    ts, c, o, h, l = ts[:n], c[:n], o[:n], h[:n], l[:n]

    if count and n > count:
        ts, c, o, h, l = ts[-count:], c[-count:], o[-count:], h[-count:], l[-count:]
        n = count

    return {
        "ok": True, "symbol": symbol, "s": "ok" if n else "no_data",
        "t": ts, "c": c, "o": o, "h": h, "l": l,
        "meta": {"source": "yahoo", "resolution": resolution,
                 "range": rng, "interval": interval, "count": n}
    }


# ---------- CANDLES ----------
@stocks_bp.get("/candles")
def candles():
    symbol = (request.args.get("symbol") or "").upper()
    if not symbol:
        return _err(400, "symbol required")

    resolution = (request.args.get("resolution") or "D").upper()
    try:
        count = int(request.args.get("count") or 90)
    except Exception:
        count = 90

    key = (symbol, resolution, count)
    cached = _cache_get(key)
    if cached:
        return jsonify(cached)

    # If no Finnhub key, we still want data: use Yahoo (or demo if DEMO_MODE)
    if not _key_ok():
        try:
            shaped = _get_yahoo_candles(symbol, resolution, count)
            ttl = _ttl_for(resolution)
            if ttl is None:
                _cache_set_until(key, shaped, _next_nyse_close_ts())
            else:
                _cache_set_ttl(key, shaped, ttl)
            return jsonify(shaped)
        except Exception as e:
            if DEMO_MODE:
                shaped = _demo_candles(symbol, count, resolution)
                ttl = _ttl_for(resolution)
                if ttl is None:
                    _cache_set_until(key, shaped, _next_nyse_close_ts())
                else:
                    _cache_set_ttl(key, shaped, ttl)
                return jsonify(shaped)
            return _err(502, f"candles: {e}")

    # Try Finnhub first
    now = int(time.time())
    span = {"D": 86400, "W": 604800, "M": 2592000, "60": 60}.get(resolution, 86400)
    _from = now - span * count

    try:
        raw = _get("/stock/candle", {
            "symbol": symbol, "resolution": resolution, "from": _from, "to": now
        })
        if raw.get("s") == "ok":
            shaped = {
                "ok": True, "symbol": symbol, "s": "ok",
                "t": raw.get("t", []), "c": raw.get("c", []),
                "o": raw.get("o", []), "h": raw.get("h", []), "l": raw.get("l", []),
                "meta": {"source": "finnhub", "resolution": resolution,
                         "from": _from, "to": now, "count": len(raw.get("t", []))}
            }
        else:
            raise RuntimeError(f"finnhub returned s={raw.get('s')}")
    except Exception as finnhub_err:
        # Finnhub failed or no data -> fallback to Yahoo
        try:
            shaped = _get_yahoo_candles(symbol, resolution, count)
        except Exception as yahoo_err:
            if DEMO_MODE:
                shaped = _demo_candles(symbol, count, resolution)
            else:
                return _err(502, f"finnhub: {finnhub_err} | yahoo: {yahoo_err}")

    # Cache according to policy and return
    ttl = _ttl_for(resolution)
    if ttl is None:
        _cache_set_until(key, shaped, _next_nyse_close_ts())
    else:
        _cache_set_ttl(key, shaped, ttl)

    return jsonify(shaped)

def _company_terms_for_news(symbol: str) -> str:
    """
    Build a search query string for NewsAPI.
    We try to include the company name (from profile if we can),
    otherwise fall back to the symbol alone.
    """
    name = None
    try:
        if _key_ok():
            prof = _get("/stock/profile2", {"symbol": symbol})
            name = (prof or {}).get("name")
    except Exception:
        name = None

    if name:
        # Favor company name but include ticker to keep it on-topic
        # Keep it simple to avoid NewsAPI max query length issues.
        return f"\"{name}\" OR {symbol}"
    return symbol



# ---------- PROFILE ----------
@stocks_bp.get("/profile")
def profile():
    symbol = (request.args.get("symbol") or "").upper()
    if not symbol:
        return _err(400, "symbol required")

    if not _key_ok() and DEMO_MODE:
        return jsonify({"ok": True, "ticker": symbol or "AAPL", "name": "Demo Inc", "exchange": "DEMO", "currency": "USD"})
    if not _key_ok():
        return _err(400, "FINNHUB_KEY missing")

    try:
        data = _get("/stock/profile2", {"symbol": symbol})
        return jsonify({"ok": True, **(data or {})})
    except (requests.HTTPError, requests.RequestException, RetryError) as e:
        # Fallback to Yahoo Finance
        try:
            data = get_profile_yahoo(symbol)
            if data:
                return jsonify(data)
        except Exception as yahoo_err:
            print(f"[FALLBACK] Yahoo Finance profile also failed: {yahoo_err}")
        
        if DEMO_MODE:
            return jsonify({"ok": True, "ticker": symbol, "name": "Demo Inc", "exchange": "DEMO", "currency": "USD"})
        code = getattr(getattr(e, "response", None), "status_code", 502) or 502
        return _err(code, f"finnhub: {e}")

# ---------- METRICS ----------
@stocks_bp.get("/metrics")
def metrics():
    symbol = (request.args.get("symbol") or "").upper()
    if not symbol:
        return _err(400, "symbol required")

    if not _key_ok() and DEMO_MODE:
        return jsonify({"ok": True, "metric": {"marketCapitalization": 0.0, "peBasicExclExtraTTM": 38.5}})
    if not _key_ok():
        return _err(400, "FINNHUB_KEY missing")

    try:
        data = _get("/stock/metric", {"symbol": symbol, "metric": "all"})
        return jsonify({"ok": True, **(data or {})})
    except (requests.HTTPError, requests.RequestException, RetryError) as e:
        # Fallback to Yahoo Finance
        try:
            data = get_metrics_yahoo(symbol)
            if data:
                return jsonify(data)
        except Exception as yahoo_err:
            print(f"[FALLBACK] Yahoo Finance metrics also failed: {yahoo_err}")
        
        if DEMO_MODE:
            return jsonify({"ok": True, "metric": {"marketCapitalization": 0.0, "peBasicExclExtraTTM": 38.5}})
        code = getattr(getattr(e, "response", None), "status_code", 502) or 502
        return _err(code, f"finnhub: {e}")


@stocks_bp.get("/news")
def stock_news():
    """
    Return latest news articles for a symbol using NewsAPI.org.
    Response:
      { ok: true, articles: [{title, url, source, publishedAt, image, description}] }
    """
    symbol = (request.args.get("symbol") or "").upper()
    if not symbol:
        return _err(400, "symbol required")

    try:
        limit = max(1, min(int(request.args.get("limit", 8)), 30))
    except Exception:
        limit = 8

    # Serve from cache if available
    key = (symbol, limit)
    cached = _news_cache_get(key)
    if cached:
        return jsonify(cached)

    if not NEWSAPI_KEY:
        # No key: don't 500 the page, just return empty
        payload = {"ok": True, "articles": []}
        _news_cache_set(key, payload, ttl=300)
        return jsonify(payload)

    # Build a tight query to reduce irrelevant items
    query = _company_terms_for_news(symbol)
    # last 14 days max, in ISO
    to_date = datetime.now(timezone.utc)
    from_date = to_date - timedelta(days=14)

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": limit,
        "from": from_date.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "to": to_date.isoformat(timespec="seconds").replace("+00:00", "Z"),
        "apiKey": NEWSAPI_KEY,
    }

    try:
        r = requests.get(url, params=params, timeout=10)
        if r.status_code != 200:
            raise requests.HTTPError(f"{r.status_code} {r.text[:300]}")
        data = r.json() or {}
        raw = data.get("articles") or []

        articles = []
        for a in raw:
            # Normalize fields; fallback gracefully if keys are missing
            title = a.get("title") or ""
            url_ = a.get("url") or ""
            src = ((a.get("source") or {}).get("name") or "").strip()
            published = a.get("publishedAt") or ""
            # Convert ISO date to epoch seconds for easy rendering client-side
            try:
                dt = datetime.fromisoformat(published.replace("Z", "+00:00"))
                ts = int(dt.timestamp())
            except Exception:
                ts = int(time.time())
            image = a.get("urlToImage") or ""
            desc = (a.get("description") or a.get("content") or "").strip()

            if title and url_:
                articles.append({
                    "title": title,
                    "url": url_,
                    "source": src,
                    "publishedAt": ts,
                    "image": image,
                    "description": desc,
                })

        payload = {"ok": True, "articles": articles}
        _news_cache_set(key, payload, ttl=900)
        return jsonify(payload)

    except Exception as e:
        # Soft-fail: empty list keeps UI usable
        payload = {"ok": True, "articles": []}
        _news_cache_set(key, payload, ttl=300)
        return jsonify(payload)

# ---------- LOOKUP (search by company name or symbol) ----------
@stocks_bp.get("/lookup")
def lookup():
    q = (request.args.get("q") or "").strip()
    if not q:
        return _err(400, "q required")

    # Demo without key
    if not _key_ok() and DEMO_MODE:
        demo = [
            {"symbol": "AAPL", "description": "Apple Inc."},
            {"symbol": "MSFT", "description": "Microsoft Corporation"},
            {"symbol": "NVDA", "description": "NVIDIA Corporation"},
            {"symbol": "GOOGL", "description": "Alphabet Inc Class A"},
            {"symbol": "AMZN", "description": "Amazon.com Inc."},
            {"symbol": "META", "description": "Meta Platforms Inc."},
            {"symbol": "TSLA", "description": "Tesla Inc."},
            {"symbol": "NFLX", "description": "Netflix Inc."},
        ]
        ql = q.lower()
        res = [r for r in demo if ql in r["symbol"].lower() or ql in r["description"].lower()]
        return jsonify({"ok": True, "result": res or demo[:5]})

    if not _key_ok():
        return _err(400, "FINNHUB_KEY missing")

    try:
        data = _get("/search", {"q": q})  # finnhub returns {count, result: [...]}
        return jsonify({"ok": True, "result": data.get("result", [])})
    except (requests.HTTPError, requests.RequestException, RetryError) as e:
        code = getattr(getattr(e, "response", None), "status_code", 502) or 502
        return _err(code, f"finnhub: {e}")


# ---------- HEALTH ----------
@stocks_bp.get("/health")
def health():
    return jsonify({"ok": True})
