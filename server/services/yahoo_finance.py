"""
Yahoo Finance API - Fallback for Finnhub
No API key required, free and reliable alternative for stock data
"""
import requests
from datetime import datetime, timedelta
import time

YAHOO_BASE = "https://query1.finance.yahoo.com/v10/finance"


def get_quote_yahoo(symbol: str):
    """
    Get current stock quote from Yahoo Finance
    Returns format compatible with Finnhub response
    """
    try:
        symbol = symbol.upper()
        url = f"{YAHOO_BASE}/quoteSummary/{symbol}"
        params = {
            "modules": "price"
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code != 200:
            return None
        
        data = response.json()
        if "quoteSummary" not in data or not data["quoteSummary"].get("result"):
            return None
        
        price_data = data["quoteSummary"]["result"][0].get("price", {})
        
        # Map Yahoo data to Finnhub format
        current_price = price_data.get("regularMarketPrice", {}).get("raw", 0)
        prev_close = price_data.get("regularMarketPreviousClose", {}).get("raw", 0)
        change = current_price - prev_close if prev_close else 0
        change_percent = (change / prev_close * 100) if prev_close else 0
        
        return {
            "ok": True,
            "c": current_price,  # current price
            "d": change,  # change in price
            "dp": round(change_percent, 2),  # change percent
            "h": price_data.get("regularMarketDayHigh", {}).get("raw", 0),  # day high
            "l": price_data.get("regularMarketDayLow", {}).get("raw", 0),  # day low
            "o": price_data.get("regularMarketOpen", {}).get("raw", 0),  # open
            "pc": prev_close,  # previous close
            "t": int(time.time()),
        }
    except Exception as e:
        print(f"Yahoo Finance quote fetch failed: {e}")
        return None


def get_profile_yahoo(symbol: str):
    """
    Get company profile from Yahoo Finance
    Returns format compatible with Finnhub response
    """
    try:
        symbol = symbol.upper()
        url = f"{YAHOO_BASE}/quoteSummary/{symbol}"
        params = {
            "modules": "assetProfile"
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code != 200:
            return None
        
        data = response.json()
        if "quoteSummary" not in data or not data["quoteSummary"].get("result"):
            return None
        
        asset = data["quoteSummary"]["result"][0].get("assetProfile", {})
        
        return {
            "ok": True,
            "ticker": symbol,
            "name": asset.get("longName", symbol),
            "exchange": asset.get("exchange", ""),
            "currency": asset.get("currency", "USD"),
            "finnhubIndustry": asset.get("industry", ""),
            "country": asset.get("country", ""),
            "weburl": asset.get("website", ""),
        }
    except Exception as e:
        print(f"Yahoo Finance profile fetch failed: {e}")
        return None


def get_metrics_yahoo(symbol: str):
    """
    Get key metrics from Yahoo Finance
    Returns format compatible with Finnhub response
    """
    try:
        symbol = symbol.upper()
        url = f"{YAHOO_BASE}/quoteSummary/{symbol}"
        params = {
            "modules": "defaultKeyStatistics,summaryDetail"
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code != 200:
            return None
        
        data = response.json()
        if "quoteSummary" not in data or not data["quoteSummary"].get("result"):
            return None
        
        result = data["quoteSummary"]["result"][0]
        stats = result.get("defaultKeyStatistics", {})
        summary = result.get("summaryDetail", {})
        
        metric = {
            "52WeekHigh": summary.get("fiftyTwoWeekHigh", {}).get("raw", 0),
            "52WeekLow": summary.get("fiftyTwoWeekLow", {}).get("raw", 0),
            "peBasicExclExtraTTM": stats.get("trailingPE", {}).get("raw", 0),
            "epsBasicExclExtraItemsTTM": stats.get("trailingEps", {}).get("raw", 0),
        }
        
        return {
            "ok": True,
            "metric": metric,
        }
    except Exception as e:
        print(f"Yahoo Finance metrics fetch failed: {e}")
        return None


def get_candles_yahoo(symbol: str, resolution: str, count: int):
    """
    Get historical candles from Yahoo Finance
    Resolution: '1m', '5m', '15m', '30m', '60m', 'D', 'W', 'M'
    """
    try:
        symbol = symbol.upper()
        
        # Map resolution to Yahoo Finance interval
        interval_map = {
            "60": "1h",      # 1 hour
            "D": "1d",       # 1 day
            "W": "1wk",      # 1 week
            "M": "1mo",      # 1 month
        }
        interval = interval_map.get(resolution, "1d")
        
        # Calculate date range based on count and resolution
        if resolution == "60":
            period = "7d"  # 7 days for hourly
        elif resolution == "D":
            period = "6mo"  # 6 months for daily
        elif resolution == "W":
            period = "2y"   # 2 years for weekly
        else:
            period = "5y"   # 5 years for monthly
        
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
        params = {
            "interval": interval,
            "range": period,
        }
        
        response = requests.get(url, params=params, timeout=8)
        if response.status_code != 200:
            return None
        
        data = response.json()
        if "chart" not in data or not data["chart"].get("result"):
            return None
        
        quotes = data["chart"]["result"][0].get("quote", {})
        timestamps = data["chart"]["result"][0].get("timestamp", [])
        
        if not timestamps or not quotes:
            return None
        
        # Limit to requested count
        timestamps = timestamps[-count:] if len(timestamps) >= count else timestamps
        
        return {
            "ok": True,
            "s": symbol,
            "symbol": symbol,
            "t": timestamps,
            "o": quotes.get("open", [])[-count:] if quotes.get("open") else [],
            "h": quotes.get("high", [])[-count:] if quotes.get("high") else [],
            "l": quotes.get("low", [])[-count:] if quotes.get("low") else [],
            "c": quotes.get("close", [])[-count:] if quotes.get("close") else [],
        }
    except Exception as e:
        print(f"Yahoo Finance candles fetch failed: {e}")
        return None
