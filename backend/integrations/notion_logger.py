"""
NotionLogger — 運用イベントをNotion タスク管理DBへ自動記録。

記録タイミング:
  1. Flask起動時 — API健全性チェック結果 (HF / imgbb / Gemini / Groq)
  2. コース生成完了時 — 生成結果・画像URL・コミットハッシュ
  3. エラー発生時 — 即座に通知

DB: Sage 3.0 タスク管理 (c48ea661-def4-4755-be20-7e85cb1ea93c)
"""

import os
import logging
import subprocess
import requests
from datetime import datetime, timezone, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

NOTION_API_VERSION = "2022-06-28"
TASK_DB_ID = "c48ea661-def4-4755-be20-7e85cb1ea93c"  # タスク管理DBのデータソースID
JST = timezone(timedelta(hours=9))


def _get_commit() -> str:
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


def _notion_headers() -> dict:
    key = os.getenv("NOTION_API_KEY")
    if not key:
        raise ValueError("NOTION_API_KEY not set")
    return {
        "Authorization": f"Bearer {key}",
        "Notion-Version": NOTION_API_VERSION,
        "Content-Type": "application/json",
    }


def _create_page(title: str, status: str, category: str, memo: str,
                 priority: str = "中", url: str | None = None) -> str | None:
    """タスク管理DBに1ページ作成して page_id を返す。失敗時は None。"""
    today = datetime.now(JST).strftime("%Y-%m-%d")
    props: dict = {
        "タスク名": {"title": [{"text": {"content": title[:100]}}]},
        "ステータス": {"select": {"name": status}},
        "カテゴリ": {"select": {"name": category}},
        "優先度": {"select": {"name": priority}},
        "メモ": {"rich_text": [{"text": {"content": memo[:2000]}}]},
        "完了日": {"date": {"start": today}},
    }
    if url:
        props["関連URL"] = {"url": url}

    body = {
        "parent": {"database_id": TASK_DB_ID},
        "properties": props,
    }
    try:
        resp = requests.post(
            "https://api.notion.com/v1/pages",
            headers=_notion_headers(),
            json=body,
            timeout=15,
        )
        if resp.status_code == 200:
            page_id = resp.json().get("id", "")
            logger.info(f"NotionLogger: page created — {title[:50]}")
            return page_id
        logger.warning(f"NotionLogger: Notion API {resp.status_code}: {resp.text[:200]}")
    except Exception as e:
        logger.warning(f"NotionLogger: failed to create page — {e}")
    return None


class NotionLogger:
    """Sage運用イベントをNotion タスク管理DBへ記録する。"""

    def log_startup_health(self, missing_keys: list[str]) -> None:
        """
        Flask起動時のAPIキー健全性チェック結果を記録。
        missing_keys: EnvGuardian.validate() の戻り値。
        """
        commit = _get_commit()
        all_keys = ["HF_TOKEN", "IMGBB_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "NOTION_API_KEY"]
        lines = []
        for k in all_keys:
            icon = "❌" if k in missing_keys else "✅"
            lines.append(f"{icon} {k}")

        status = "完了" if not missing_keys else "繰り返し発生"
        memo = (
            f"Commit: {commit}\n"
            f"起動時刻: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S JST')}\n\n"
            + "\n".join(lines)
        )
        if missing_keys:
            memo += f"\n\n⚠️ Missing: {', '.join(missing_keys)}"

        _create_page(
            title=f"[起動] API Health Check — {datetime.now(JST).strftime('%m/%d %H:%M')}",
            status=status,
            category="開発",
            priority="低",
            memo=memo,
        )

    def log_course_generation(self, topic: str, sections_count: int,
                               image_urls: list[str], sales_page_len: int,
                               has_bonus: bool) -> None:
        """コース生成完了を記録。"""
        commit = _get_commit()
        imgbb_count = sum(1 for u in image_urls if "ibb.co" in (u or ""))
        lorem_count = sum(1 for u in image_urls if "loremflickr" in (u or ""))
        sample_url = next((u for u in image_urls if "ibb.co" in (u or "")), None)

        memo = (
            f"Topic: {topic}\n"
            f"Sections: {sections_count}\n"
            f"Images: {len(image_urls)} total / {imgbb_count} imgbb / {lorem_count} LoremFlickr\n"
            f"Sales page: {sales_page_len} chars\n"
            f"Bonus section: {'✅' if has_bonus else '❌'}\n"
            f"Commit: {commit}\n"
        )
        if sample_url:
            memo += f"Sample image: {sample_url}"

        _create_page(
            title=f"[コース生成] {topic[:60]}",
            status="完了",
            category="開発",
            priority="中",
            memo=memo,
            url=sample_url,
        )

    def log_error(self, context: str, error_msg: str) -> None:
        """エラー発生を即座に記録。"""
        commit = _get_commit()
        memo = (
            f"Context: {context}\n"
            f"Error: {error_msg[:500]}\n"
            f"Commit: {commit}\n"
            f"Time: {datetime.now(JST).strftime('%Y-%m-%d %H:%M:%S JST')}"
        )
        _create_page(
            title=f"[ERROR] {context[:70]}",
            status="繰り返し発生",
            category="デバッグ",
            priority="緊急",
            memo=memo,
        )


# Singleton
notion_logger = NotionLogger()
