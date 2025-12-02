import requests
from core.config import Config
import logging

logger = logging.getLogger(__name__)
BASE = "https://finnhub.io/api/v1"


def _params(extra=None):
    p = {"token": Config.FINNHUB_API_KEY}
    if extra:
        p.update(extra)
    return p


def quote(symbol: str):
    try:
        if not Config.FINNHUB_API_KEY:
            logger.error("FINNHUB_API_KEY is not set in environment variables")
            raise ValueError("FINNHUB_API_KEY not configured")
        
        logger.info(f"Fetching quote for {symbol} from Finnhub...")
        r = requests.get(f"{BASE}/quote", params=_params({"symbol": symbol}), timeout=10)
        r.raise_for_status()
        data = r.json()
        logger.info(f"Successfully fetched quote for {symbol}: {data}")
        return data
    except Exception as e:
        logger.error(f"Finnhub quote fetch failed for {symbol}: {e}")
        raise