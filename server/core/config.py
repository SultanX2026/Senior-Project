import os

class Config:
    PORT = int(os.getenv("PORT", 5001))
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/stocklens")
    JWT_SECRET = os.getenv("JWT_SECRET", "change_me")
    ALLOW_ORIGINS = [o.strip() for o in os.getenv("ALLOW_ORIGINS", "http://localhost:5173").split(",")]
    FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")
    NEWSAPI_KEY = os.getenv("NEWSAPI_KEY", "")
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")