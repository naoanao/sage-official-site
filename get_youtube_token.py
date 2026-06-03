"""
YouTube OAuth2 Refresh Token 取得ヘルパー
==========================================
初回のみ実行。ブラウザで Google アカウント認証後、
Refresh Token を表示します。

使い方:
    1. Google Cloud Console でOAuth2クライアントIDを作成
       - アプリの種類: デスクトップアプリ
       - リダイレクトURI: http://localhost:8080
    2. .env に YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET を設定
    3. python get_youtube_token.py を実行
    4. ブラウザで認証後、表示された REFRESH_TOKEN を .env に追加

必要パッケージ: pip install google-auth-oauthlib
"""

import os
import sys

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("ERROR: Run: pip install google-auth-oauthlib")
    sys.exit(1)

try:
    from dotenv import dotenv_values
    env = dotenv_values()
except Exception:
    env = {}

CLIENT_ID = env.get("YOUTUBE_CLIENT_ID") or os.getenv("YOUTUBE_CLIENT_ID")
CLIENT_SECRET = env.get("YOUTUBE_CLIENT_SECRET") or os.getenv("YOUTUBE_CLIENT_SECRET")

if not CLIENT_ID or not CLIENT_SECRET:
    print("ERROR: Set YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET in .env")
    sys.exit(1)

SCOPES = ["https://www.googleapis.com/auth/youtube.upload"]

client_config = {
    "installed": {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "redirect_uris": ["http://localhost:8080"],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

print("=== YouTube OAuth2 Refresh Token 取得 ===")
print("ブラウザが開きます。Googleアカウントでログインして許可してください。\n")

flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
creds = flow.run_local_server(port=8080, prompt="consent", access_type="offline")

print("\n✅ 認証成功！\n")
print(f"YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")

# Auto-write refresh token to .env
import re
env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
try:
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            content = f.read()
        if "YOUTUBE_REFRESH_TOKEN=" in content:
            content = re.sub(
                r"YOUTUBE_REFRESH_TOKEN=.*",
                f"YOUTUBE_REFRESH_TOKEN={creds.refresh_token}",
                content,
            )
        else:
            content += f"\nYOUTUBE_REFRESH_TOKEN={creds.refresh_token}\n"
        with open(env_path, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\n✅ .env に自動保存しました: {env_path}")
    else:
        print(f"\n⚠️ .env が見つかりません。手動で追加してください:")
        print(f"  YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")
except Exception as e:
    print(f"\n⚠️ .env への書き込みに失敗しました: {e}")
    print(f"手動で追加してください: YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")

print("\n完了！このウィンドウを閉じてください。")
