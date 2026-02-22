import os
import sys
import logging
from typing import Dict, Any, List, Optional

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class NotionAgent:
    """
    Notion Agent for managing pages and databases.
    """
    def __init__(self):
        self.client = None
        self.enabled = False
        self.api_key = os.getenv("NOTION_API_KEY")
        
        try:
            from notion_client import Client
            if self.api_key:
                self.client = Client(auth=self.api_key)
                self.enabled = True
                logger.info("Notion Agent initialized.")
            else:
                logger.warning("NOTION_API_KEY not found. Notion Agent disabled.")
        except ImportError:
            logger.error("notion-client library not found.")
        except Exception as e:
            logger.error(f"Notion Agent Init Failed: {e}")

    def create_page(self, title: str, content: str = "", parent_page_id: str = None):
        """Create a new page in Notion."""
        if not self.enabled:
            return {"status": "error", "message": "Notion Agent disabled"}

        # Use env var if parent_id not provided
        if not parent_page_id:
            parent_page_id = os.getenv("NOTION_PAGE_ID")
            
        if not parent_page_id:
            return {"status": "error", "message": "No Parent Page ID provided"}

        try:
            children = []
            if content:
                children.append({
                    "object": "block",
                    "type": "paragraph",
                    "paragraph": {
                        "rich_text": [{"type": "text", "text": {"content": content}}]
                    }
                })

            response = self.client.pages.create(
                parent={"page_id": parent_page_id},
                properties={
                    "title": [
                        {"type": "text", "text": {"content": title}}
                    ]
                },
                children=children
            )
            return {"status": "success", "id": response['id'], "url": response.get('url')}
        except Exception as e:
            logger.error(f"Create Page Failed: {e}")
            return {"status": "error", "message": str(e)}

    def add_todo(self, task: str, database_id: str = None):
        """Add a To-Do item to a database."""
        if not self.enabled:
            return {"status": "error", "message": "Notion Agent disabled"}

        if not database_id:
            database_id = os.getenv("NOTION_DATABASE_ID")
            
        if not database_id:
            return {"status": "error", "message": "No Database ID provided"}

        try:
            response = self.client.pages.create(
                parent={"database_id": database_id},
                properties={
                    "Name": {"title": [{"text": {"content": task}}]},
                    "Status": {"status": {"name": "Not started"}} # Assuming standard status property
                }
            )
            return {"status": "success", "id": response['id'], "url": response.get('url')}
        except Exception as e:
            logger.error(f"Add Todo Failed: {e}")
            return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("📝 Starting NotionAgent Self-Test...")
    agent = NotionAgent()
    
    if agent.enabled:
        print("✅ Notion Client is ready.")
        # We won't actually create a page in self-test to avoid spamming, 
        # unless user explicitly wants to test connectivity.
        # Just checking initialization is good for now.
    else:
        print("⚠️ Notion Agent is disabled (Check API Key).")
