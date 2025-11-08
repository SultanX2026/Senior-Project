import requests
from core.config import Config

BASE = "https://finnhub.io/api/v1"


def _params(extra=None):
    p = {"token": Config.FINNHUB_API_KEY}
    if extra:
        p.update(extra)
    return p


def quote(symbol: str):
    r = requests.get(f"{BASE}/quote", params=_params({"symbol": symbol}))
    r.raise_for_status()
    return r.json()