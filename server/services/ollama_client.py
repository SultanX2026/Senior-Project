import requests
from core.config import Config


def generate_with_ollama(prompt, model="mistral"):
    try:
        r = requests.post(
            f"{Config.OLLAMA_HOST}/api/generate",
            json={"model": model, "prompt": prompt, "stream": False},
            timeout=12,
        )
        r.raise_for_status()
        return (r.json() or {}).get("response", "").strip()
    except Exception:
        return None