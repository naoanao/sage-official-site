"""
Gumroad OAuth Re-Authentication Script
=======================================
Run this once to get a fresh access token for "Sage SalesMonitor".

Steps:
  1. Go to gumroad.com/oauth/applications
  2. Click "Edit" on "Sage SalesMonitor"
  3. Set Redirect URI to: http://localhost:8088/callback  (save)
  4. Copy your Application ID and Application Secret
  5. Paste them below (APP_ID / APP_SECRET) or set as env vars
  6. Run:  python gumroad_reauth.py
  7. Browser opens → click "Authorize" → token saved to .env automatically
"""

import os
import sys
import webbrowser
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import requests
from dotenv import load_dotenv, set_key

# ── Config ───────────────────────────────────────────────────────────────────
load_dotenv(".env")

APP_ID     = os.getenv("GUMROAD_APP_ID", "")      # paste your Application ID here
APP_SECRET = os.getenv("GUMROAD_APP_SECRET", "")  # paste your Application Secret here
REDIRECT   = "http://localhost:8088/callback"
ENV_FILE   = ".env"
SCOPE      = "edit_products view_sales"
PORT       = 8088

# ── Minimal local callback server ────────────────────────────────────────────
auth_code = None
server_done = threading.Event()

class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code
        parsed = urlparse(self.path)
        if parsed.path == "/callback":
            params = parse_qs(parsed.query)
            code = params.get("code", [None])[0]
            if code:
                auth_code = code
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"<h2>Authorization successful!</h2><p>You can close this tab.</p>")
            else:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(b"<h2>Error: no code received.</h2>")
        else:
            self.send_response(404)
            self.end_headers()
        server_done.set()

    def log_message(self, format, *args):
        pass  # silent

def run_server():
    httpd = HTTPServer(("localhost", PORT), CallbackHandler)
    httpd.handle_request()

def main():
    # Validate credentials
    app_id     = APP_ID     or os.getenv("GUMROAD_APP_ID", "").strip()
    app_secret = APP_SECRET or os.getenv("GUMROAD_APP_SECRET", "").strip()

    if not app_id or not app_secret:
        print("=" * 60)
        print("ERROR: GUMROAD_APP_ID / GUMROAD_APP_SECRET not set.")
        print()
        print("Steps:")
        print("  1. gumroad.com/oauth/applications")
        print("  2. Click Edit on 'Sage SalesMonitor'")
        print("  3. Add Redirect URI: http://localhost:8088/callback")
        print("  4. Copy Application ID → paste into .env as GUMROAD_APP_ID=")
        print("  5. Copy Application Secret → paste into .env as GUMROAD_APP_SECRET=")
        print("  6. Re-run this script")
        print("=" * 60)
        sys.exit(1)

    # Start callback server in background
    t = threading.Thread(target=run_server, daemon=True)
    t.start()

    # Build authorization URL and open browser
    auth_url = (
        f"https://gumroad.com/oauth/authorize"
        f"?client_id={app_id}"
        f"&redirect_uri={REDIRECT}"
        f"&scope={SCOPE.replace(' ', '+')}"
    )
    print(f"Opening browser for Gumroad authorization...")
    print(f"URL: {auth_url}")
    webbrowser.open(auth_url)

    # Wait for callback
    print("Waiting for authorization (click 'Authorize' in browser)...")
    server_done.wait(timeout=120)

    if not auth_code:
        print("ERROR: No authorization code received (timeout or error).")
        sys.exit(1)

    print(f"Authorization code received. Exchanging for access token...")

    # Exchange code for access token
    resp = requests.post(
        "https://api.gumroad.com/oauth/token",
        data={
            "client_id":     app_id,
            "client_secret": app_secret,
            "redirect_uri":  REDIRECT,
            "code":          auth_code,
            "grant_type":    "authorization_code",
        },
        timeout=20,
    )

    if resp.status_code != 200:
        print(f"ERROR: Token exchange failed: {resp.status_code} {resp.text}")
        sys.exit(1)

    data = resp.json()
    token = data.get("access_token")
    if not token:
        print(f"ERROR: No access_token in response: {data}")
        sys.exit(1)

    # Save to .env
    set_key(ENV_FILE, "GUMROAD_ACCESS_TOKEN", token)
    print()
    print("=" * 60)
    print(f"SUCCESS! New access token saved to .env")
    print(f"Token: {token[:12]}...")
    print("=" * 60)
    print()
    print("Test with:")
    print("  python -c \"from backend.scheduler.gumroad_scheduler import GumroadScheduler; GumroadScheduler().run_once()\"")

if __name__ == "__main__":
    main()
