import requests
import os
from dotenv import load_dotenv

# Load .env
load_dotenv()

api_key = os.getenv("OPENAI_API_KEY", "").strip()
print(f"API Key loaded: {api_key[:20]}..." if api_key else "NO API KEY")
print(f"API Key length: {len(api_key)}")

if not api_key:
    print("❌ ERROR: No API key found!")
    exit(1)

# Test the API
print("\nTesting OpenAI API...")
try:
    r = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json={
            "model": "gpt-4o-mini",
            "messages": [{"role": "user", "content": "Say 'API is working'"}],
            "temperature": 0.2,
        },
        timeout=12,
    )
    print(f"Status: {r.status_code}")
    print(f"Response: {r.text[:200]}")
    
    if r.status_code == 200:
        print("✅ API KEY WORKS!")
    else:
        print(f"❌ API Error: {r.status_code}")
except Exception as e:
    print(f"❌ Error: {e}")
