import os

class Config:
    PORT = int(os.getenv("PORT", 5001))
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/stocklens")
    JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
    
    # CORS: comma-separated list of allowed origins
    # In development, allow any origin for easy testing
    # In production, set specific origins via environment variable
    ALLOW_ORIGINS = os.getenv(
        "ALLOW_ORIGINS", 
        "*"  # Allow all origins in development (for mobile/network testing)
    )
    
    # If string is passed, convert to list
    if isinstance(ALLOW_ORIGINS, str):
        if ALLOW_ORIGINS == "*":
            ALLOW_ORIGINS = "*"  # Keep as wildcard for CORS
        else:
            ALLOW_ORIGINS = [o.strip() for o in ALLOW_ORIGINS.split(",")]
    
    FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
    NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")