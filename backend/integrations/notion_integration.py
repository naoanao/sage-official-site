import os
import opik
from typing import Dict, Any, List, Optional
from notion_client import Client
from notion_client.errors import APIResponseError

# Configure Opik
opik.configure(use_local=False)

class NotionIntegration:
    def __init__(self):
        self.name = "Notion Integration"
        self.api_key = os.getenv("NOTION_API_KEY")
        self.client = None
        if self.api_key:
            self.client = Client(auth=self.api_key)
        else:
            print("[Notion] Warning: NOTION_API_KEY not set.")

    def _ensure_client(self):
        if not self.client:
            raise RuntimeError("Notion API Key not configured.")

    @opik.track(name="notion_create_page")
    def create_page(self, title: str, content: str = "", parent_page_id: str = None) -> Optional[Dict[str, Any]]:
        self._ensure_client()
        
        # Default to a parent page ID from env if not provided
        if not parent_page_id:
            parent_page_id = os.getenv("NOTION_PAGE_ID")
            
        if not parent_page_id:
            print("[Notion] Error: No parent page ID provided.")
            return None

        print(f"[Notion] Creating page: {title}")
        try:
            children = []
            if content:
                # Simple paragraph block
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
            print(f"[Notion] Page created: {response['id']}")
            return response
        except APIResponseError as e:
            print(f"[Notion] API Error: {e}")
            return None

    @opik.track(name="notion_add_to_database")
    def add_to_database(self, database_id: str, properties: Dict[str, Any], content: str = None) -> Optional[Dict[str, Any]]:
        self._ensure_client()
        
        if not database_id:
            database_id = os.getenv("NOTION_DATABASE_ID")
            
        if not database_id:
             print("[Notion] Error: No database ID provided.")
             return None

        print(f"[Notion] Adding item to database: {database_id}")
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
                parent={"database_id": database_id},
                properties=properties,
                children=children
            )
            print(f"[Notion] Item added: {response['id']}")
            return response
        except APIResponseError as e:
            print(f"[Notion] API Error: {e}")
            return None

    @opik.track(name="notion_append_children")
    def append_children(self, block_id: str, children: List[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        self._ensure_client()
        print(f"[Notion] Appending {len(children)} blocks to {block_id}")
        try:
            response = self.client.blocks.children.append(
                block_id=block_id,
                children=children
            )
            return response
        except APIResponseError as e:
            print(f"[Notion] API Error: {e}")
            return None

# Singleton instance
notion_integration = NotionIntegration()
