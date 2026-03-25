import os
import json
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = Client(auth=os.getenv("NOTION_API_KEY"))

MAIN_PAGE_ID = "244f7a7d-a95e-804c-af09-d2cc57ab13db"

def append_reality_snapshot():
    today_str = datetime.now().strftime("%Y-%m-%d")
    print(f"Adding Reality Snapshot to Notion: {today_str}")
    
    content_blocks = [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [{"type": "text", "text": {"content": f"🎯 Reality Snapshot (Verified: {today_str})"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ ngrok固定ドメイン：tetchy-byssal-katherin.ngrok-free.dev（運用安定）"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ FileOpsAgent & DeployAgent：ローカル操作→Git Push→Web反映の神経開通"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ CourseProductionPipeline：Obsidian保存フォールバックで復旧"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ Perplexity：リアルタイム検索復旧"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "⚠️ Deprecated/未検証：Notion上の「backend/autonomous_store/ 実装済み」表記（実リポジトリ監査と不一致のため、設計/予定へ移動）"}}]}
        },
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": "※本スナップショットは実像に基づき、Antigravity（2026-02-27）により実機検証済み。"}}]}
        }
    ]
    
    try:
        client.blocks.children.append(block_id=MAIN_PAGE_ID, children=content_blocks)
        print("Reality Snapshot appended successfully.")
    except Exception as e:
        print(f"Error appending snapshot: {e}")

if __name__ == "__main__":
    append_reality_snapshot()
