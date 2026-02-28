import requests
import json

url = "http://localhost:8080/api/chat"
payload = {
    "message": "https://example.com を読んで内容を教えて",
    "history": []
}
headers = {"Content-Type": "application/json"}

try:
    print("Testing browse functionality via chat endpoint...")
    response = requests.post(url, json=payload, headers=headers, timeout=60)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json().get('response', '')[:200]}...")
except Exception as e:
    print(f"Error: {e}")
