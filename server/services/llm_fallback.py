import requests
from core.config import Config
import logging

logger = logging.getLogger(__name__)


def generate_with_openai(prompt):
    if not Config.OPENAI_API_KEY:
        logger.warning("No OpenAI API key found")
        return None
    
    logger.info(f"OpenAI: Starting request with model {Config.OPENAI_MODEL}")
    try:
        payload = {
            "model": Config.OPENAI_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.2,
        }
        logger.info(f"OpenAI: Payload ready, making request...")
        
        r = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={"Authorization": f"Bearer {Config.OPENAI_API_KEY}"},
            json=payload,
            timeout=12,
        )
        
        logger.info(f"OpenAI: Status code {r.status_code}")
        
        if r.status_code != 200:
            logger.error(f"OpenAI: Failed with status {r.status_code}: {r.text[:500]}")
            return None
        
        j = r.json()
        response_text = j["choices"][0]["message"]["content"].strip()
        logger.info(f"OpenAI: Success! Response length: {len(response_text)}")
        return response_text
        
    except requests.exceptions.Timeout:
        logger.error("OpenAI: Request timeout (12s)")
        return None
    except requests.exceptions.ConnectionError as e:
        logger.error(f"OpenAI: Connection error: {e}")
        return None
    except Exception as e:
        logger.error(f"OpenAI: Error: {type(e).__name__}: {e}")
        return None