import os
import requests
from dotenv import load_dotenv

load_dotenv()
pplx_key = os.getenv("PERPLEXITY_API_KEY")
print(f"Testing with key: {pplx_key[:10]}...")

url = "https://api.perplexity.ai/chat/completions"
payload = {
    "model": "sonar-reasoning-pro",
    "messages": [
        {"role": "user", "content": "Test research"}
    ]
}
headers = {
    "Authorization": f"Bearer {pplx_key}",
    "Content-Type": "application/json"
}

response = requests.post(url, json=payload, headers=headers)
print(f"Status: {response.status_code}")
print(f"Response: {response.text}")
