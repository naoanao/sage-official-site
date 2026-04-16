"""
instagram_token_check.py
──────────────────────────────────────────────────────────────────
Instagramアクセストークンの状態を診断・修復するスクリプト。

実行方法:
  python backend/scripts/instagram_token_check.py

何をチェックするか:
  1. .env のトークン・IDが存在するか
  2. トークンが現在有効かどうか（Graph API疎通）
  3. トークンの残り有効期限
  4. 有効期限が30日以内なら自動リフレッシュ試行
  5. Business Accountとの紐付け確認

修正手順:
  トークンが無効または期限切れで更新もできない場合は、
  新しいトークンの取得手順を出力する。
"""

import os
import sys
import json
import requests
from datetime import datetime, timedelta, timezone
from pathlib import Path

try:
    from dotenv import dotenv_values
    env = dotenv_values()
except ImportError:
    env = {}

# ── カラー出力 ──────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
CYAN   = "\033[96m"
RESET  = "\033[0m"
BOLD   = "\033[1m"

def ok(msg):   print(f"{GREEN}  ✅ {msg}{RESET}")
def warn(msg): print(f"{YELLOW}  ⚠️  {msg}{RESET}")
def err(msg):  print(f"{RED}  ❌ {msg}{RESET}")
def info(msg): print(f"{CYAN}  ℹ️  {msg}{RESET}")
def sep():     print(f"\n{'─'*60}\n")

# ── 環境変数チェック ───────────────────────────────────────────
def check_env_keys():
    print(f"\n{BOLD}[1/4] .env Instagram設定確認{RESET}")
    required = {
        "INSTAGRAM_ACCESS_TOKEN": "アクセストークン（長期トークン推奨）",
        "INSTAGRAM_ACCOUNT_ID":   "Business Account ID（数字のID）",
        "INSTAGRAM_APP_ID":       "Facebookアプリ ID",
        "INSTAGRAM_APP_SECRET":   "Facebookアプリ シークレット",
    }
    missing = []
    values = {}
    for key, desc in required.items():
        val = env.get(key) or os.getenv(key, "")
        values[key] = val
        if val:
            masked = val[:10] + "..." if len(val) > 10 else val
            ok(f"{key} = {masked}  ({desc})")
        else:
            err(f"{key} 未設定  → {desc}")
            missing.append(key)
    return missing, values

# ── トークン有効性チェック ─────────────────────────────────────
def check_token_validity(token: str, app_id: str, app_secret: str):
    print(f"\n{BOLD}[2/4] トークン有効性チェック{RESET}")
    if not token:
        err("トークンが未設定のため確認をスキップ")
        return None

    # debug_token エンドポイントで詳細を取得
    try:
        url = "https://graph.facebook.com/v21.0/debug_token"
        params = {
            "input_token": token,
            "access_token": f"{app_id}|{app_secret}" if app_id and app_secret else token,
        }
        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        if "error" in data:
            err(f"API エラー: {data['error'].get('message', data['error'])}")
            return None

        info_data = data.get("data", {})
        is_valid   = info_data.get("is_valid", False)
        expires_at = info_data.get("expires_at", 0)
        data_access_expires = info_data.get("data_access_expires_at", 0)
        scopes     = info_data.get("scopes", [])
        token_type = info_data.get("type", "unknown")

        if is_valid:
            ok(f"トークン有効 ✓  type={token_type}")
        else:
            err(f"トークン無効！  reason={info_data.get('error', {}).get('message','不明')}")
            return None

        # 有効期限
        if expires_at:
            exp_dt = datetime.fromtimestamp(expires_at, tz=timezone.utc)
            days_left = (exp_dt - datetime.now(timezone.utc)).days
            if days_left > 30:
                ok(f"有効期限: {exp_dt.strftime('%Y-%m-%d')} (残り {days_left} 日)")
            elif days_left > 0:
                warn(f"有効期限: {exp_dt.strftime('%Y-%m-%d')} (残り {days_left} 日) — まもなく期限切れ！")
            else:
                err(f"有効期限切れ: {exp_dt.strftime('%Y-%m-%d')}")
                return None
        else:
            ok("有効期限なし（永続トークン）")
            days_left = 999

        # 必要スコープ確認
        needed = {"instagram_basic", "instagram_content_publish", "pages_read_engagement"}
        have   = set(scopes)
        missing_scopes = needed - have
        if not missing_scopes:
            ok(f"必要スコープ全部あり: {', '.join(sorted(needed))}")
        else:
            warn(f"不足スコープ: {', '.join(missing_scopes)}")
            info("不足スコープがあると投稿できない場合があります")

        return {"valid": True, "days_left": days_left, "scopes": scopes}

    except Exception as e:
        err(f"トークン確認中にエラー: {e}")
        return None

