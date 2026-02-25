import os
import logging
import requests as _requests
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.modules.notion_agent import NotionAgent

NOTION_API_VERSION = "2022-06-28"

logger = logging.getLogger("NotionContentPool")

class NotionContentPool:
    """
    Manages the 'SNS Content Pool' in Notion.
    """
    def __init__(self, database_id: Optional[str] = None):
        self.notion = NotionAgent()
        self.db_id = database_id or os.getenv("NOTION_CONTENT_POOL_DB_ID", "911034c12d2a4e52ab7a4fd27db423b0")
        
    def get_ready_content(self, limit: int = 1) -> List[Dict[str, Any]]:
        """
        Fetch items with Status='予約済み' (READY) or equivalent.
        """
        if not self.notion.enabled:
            logger.warning("Notion Agent disabled. Cannot fetch content.")
            return []

        try:
            # Querying for Status that marks content as ready for SNS
            query_body = {
                "filter": {
                    "or": [
                        {"property": "Status", "select": {"equals": "予約済み"}},
                        {"property": "Status", "select": {"equals": "Ready"}},
                    ]
                },
                "page_size": limit,
            }
            api_key = os.getenv("NOTION_API_KEY")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": NOTION_API_VERSION,
                "Content-Type": "application/json",
            }
            resp = _requests.post(
                f"https://api.notion.com/v1/databases/{self.db_id}/query",
                headers=headers,
                json=query_body,
            )
            resp.raise_for_status()
            response = resp.json()
            results = []
            
            for page in response.get("results", []):
                props = page.get("properties", {})
                
                # Title
                topic = ""
                title_prop = props.get("Topic") or props.get("Name") or props.get("タスク名")
                if title_prop and title_prop.get("title"):
                    topic = "".join([t.get("plain_text", "") for t in title_prop["title"]])
                
                # Content
                content = ""
                content_prop = props.get("Content") or props.get("Memo") or props.get("メモ")
                if content_prop and content_prop.get("rich_text"):
                    content = "".join([t.get("plain_text", "") for t in content_prop["rich_text"]])

                # Image Prompt
                img_prompt = ""
                img_prop = props.get("ImagePrompt") or props.get("Prompt") or props.get("画像プロンプト")
                if img_prop and img_prop.get("rich_text"):
                    img_prompt = "".join([t.get("plain_text", "") for t in img_prop["rich_text"]])

                results.append({
                    "id": page["id"],
                    "url": page.get("url"),
                    "topic": topic,
                    "content": content,
                    "image_prompt": img_prompt or topic,
                    "category": props.get("Category", {}).get("select", {}).get("name", "General")
                })
            
            return results
        except Exception as e:
            logger.error(f"Failed to fetch content from Notion: {e}")
            return []

    def add_topic(self, title: str, category: str = "blog", status: str = "予約済み") -> bool:
        """Add a new topic to the Notion content pool."""
        try:
            api_key = os.getenv("NOTION_API_KEY") or os.getenv("NOTION_TOKEN")
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Notion-Version": NOTION_API_VERSION,
                "Content-Type": "application/json",
            }
            resp = _requests.post(
                "https://api.notion.com/v1/pages",
                headers=headers,
                json={
                    "parent": {"database_id": self.db_id},
                    "properties": {
                        "Topic": {"title": [{"text": {"content": title}}]},
                        "Status": {"select": {"name": status}},
                        "Category": {"select": {"name": category}},
                    }
                },
                timeout=10,
            )
            resp.raise_for_status()
            logger.info(f"✅ Topic added to Notion: '{title}' [{category}]")
            return True
        except Exception as e:
            logger.error(f"Failed to add topic to Notion: {e}")
            return False

    def mark_as_posted(self, page_id: str):
        """Update Status to '完了' or 'Posted'."""
        if not self.notion.enabled: return
        
        try:
            # Try different property names for status
            status_prop = "Status"
            # Actually we should try to detect which one exists, but for now we try a common one
            self.notion.client.pages.update(
                page_id=page_id,
                properties={
                    "Status": {"select": {"name": "完了"}}
                }
            )
            logger.info(f"✅ Notion item {page_id} marked as POSTED.")
        except Exception as e:
            logger.error(f"Failed to update Notion status: {e}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    pool = NotionContentPool()
    ready = pool.get_ready_content()
    print(f"Items Ready: {len(ready)}")
