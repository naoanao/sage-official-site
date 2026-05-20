"""
note_publisher.py — Sage自律note.com投稿モジュール v3
=======================================================
ChromeのCookieをロック中でも読み取り、note.com APIに投稿する。
ブラウザ起動不要。Cowork不要。Sage_start.batだけで完全自動。

【必要なもの（一回限り）】
  Edge（またはChrome）で note.com にログインしておく

【使い方】
  from backend.integrations.note_publisher import post_note_draft
  result = post_note_draft(title="...", body="...")

【テスト】
  python backend/integrations/note_publisher.py --test
  python backend/integrations/note_publisher.py --check
"""

import json
import logging
import os
import sys
import shutil
import sqlite3
import subprocess
import tempfile
import argparse
from pathlib import Path

import requests

logger = logging.getLogger(__name__)

NOTE_API = "https://note.com/api/v1/text_notes"
NOTE_USER = "mute_mint5020"


def _copy_locked_file(src: Path, dst: str) -> bool:
    """Chromeが起動中でもCookiesファイルをコピーする。robocopy /B を使用。"""
    try:
        result = subprocess.run(
            [
                "robocopy",
                str(src.parent),
                str(Path(dst).parent),
                src.name,
                "/B",
                "/NFL",
                "/NDL",
                "/NJH",
                "/NJS",
            ],
            capture_output=True,
            timeout=10,
        )
        return Path(dst).exists()
    except Exception as e:
        logger.debug(f"robocopy失敗: {e}")
        try:
            shutil.copy2(str(src), dst)
            return True
        except Exception:
            return False


def _find_cookie_files() -> list:
    """Chrome / Edge の全プロファイルのCookiesファイルを検索する。"""
    localappdata = os.environ.get("LOCALAPPDATA", "")
    appdata = os.environ.get("APPDATA", "")

    base_dirs = [
        Path(localappdata) / "Microsoft" / "Edge" / "User Data",
        Path(localappdata) / "Google" / "Chrome" / "User Data",
        Path(localappdata) / "BraveSoftware" / "Brave-Browser" / "User Data",
    ]

    cookie_files = []
    for base in base_dirs:
        if not base.exists():
            continue
        for profile_dir in [base / "Default"] + list(base.glob("Profile *")):
            for cookie_name in ["Network/Cookies", "Cookies"]:
                p = profile_dir / cookie_name
                if p.exists():
                    cookie_files.append(p)

    return cookie_files


def _read_note_cookies_from_db(db_path: str) -> dict:
    """SQLiteからnote.comのCookieを読み取る。"""
    cookies = {}
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute(
            "SELECT name, encrypted_value, value FROM cookies WHERE host_key LIKE '%note.com%'"
        )
        rows = cursor.fetchall()
        conn.close()

        for name, enc_val, val in rows:
            if val:
                cookies[name] = val
            elif enc_val:
                decrypted = _try_decrypt(enc_val)
                if decrypted:
                    cookies[name] = decrypted
    except Exception as e:
        logger.debug(f"DB読み取り失敗: {e}")
    return cookies


def _try_decrypt(encrypted_value: bytes) -> str:
    """Chrome Cookie複合化（Windows DPAPI / AES-GCM）。"""
    if not encrypted_value:
        return ""
    try:
        if encrypted_value[:3] == b"v10":
            return _decrypt_aes_gcm(encrypted_value)
        import win32crypt
        return win32crypt.CryptUnprotectData(encrypted_value, None, None, None, 0)[1].decode("utf-8")
    except Exception:
        return ""