# ── Business Account確認 ──────────────────────────────────────
def check_business_account(token: str, account_id: str):
    print(f"\n{BOLD}[3/4] Instagram Business Account確認{RESET}")
    if not token or not account_id:
        warn("token または account_id が未設定のためスキップ")
        return False

    try:
        url = f"https://graph.facebook.com/v21.0/{account_id}"
        params = {
            "fields": "id,name,username,followers_count,media_count",
            "access_token": token,
        }
        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        if "error" in data:
            err(f"Account取得エラー: {data['error'].get('message', data['error'])}")
            info("INSTAGRAM_ACCOUNT_ID が正しいか確認してください")
            info("確認方法: https://www.facebook.com/help/1503421039731588")
            return False

        ok(f"Account接続確認: @{data.get('username', '?')} (ID: {data.get('id', '?')})")
        ok(f"フォロワー数: {data.get('followers_count', '?')}")
        ok(f"投稿数: {data.get('media_count', '?')}")
        return True

    except Exception as e:
        err(f"Business Account確認エラー: {e}")
        return False

# ── トークンリフレッシュ試行 ─────────────────────────────────────
def try_refresh_token(token: str, app_id: str, app_secret: str, days_left: int):
    print(f"\n{BOLD}[4/4] トークンリフレッシュ{RESET}")

    if days_left > 30:
        ok(f"有効期限が {days_left} 日残っているためリフレッシュ不要")
        return

    if not all([token, app_id, app_secret]):
        warn("APP_ID または APP_SECRET が未設定のためリフレッシュをスキップ")
        _print_manual_refresh_guide()
        return

    info("有効期限が30日以内のためリフレッシュを試みます...")
    try:
        url = "https://graph.facebook.com/v21.0/oauth/access_token"
        params = {
            "grant_type": "fb_exchange_token",
            "client_id": app_id,
            "client_secret": app_secret,
            "fb_exchange_token": token,
        }
        res = requests.get(url, params=params, timeout=10)
        data = res.json()

        if "access_token" in data:
            new_token = data["access_token"]
            expires_in = data.get("expires_in", 0)
            ok(f"リフレッシュ成功！ 新しい有効期限: {expires_in // 86400} 日後")
            print(f"""
{YELLOW}{BOLD}  次のステップ:{RESET}
  1. .env を以下のように更新してください:
     INSTAGRAM_ACCESS_TOKEN={new_token[:30]}...

  2. CF Pages Dashboard → Settings → Environment variables も更新
""")
            # .envファイルを自動更新
            try:
                sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
                from backend.utils.env_utils import update_env_file
                update_env_file("INSTAGRAM_ACCESS_TOKEN", new_token)
                ok(".env ファイルを自動更新しました")
            except Exception as e:
                warn(f".env 自動更新失敗（手動更新してください）: {e}")
        else:
            err(f"リフレッシュ失敗: {data.get('error', {}).get('message', data)}")
            _print_manual_refresh_guide()

    except Exception as e:
        err(f"リフレッシュ中にエラー: {e}")
        _print_manual_refresh_guide()

def _print_manual_refresh_guide():
    print(f"""
{YELLOW}{BOLD}  ── 手動でトークンを再取得する手順 ──────────────────────────{RESET}
  1. https://developers.facebook.com/tools/explorer/ を開く
  2. アプリを選択 → 「Generate Access Token」
  3. 必要な権限にチェック:
       ✅ instagram_basic
       ✅ instagram_content_publish
       ✅ pages_read_engagement
       ✅ pages_show_list
  4. 生成されたトークンをコピー
  5. 長期トークンに変換（60日有効）:
     curl -G -d "grant_type=fb_exchange_token" \\
          -d "client_id={{APP_ID}}" \\
          -d "client_secret={{APP_SECRET}}" \\
          -d "fb_exchange_token={{SHORT_LIVED_TOKEN}}" \\
          "https://graph.facebook.com/v21.0/oauth/access_token"
  6. 返ってきた access_token を .env の INSTAGRAM_ACCESS_TOKEN に設定
{YELLOW}  ─────────────────────────────────────────────────────────────{RESET}
""")

# ── エントリポイント ─────────────────────────────────────────────
if __name__ == "__main__":
    print(f"\n{BOLD}{'='*60}")
    print(f"  Sage Instagram Token 診断スクリプト")
    print(f"{'='*60}{RESET}")

    missing_keys, values = check_env_keys()
    sep()

    token      = values.get("INSTAGRAM_ACCESS_TOKEN", "")
    account_id = values.get("INSTAGRAM_ACCOUNT_ID", "")
    app_id     = values.get("INSTAGRAM_APP_ID", "")
    app_secret = values.get("INSTAGRAM_APP_SECRET", "")

    token_info = check_token_validity(token, app_id, app_secret)
    sep()

    account_ok = check_business_account(token, account_id)
    sep()

    days_left = token_info.get("days_left", 0) if token_info else 0
    try_refresh_token(token, app_id, app_secret, days_left)

    # サマリー
    print(f"\n{BOLD}診断サマリー{RESET}")
    if not missing_keys and token_info and account_ok:
        ok("Instagram連携は正常です。投稿自動化は稼働できます。")
    elif not token_info:
        err("トークンが無効または未設定です。上記の手順で再取得してください。")
        err("Instagram投稿はフォールバック（手動コピペ）になっています。")
    elif not account_ok:
        warn("トークンは有効ですが Business Account との接続に問題があります。")
        info("INSTAGRAM_ACCOUNT_ID が正しい数字のIDかどうか確認してください。")
    print()
