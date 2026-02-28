#!/usr/bin/env python
"""
Perplexity API health check.

Usage:
    python tools/check_perplexity.py

Exit codes:
    0 = 200 OK (API is healthy)
    1 = 401 Unauthorized (key invalid or expired)
    2 = any other error (network, timeout, unexpected status)
"""

import pathlib
import sys

ROOT = pathlib.Path(__file__).parent.parent
sys.path.insert(0, str(ROOT))

try:
    from dotenv import load_dotenv
    load_dotenv(ROOT / ".env")
except ImportError:
    pass

import os
import requests


def main() -> None:
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        print("[SKIP] PERPLEXITY_API_KEY not set in .env")
        sys.exit(2)

    print(f"Checking Perplexity API (key: ...{api_key[-6:]}) ...")

    try:
        resp = requests.post(
            "https://api.perplexity.ai/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "sonar-reasoning-pro",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 8,
            },
            timeout=30,
        )
    except Exception as e:
        print(f"[ERROR] Request failed: {e}")
        sys.exit(2)

    ct = resp.headers.get("content-type", "")
    preview = resp.text[:200]
    print(f"  status_code : {resp.status_code}")
    print(f"  content-type: {ct}")
    print(f"  response    : {preview}")

    if resp.status_code == 200:
        print("[OK] Perplexity API is healthy")
        sys.exit(0)
    elif resp.status_code == 401:
        # Distinguish CF WAF block (text/html) from real Perplexity auth error (application/json)
        if "text/html" in ct:
            print("[FAIL] 401 from Cloudflare WAF (not Perplexity) -- IP rate-limited or banned.")
            print("       Wait 30-60 min, or try from a different network. Key may still be valid.")
        else:
            print("[FAIL] 401 Unauthorized -- API key is invalid or expired. Re-obtain key.")
        sys.exit(1)
    else:
        print(f"[FAIL] Unexpected status {resp.status_code}")
        sys.exit(2)


if __name__ == "__main__":
    main()
