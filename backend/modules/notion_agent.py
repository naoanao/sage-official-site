
import os
import sys
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

logger = logging.getLogger(__name__)

class NotionAgent:
    """
    Notion Agent for Sage 3.0 Operational SSOT.
    Separates 'Runbook' (Policy Page) from 'Evidence Ledger' (Log Database).
    """
    def __init__(self):
        self.client = None
        self.enabled = False
        self.api_key = os.getenv("NOTION_API_KEY")
        self.runbook_parent_id = os.getenv("NOTION_RUNBOOK_PARENT_PAGE_ID")
        self.evidence_db_id = os.getenv("NOTION_EVIDENCE_DB_ID")
        
        try:
            from notion_client import Client
            if self.api_key:
                self.client = Client(auth=self.api_key)
                self.enabled = True
                logger.info("🧠 Notion Agent: Operational Mode ENABLED.")
            else:
                logger.warning("⚠️ Notion Agent: DISABLED (NOTION_API_KEY missing).")
        except ImportError:
            logger.error("❌ Notion Agent: Failed to import notion-client.")

    def update_runbook(self, title: str, content: str) -> Dict[str, Any]:
        """
        Creates or updates the Operational Runbook page.
        Requires NOTION_RUNBOOK_PARENT_PAGE_ID.
        """
        if not self.enabled or not self.runbook_parent_id:
            msg = "Missing NOTION_API_KEY or NOTION_RUNBOOK_PARENT_PAGE_ID"
            logger.warning(f"Runbook update skipped: {msg}")
            return {"status": "skipped", "message": msg}

        try:
            # Note: For SAGE 3.0, we prioritize creating a clean record 
            # if parent is set. We don't search to avoid 'guessing' wrong pages.
            children = [{
                "object": "block",
                "type": "paragraph",
                "paragraph": {
                    "rich_text": [{"type": "text", "text": {"content": content[:2000]}}]
                }
            }]

            response = self.client.pages.create(
                parent={"page_id": self.runbook_parent_id},
                properties={
                    "title": [{"type": "text", "text": {"content": title}}]
                },
                children=children
            )
            logger.info(f"✅ Runbook Updated: {response['id']}")
            return {"status": "success", "id": response['id'], "url": response.get('url')}
        except Exception as e:
            logger.error(f"❌ Runbook Update Failed: {e}")
            return {"status": "error", "message": str(e)}

    def log_evidence(self, name: str, topic: str, status: str, log_excerpt: str = "", metadata: Dict = None) -> Dict[str, Any]:
        """
        Adds a single entry to the Evidence Ledger Database.
        Requires NOTION_EVIDENCE_DB_ID.
        """
        if not self.enabled or not self.evidence_db_id:
            msg = "Missing NOTION_API_KEY or NOTION_EVIDENCE_DB_ID"
            logger.warning(f"Evidence log skipped: {msg}")
            return {"status": "skipped", "message": msg}

        metadata = metadata or {}
        now_jst = datetime.now(timezone(timedelta(hours=9)))

        try:
            # Properties mapped to Sage 3.0 Standard Database Schema
            # Mandatory: Name, Topic, Status, Date
            props = {
                "Name": {"title": [{"text": {"content": name[:100]}}]},
                "Topic": {"rich_text": [{"text": {"content": topic[:2000]}}]},
                "ステータス": {"select": {"name": status}}, # mapped to 'Status' or 'ステータス'
                "実行日時": {"date": {"start": now_jst.isoformat()}},
                "ログ抜粋": {"rich_text": [{"text": {"content": log_excerpt[:2000]}}]}
            }

            # Add extra metadata if provided (e.g. Commit hash)
            if "commit" in metadata:
                props["Commit"] = {"rich_text": [{"text": {"content": metadata["commit"][:100]}}]}

            response = self.client.pages.create(
                parent={"database_id": self.evidence_db_id},
                properties=props
            )
            logger.info(f"📋 Evidence Recorded: {response['id']}")
            return {"status": "success", "id": response['id'], "url": response.get('url')}
        except Exception as e:
            logger.error(f"❌ Evidence Log Failed: {e}")
            # Fallback for mismatched property names (Title vs Name)
            try:
                if "title" not in props:
                    props["title"] = props.pop("Name")
                response = self.client.pages.create(
                    parent={"database_id": self.evidence_db_id},
                    properties=props
                )
                return {"status": "success", "id": response['id'], "url": response.get('url')}
            except:
                return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    # Test initialization
    agent = NotionAgent()
    print(f"Notion Agent Status: {'ENABLED' if agent.enabled else 'DISABLED'}")