def _decrypt_aes_gcm(encrypted_value: bytes) -> str:
    """Chrome 80+ AES-256-GCM Cookie複合化。"""
    try:
        import base64
        import win32crypt

        localappdata = os.environ.get("LOCALAPPDATA", "")
        local_state_path = (
            Path(localappdata) / "Google" / "Chrome" / "User Data" / "Local State"
        )
        with open(local_state_path, encoding="utf-8") as f:
            local_state = json.load(f)

        enc_key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])[5:]
        key = win32crypt.CryptUnprotectData(enc_key, None, None, None, 0)[1]

        try:
            from Crypto.Cipher import AES
        except ImportError:
            from Cryptodome.Cipher import AES

        iv = encrypted_value[3:15]
        payload = encrypted_value[15:-16]
        tag = encrypted_value[-16:]
        cipher = AES.new(key, AES.MODE_GCM, nonce=iv)
        return cipher.decrypt_and_verify(payload, tag).decode("utf-8")
    except Exception as e:
        logger.debug(f"AES-GCM複合化失敗: {e}")
        return ""


def get_note_cookies() -> dict:
    """
    全ブラウザのプロファイルからnote.comのCookieを取得する。
    ロック中でもrobocopyで対応。Edgeを優先して検索する。
    """
    cookie_files = _find_cookie_files()
    if not cookie_files:
        raise FileNotFoundError("ブラウザのCookiesファイルが見つかりません")

    logger.info(f"[NotePublisher] 検索対象: {len(cookie_files)}個のプロファイル")

    tmp_dir = tempfile.mkdtemp(prefix="sage_cookie_")
    try:
        for i, cookie_file in enumerate(cookie_files):
            tmp_db = os.path.join(tmp_dir, f"cookies_{i}.db")
            if _copy_locked_file(cookie_file, tmp_db):
                cookies = _read_note_cookies_from_db(tmp_db)
                if cookies:
                    logger.info(
                        f"[NotePublisher] note.com Cookie取得: "
                        f"{list(cookies.keys())} ({cookie_file.parent.name})"
                    )
                    return cookies
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    raise ValueError(
        "note.comのCookieが見つかりません。\n"
        "EdgeかChromeでnote.comにログインしてください。"
    )


def post_note_draft(title: str, body: str, publish: bool = False) -> dict:
    """
    note.comに下書きを投稿する（完全自動・前提条件なし）。
    成功: {"status": 201, "key": "n...", "url": "https://note.com/..."}
    失敗: {"error": "..."}
    """
    try:
        cookies = get_note_cookies()

        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "x-requested-with": "XMLHttpRequest",
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        }

        resp = requests.post(
            NOTE_API,
            json={"title": title, "body": body, "publish": publish},
            headers=headers,
            cookies=cookies,
            timeout=30,
        )

        data = resp.json()
        note_data = data.get("data", {})

        if note_data.get("key"):
            key = note_data["key"]
            url = f"https://note.com/{NOTE_USER}/n/{key}"
            logger.info(f"[NotePublisher] 投稿成功: {url}")
            return {"status": resp.status_code, "key": key, "url": url}
        else:
            err = data.get("error", data)
            logger.warning(f"[NotePublisher] APIエラー: {err}")
            return {"error": str(err), "status": resp.status_code}

    except Exception as e:
        logger.error(f"[NotePublisher] 例外: {e}")
        return {"error": str(e)}


# ─── CLI ────────────────────────────────────────────────────────────
if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Sage note.com 自動投稿")
    parser.add_argument("--test", action="store_true", help="テスト投稿（下書き保存）")
    parser.add_argument("--check", action="store_true", help="Cookie取得確認のみ")
    args = parser.parse_args()

    if args.check:
        print("note.com Cookie確認中...")
        try:
            cookies = get_note_cookies()
            print(f"取得成功: {len(cookies)}件のCookieを取得しました: {list(cookies.keys())}")
        except Exception as e:
            print(f"失敗: {e}")

    elif args.test:
        print("テスト投稿中...")
        result = post_note_draft(
            title="【Sage自動投稿テスト】このノートは削除してください",
            body="これはSageの自動投稿テストです。削除してください。",
            publish=False,
        )
        print(json.dumps(result, ensure_ascii=False, indent=2))

    else:
        parser.print_help()
