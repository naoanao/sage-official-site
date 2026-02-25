"""
Notion Evidence Ledger — D1実行ログを Evidence Ledger DBへ1行追記する。

使い方:
    from backend.modules.notion_evidence_ledger import evidence_ledger
    evidence_ledger.log_d1_run(
        topic="AI Trends 2026",
        status="成功",
        obsidian_file="research_1234567890.md",
        commit="abc1234",
        api_status="Perplexity:OK  Groq:standby",
        log_excerpt="Perplexity success. Evidence purification complete.",
        task_page_ids=["312f7a7da95e814f8ec9cd9bbb79eb8b"],
    )
"""
import os
import logging
import subprocess
from datetime import datetime, timezone, timedelta
from typing import Optional, List

logger = logging.getLogger(__name__)

NOTION_API_VERSION = "2022-06-28"
JST = timezone(timedelta(hours=9))


def _get_current_commit() -> str:
    """HEAD の短いコミットハッシュを返す。失敗時は空文字。"""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            capture_output=True, text=True, timeout=5,
            cwd=os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
        )
        return result.stdout.strip() if result.returncode == 0 else ""
    except Exception:
        return ""


class NotionEvidenceLedger:
    """D1 実行証拠を Evidence Ledger DB へ 1 行追記するシングルトン。"""

    def __init__(self):
        self._api_key: Optional[str] = None
        self._ledger_db_id: Optional[str] = None

    def _init(self):
        if self._api_key:
            return
        self._api_key = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
        self._ledger_db_id = os.getenv("NOTION_EVIDENCE_LEDGER_DB_ID", "")

    @property
    def enabled(self) -> bool:
        self._init()
        return bool(self._api_key and self._ledger_db_id)

    def log_d1_run(
        self,
        topic: str,
        status: str,                   # "成功" / "部分成功" / "失敗"
        obsidian_file: str = "",
        commit: str = "",
        api_status: str = "",
        log_excerpt: str = "",
        task_page_ids: Optional[List[str]] = None,
    ) -> Optional[str]:
        """
        Evidence Ledger に D1 実行レコードを 1 件作成する。
        作成した Notion ページ ID を返す（失敗時は None）。
        """
        self._init()
        if not self.enabled:
            logger.warning("[EvidenceLedger] not configured (missing API key or DB ID)")
            return None

        # コミットが渡されなければ HEAD から取得
        if not commit:
            commit = _get_current_commit()

        now_jst = datetime.now(JST)
        run_name = f"D1 Run {now_jst.strftime('%Y-%m-%d %H:%M')} – {topic[:40]}"

        props = {
            "Name": {
                "title": [{"text": {"content": run_name}}]
            },
            "実行日時": {
                "date": {"start": now_jst.isoformat()}
            },
            "Topic": {
                "rich_text": [{"text": {"content": topic[:2000]}}]
            },
            "ステータス": {
                "select": {"name": status}
            },
            "ログ抜粋": {
                "rich_text": [{"text": {"content": log_excerpt[:2000]}}]
            },
            "成果物名": {
                "rich_text": [{"text": {"content": obsidian_file[:200]}}]
            },
            "Commit": {
                "rich_text": [{"text": {"content": commit[:100]}}]
            },
            "外部API成否": {
                "rich_text": [{"text": {"content": api_status[:500]}}]
            },
        }

        if task_page_ids:
            props["タスク"] = {
                "relation": [{"id": pid} for pid in task_page_ids]
            }

        try:
            import requests
            resp = requests.post(
                "https://api.notion.com/v1/pages",
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Notion-Version": NOTION_API_VERSION,
                    "Content-Type": "application/json",
                },
                json={
                    "parent": {"database_id": self._ledger_db_id},
                    "properties": props,
                },
                timeout=15,
            )
            resp.raise_for_status()
            page_id = resp.json().get("id", "")
            logger.info(f"[EvidenceLedger] record created: {page_id} | {run_name}")
            return page_id
        except Exception as e:
            logger.error(f"[EvidenceLedger] log_d1_run failed: {e}")
            return None


# シングルトン
evidence_ledger = NotionEvidenceLedger()
