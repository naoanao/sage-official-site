#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Sage AI — セットアップ検証スクリプト
=====================================
setup.py実行後にこれを実行して、全ての接続が正常か確認します。

Usage:
    python setup_verify.py

各テストの結果をレポートし、失敗した場合は具体的な修正方法を表示します。
"""

import os
import sys
import json
import subprocess
import importlib
from pathlib import Path
from datetime import datetime

# ── カラー出力 ─────────────────────────────────────────────────────────────────
GREEN  = "\033[92m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"

def ok(text):    print(f"{GREEN}  ✅ {text}{RESET}")
def fail(text):  print(f"{RED}  ❌ {text}{RESET}")
def warn(text):  print(f"{YELLOW}  ⚠️  {text}{RESET}")
def info(text):  print(f"{CYAN}  ℹ️  {text}{RESET}")
def h(text):     print(f"\n{BOLD}{CYAN}{'─'*55}\n  {text}\n{'─'*55}{RESET}")

# ── .env読み込み ───────────────────────────────────────────────────────────────
def load_env():
    env_path = Path(".env")
    if not env_path.exists():
        fail(".envファイルが見つかりません。先に python setup.py を実行してください。")
        sys.exit(1)
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, _, val = line.partition("=")
            os.environ.setdefault(key.strip(), val.strip())

# ── テスト結果の追跡 ───────────────────────────────────────────────────────────
results = []

def record(name: str, passed: bool, message: str, fix: str = ""):
    results.append({"name": name, "passed": passed, "message": message, "fix": fix})
    if passed:
        ok(f"{name}: {message}")
    else:
        fail(f"{name}: {message}")
        if fix:
            info(f"修正方法: {fix}")

# ── 個別テスト ─────────────────────────────────────────────────────────────────

def test_python_version():
    h("Python環境チェック")
    v = sys.version_info
    if v >= (3, 9):
        record("Python", True, f"v{v.major}.{v.minor}.{v.micro} ✓")
    else:
        record("Python", False,
               f"v{v.major}.{v.minor} — 3.9以上が必要",
               "https://python.org/downloads/ から3.9+をインストール")

def test_node():
    h("Node.js環境チェック")
    try:
        r = subprocess.run(["node", "--version"], capture_output=True, text=True, timeout=5)
        ver = r.stdout.strip()
        major = int(ver.lstrip("v").split(".")[0])
        if major >= 18:
            record("Node.js", True, f"{ver} ✓")
        else:
            record("Node.js", False, f"{ver} — v18以上が必要",
                   "https://nodejs.org から LTS版をインストール")
    except Exception:
        record("Node.js", False, "見つかりません",
               "https://nodejs.org から LTS版をインストール")

def test_python_packages():
    h("Pythonパッケージチェック")
    required = [
        ("flask", "Flask"), ("groq", "groq"), ("requests", "requests"),
        ("dotenv", "python-dotenv"), ("langchain_google_genai", "langchain-google-genai"),
    ]
    for import_name, package_name in required:
        try:
            importlib.import_module(import_name)
            ok(f"  {package_name} インストール済み")
        except ImportError:
            fail(f"  {package_name} 未インストール")
            info(f"  pip install {package_name} --break-system-packages")

def test_env_keys():
    h("必須環境変数チェック")
    required = {
        "GROQ_API_KEY":              ("Groq APIキー", "https://console.groq.com → API Keys"),
        "BLUESKY_HANDLE":            ("Blueskyハンドル", "bsky.app → Settings → App Passwords"),
        "BLUESKY_APP_PASSWORD":      ("Blueskyアプリパスワード", "bsky.app → Settings → App Passwords"),
        "NOTION_TOKEN":              ("NotionトークンまたはNOTION_API_KEY", "notion.so/my-integrations"),
        "NOTION_CONTENT_POOL_DB_ID": ("NotionコンテンツプールのDB ID", "NotionのDBページURLの末尾32文字"),
    }
    # NOTION_TOKEN or NOTION_API_KEY のどちらかでOK
    notion_ok = bool(os.getenv("NOTION_TOKEN") or os.getenv("NOTION_API_KEY"))

    for key, (desc, guide) in required.items():
        if key in ("NOTION_TOKEN",) and notion_ok:
            ok(f"  Notion認証 ✓")
            continue
        val = os.getenv(key, "")
        if val and val not in ("your-key-here", "YOUR_KEY", ""):
            ok(f"  {key} 設定済み")
        else:
            record(key, False, f"未設定: {desc}", guide)

def test_groq_api():
    h("Groq API 接続テスト")
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        record("Groq API", False, "APIキー未設定",
               ".envのGROQ_API_KEYを設定してください")
        return
    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": "Reply 'OK' only."}],
            model="llama-3.3-70b-versatile",
            max_tokens=5,
        )
        reply = resp.choices[0].message.content.strip()
        record("Groq API", True, f"接続OK (返答: {reply})")
    except Exception as e:
        err = str(e)[:80]
        if "401" in err or "invalid" in err.lower():
            record("Groq API", False, "認証エラー",
                   "https://console.groq.com でAPIキーを再発行してください")
        elif "rate" in err.lower():
            record("Groq API", False, "レート制限",
                   "しばらく待ってから再実行してください")
        else:
            record("Groq API", False, f"接続失敗: {err}",
                   "ネットワーク接続を確認してください")

def test_bluesky():
    h("Bluesky 接続テスト")
    handle = os.getenv("BLUESKY_HANDLE", "")
    password = os.getenv("BLUESKY_APP_PASSWORD", "")
    if not handle or not password:
        record("Bluesky", False, "ハンドルまたはアプリパスワード未設定",
               "bsky.app → Settings → Privacy and Security → App Passwords")
        return
    try:
        import requests
        resp = requests.post(
            "https://bsky.social/xrpc/com.atproto.server.createSession",
            json={"identifier": handle, "password": password},
            timeout=10,
        )
        if resp.status_code == 200:
            record("Bluesky", True, f"ログイン成功 (@{handle})")
        elif resp.status_code == 401:
            record("Bluesky", False, "認証失敗",
                   "BLUESKY_APP_PASSWORDがアプリパスワードになっているか確認。メインパスワードはNG。")
        else:
            record("Bluesky", False, f"エラー: HTTP {resp.status_code}",
                   "ハンドルの形式を確認: yourname.bsky.social")
    except Exception as e:
        record("Bluesky", False, f"接続失敗: {str(e)[:60]}",
               "ネットワーク接続を確認してください")

def test_notion():
    h("Notion 接続テスト")
    token = os.getenv("NOTION_TOKEN") or os.getenv("NOTION_API_KEY", "")
    db_id = os.getenv("NOTION_CONTENT_POOL_DB_ID", "")
    if not token:
        record("Notion", False, "トークン未設定",
               "notion.so/my-integrations でトークンを作成してください")
        return
    try:
        import requests
        headers = {"Authorization": f"Bearer {token}", "Notion-Version": "2022-06-28"}
        if db_id:
            resp = requests.get(
                f"https://api.notion.com/v1/databases/{db_id.replace('-','')}",
                headers=headers, timeout=10,
            )
            if resp.status_code == 200:
                db_name = resp.json().get("title", [{}])[0].get("plain_text", "DB")
                record("Notion", True, f"DBアクセス成功: {db_name}")
            elif resp.status_code == 404:
                record("Notion", False, "データベースが見つかりません",
                       "NOTION_CONTENT_POOL_DB_IDを確認。IntegrationをDBにShareしましたか？")
            else:
                record("Notion", False, f"HTTP {resp.status_code}",
                       "トークンとDB IDを再確認してください")
        else:
            resp = requests.get("https://api.notion.com/v1/users/me",
                               headers=headers, timeout=10)
            if resp.status_code == 200:
                record("Notion", True, "トークン認証OK（DB ID未設定）")
                warn("NOTION_CONTENT_POOL_DB_IDを設定するとコンテンツ管理が使えます")
            else:
                record("Notion", False, f"認証失敗: HTTP {resp.status_code}",
                       "Notionトークンを再確認してください")
    except Exception as e:
        record("Notion", False, f"接続失敗: {str(e)[:60]}",
               "ネットワーク接続を確認してください")

def test_workers_deployment():
    h("Cloudflare Workers チェック")
    worker_dir = Path("workers/sage-sns-worker")
    if not worker_dir.exists():
        warn("workersディレクトリが見つかりません（スキップ）")
        return

    # wranglerの存在チェック
    try:
        r = subprocess.run(["npx", "wrangler", "--version"],
                          capture_output=True, text=True, timeout=10)
        if r.returncode == 0:
            ok(f"  Wrangler: {r.stdout.strip()}")
        else:
            warn("  Wranglerが使えません: npx wrangler --version でエラー")
    except Exception:
        warn("  Node.js/npxが見つかりません。Workersデプロイにはnpxが必要です。")
        return

    # tomlにaccount_idが設定されているか
    toml_path = worker_dir / "wrangler.toml"
    if toml_path.exists():
        content = toml_path.read_text()
        if "YOUR_CLOUDFLARE_ACCOUNT_ID" in content or 'account_id = ""' in content:
            record("Workers設定", False,
                   "wrangler.tomlにaccount_idが未設定",
                   f"CF_ACCOUNT_IDを.envに設定後、setup.pyを再実行してください")
        else:
            ok("  wrangler.toml設定済み")
    else:
        warn(f"  {toml_path}が見つかりません")

def test_flask_startup():
    h("Flaskサーバー起動テスト（簡易）")
    flask_path = Path("backend/flask_server.py")
    if not flask_path.exists():
        record("Flask", False, "backend/flask_server.pyが見つかりません")
        return
    # importチェックだけ（実際に起動はしない）
    try:
        import flask
        ok(f"  Flask {flask.__version__} インストール済み")
        record("Flask起動準備", True, "起動コマンド: .\\run_sage.ps1 (Win) / python backend/flask_server.py (Mac)")
    except ImportError:
        record("Flask", False, "Flaskがインストールされていません",
               "pip install flask --break-system-packages")

# ── AI診断 ────────────────────────────────────────────────────────────────────

def ai_diagnose_failures(failures: list):
    """失敗したテストをAIに診断させて修正提案を生成する"""
    if not failures:
        return
    api_key = os.getenv("GROQ_API_KEY", "")
    if not api_key:
        return

    h("AI自動診断")
    info("失敗した項目をAIが分析しています...")

    failure_text = "\n".join(
        f"- {f['name']}: {f['message']}" for f in failures
    )

    prompt = f"""You are a technical support assistant for Sage AI, an autonomous content automation system.
