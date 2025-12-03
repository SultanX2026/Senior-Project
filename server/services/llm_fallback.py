import requests
from core.config import Config
import logging
import json

logger = logging.getLogger(__name__)

AGENT_API_URL = "https://8neoa7izbf.execute-api.us-east-2.amazonaws.com/Prod/chat"


def generate_with_agent(prompt, session_id="stocklens-session"):
    """Call the external agent API."""
    try:
        logger.info("Agent API: Starting request")
        
        # Wrap the payload in "body" as a JSON string (API Gateway format)
        payload = {
            "body": json.dumps({
                "user_query": prompt,
                "session_id": session_id,
            })
        }
        
        r = requests.post(
            AGENT_API_URL,
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=12,
        )
        
        logger.info(f"Agent API: Status code {r.status_code}")
        
        if r.status_code != 200:
            logger.error(f"Agent API: Failed with status {r.status_code}: {r.text[:500]}")
            return None
        
        data = r.json()
        
        # Parse the response (API Gateway returns { body: JSON string, ... })
        body = data
        if isinstance(data.get("body"), str):
            logger.info("Agent API: Parsing body string from API Gateway response")
            body = json.loads(data["body"])
        
        response_text = body.get("response", "").strip()
        
        if not response_text:
            logger.error("Agent API: No response text in API response")
            return None
            
        logger.info(f"Agent API: Success! Response length: {len(response_text)}")
        return response_text
        
    except requests.exceptions.Timeout:
        logger.error("Agent API: Request timeout (12s)")
        return None
    except requests.exceptions.ConnectionError as e:
        logger.error(f"Agent API: Connection error: {e}")
        return None
    except json.JSONDecodeError as e:
        logger.error(f"Agent API: JSON decode error: {e}")
        return None
    except Exception as e:
        logger.error(f"Agent API: Error: {type(e).__name__}: {e}")
        return None


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