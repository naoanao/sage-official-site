"""
note_publisher.py — Sage自律note.com投稿モジュール
=====================================================
Playwrightで専用Chromeプロファイルを使い、
なおさんのnote.comセッションを引き継いで自動投稿する。

【初回セットアップ（一回だけ）】
    python backend/integrations/note_publisher.py --setup

【通常使用（Flaskスケジューラーから呼ぶ）】
    from backend.integrations.note_publisher import post_note_draft
    result = post_note_draft(title="...", body="...", publish=False)
"""

import asyncio
import json
import logging
import os
import sys
import argparse
from pathlib import Path

logger = logging.getLogger(__name__)

# Sageが使う専用Chromeプロファイルの場所
# Windowsの場合: C:\Users\nao\AppData\Local\Google\Chrome\User Data
_BASE_CHROME_DIR = Path(os.environ.get("LOCALAPPDATA", "")) / "Google" / "Chrome" / "User Data"
SAGE_PROFILE_DIR = _BASE_CHROME_DIR / "SageProfile"

NOTE_API = "https://note.com/api/v1/text_notes"


async def _post_via_playwright(title: str, body: str, publish: bool = False) -> dict:
    """Playwrightで専用プロファイルからnote.com APIに投稿する。"""
    from playwright.async_api import async_playwright

    if not SAGE_PROFILE_DIR.exists():
        raise RuntimeError(
            f"Sageプロファイルが見つかりません: {SAGE_PROFILE_DIR}\n"
            "先に python backend/integrations/note_publisher.py --setup を実行してください。"
        )

    async with async_playwright() as p:
        # 専用プロファイルで headless Chrome 起動
        # channel="chrome" でシステムのChromeを使う（Chromiumではない）
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(SAGE_PROFILE_DIR),
            channel="chrome",
            headless=True,
            args=[
                "--no-first-run",
                "--no-default-browser-check",
                "--disable-blink-features=AutomationControlled",
            ],
        )

        page = ctx.pages[0] if ctx.pages else await ctx.new_page()

        # note.comに移動してCookieを有効化
        await page.goto("https://note.com", wait_until="domcontentloaded", timeout=30000)

        # ログイン確認
        login_check = await page.evaluate("""
            () => {
                const el = document.querySelector('[data-testid="header-user-icon"]') ||
                           document.querySelector('.o-userIcon') ||
                           document.querySelector('a[href*="/notes/"]');
                return el ? 'logged_in' : 'not_logged_in';
            }
        """)

        if login_check == "not_logged_in":
            await ctx.close()
            raise RuntimeError(
                "note.comにログインしていません。\n"
                "python backend/integrations/note_publisher.py --setup でログインし直してください。"
            )

        # API投稿
        result = await page.evaluate(
            """
            async ({title, body, publish, api_url}) => {
                const r = await fetch(api_url, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        'x-requested-with': 'XMLHttpRequest'
                    },
                    body: JSON.stringify({title, body, publish})
                });
                const j = await r.json();
                return {status: r.status, body: j};
            }
            """,
            {"title": title, "body": body, "publish": publish, "api_url": NOTE_API},
        )

        await ctx.close()

    return result


def post_note_draft(title: str, body: str, publish: bool = False) -> dict:
    """
    同期インターフェース。Flaskスケジューラーから呼ぶ。
    成功時: {"status": 200/201, "key": "n...", "url": "https://note.com/..."}
    失敗時: {"error": "..."} を返す（例外は投げない）
    """
    try:
        result = asyncio.run(_post_via_playwright(title, body, publish))
        status = result.get("status", 0)
        data = result.get("body", {}).get("data", {})

        if data.get("key"):
            key = data["key"]
            url = f"https://note.com/mute_mint5020/n/{key}"
            logger.info(f"[NotePublisher] ✅ 投稿成功: {url}")
            return {"status": status, "key": key, "url": url}
        else:
            err = result.get("body", {})
            logger.error(f"[NotePublisher] ❌ API エラー: {err}")
            return {"error": str(err), "status": status}

    except Exception as e:
        logger.error(f"[NotePublisher] ❌ 例外: {e}")
        return {"error": str(e)}


async def _setup_profile():
    """
    初回セットアップ: 専用プロファイルでChromeを開いてnote.comにログインさせる。
    """
    from playwright.async_api import async_playwright

    print(f"\n📂 Sageプロファイルを作成します: {SAGE_PROFILE_DIR}")
    print("Chromeが開きます。note.comにログインしてください。")
    print("ログイン完了後、このターミナルに戻って Enter を押してください。\n")

    SAGE_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    async with async_playwright() as p:
        ctx = await p.chromium.launch_persistent_context(
            user_data_dir=str(SAGE_PROFILE_DIR),
            channel="chrome",
            headless=False,  # 見える状態で起動
            args=["--no-first-run", "--no-default-browser-check"],
        )
        page = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await page.goto("https://note.com/login")

        print("✅ Chromeが起動しました。note.comにログインしてください。")
        print("ログイン完了後、Enter を押してください...")
        input()

        # ログイン確認
        login_check = await page.evaluate("""
            () => document.querySelector('a[href*="/notes/"]') ? 'ok' : 'ng'
        """)

        if login_check == "ok":
            print("✅ ログイン確認できました！セットアップ完了です。")
            print("以降、Sageが毎日自動で投稿します。")
        else:
            print("⚠️  ログインが確認できませんでした。もう一度試してください。")

        await ctx.close()


# ─── CLIエントリポイント ────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Sage note.com 自動投稿")
    parser.add_argument("--setup", action="store_true", help="初回セットアップ（ログイン）")
    parser.add_argument("--test", action="store_true", help="テスト投稿（下書き）")
    args = parser.parse_args()

    if args.setup:
        asyncio.run(_setup_profile())

    elif args.test:
        print("テスト投稿を実行します...")
        result = post_note_draft(
            title="【Sage自動投稿テスト】このノートは削除してください",
            body="これはSageの自動投稿テストです。このノートは削除してください。\n\nSage AIが自律的にnote.comへ投稿できることを確認しました。",
            publish=False,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))

    else:
        parser.print_help()