A user ran the setup verification script and got these failures:

{failure_text}

Provide a concise, step-by-step fix for each failure in Japanese.
Be specific and practical. Keep it under 200 words total."""

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        resp = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile",
            max_tokens=400,
            temperature=0.2,
        )
        diagnosis = resp.choices[0].message.content.strip()
        print(f"\n{CYAN}{diagnosis}{RESET}")
    except Exception as e:
        warn(f"AI診断を実行できませんでした: {e}")

# ── レポート出力 ───────────────────────────────────────────────────────────────

def print_report():
    passed = [r for r in results if r["passed"]]
    failed = [r for r in results if not r["passed"]]

    print(f"\n{BOLD}{'='*55}")
    print(f"  Sage AI セットアップ検証レポート")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*55}{RESET}")
    print(f"{GREEN}  合格: {len(passed)}項目{RESET}  {RED}要修正: {len(failed)}項目{RESET}")
    print(f"{'='*55}")

    if not failed:
        print(f"\n{GREEN}{BOLD}  🎉 全テスト合格！Sageを起動できます。")
        print(f"\n  Windows: .\\run_sage.ps1")
        print(f"  Mac/Linux: python backend/flask_server.py{RESET}\n")
    else:
        print(f"\n{RED}  以下の項目を修正してから起動してください:{RESET}")
        for f in failed:
            print(f"{RED}  • {f['name']}: {f['message']}{RESET}")
            if f["fix"]:
                print(f"{CYAN}    → {f['fix']}{RESET}")
        # AI診断
        ai_diagnose_failures(failed)

    # ログ保存
    log_path = Path("logs/setup_verify_report.json")
    log_path.parent.mkdir(exist_ok=True)
    log_path.write_text(json.dumps({
        "timestamp": datetime.now().isoformat(),
        "passed": len(passed),
        "failed": len(failed),
        "results": results,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{CYAN}  詳細レポート保存: {log_path}{RESET}\n")

# ── メイン ────────────────────────────────────────────────────────────────────

def main():
    print(f"\n{BOLD}{CYAN}")
    print("  ╔══════════════════════════════════════════╗")
    print("  ║     Sage AI — Setup Verification         ║")
    print("  ║     全接続テストを実行しています...      ║")
    print("  ╚══════════════════════════════════════════╝")
    print(f"{RESET}")

    load_env()

    test_python_version()
    test_node()
    test_python_packages()
    test_env_keys()
    test_groq_api()
    test_bluesky()
    test_notion()
    test_workers_deployment()
    test_flask_startup()

    print_report()


if __name__ == "__main__":
    main()
