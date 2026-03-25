import os
import json
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = Client(auth=os.getenv("NOTION_API_KEY"))

# HP Spec Sheet Page ID
HP_SPEC_PAGE_ID = "306f7a7d-a95e-809a-b118-ecb81b3bb047"

def append_reality_snapshot_hp():
    today_str = datetime.now().strftime("%Y-%m-%d")
    print(f"Adding Reality Snapshot to HP Spec Sheet: {today_str}")
    
    content_blocks = [
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
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
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ FileOpsAgent & DeployAgent：神経開通済み。OS操作とWeb公開を自律実行可能。"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ CourseProductionPipeline：修復完了。Obsidian Vaultへの保存を検証済み。"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "✅ Perplexity：API統合によりリアルタイム検索を正常化。"}}]}
        },
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": "上記以外の『実装済み』表記は過去の構想に基づくものであり、実機との不一致を確認した場合は随時 Reality Snapshot を優先します。"}}] }
        }
    ]
    
    try:
        client.blocks.children.append(block_id=HP_SPEC_PAGE_ID, children=content_blocks)
        print("Reality Snapshot appended to HP Spec Sheet.")
    except Exception as e:
        print(f"Error appending snapshot: {e}")

if __name__ == "__main__":
    append_reality_snapshot_hp()
