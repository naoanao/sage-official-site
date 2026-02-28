import os
import json
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
client = Client(auth=os.getenv("NOTION_API_KEY"))

# Block IDs for HP Spec Sheet
SEC_7_ID = "306f7a7d-a95e-8099-bb65-d133b14b4d16" # 7. 隠された高度機能
SEC_7_2_ID = "306f7a7d-a95e-8000-8afd-fc2a6ce45cf6" # 7.2 自律型ストア
DAILY_LOG_ID = "306f7a7d-a95e-80f9-bfa9-ee2b3d5a6e60" # Notion日報化 (git sync)
MEM0_ID = "306f7a7d-a95e-80fc-beb6-e46b16b2a03b" # Vector Database (Mem0)

def prune_notion():
    print("Pruning Notion of discrepancies...")
    
    try:
        # 1. Update Section 7 Header
        client.blocks.update(
            block_id=SEC_7_ID,
            heading_2={"rich_text": [{"type": "text", "text": {"content": "7. 高度機能（開発・検証フェーズ）"}}]}
        )
        print("Updated Section 7 header.")

        # 2. Mark 7.2 Autonomous Store as Planned
        client.blocks.update(
            block_id=SEC_7_2_ID,
            heading_2={"rich_text": [{"type": "text", "text": {"content": "7.2 自律型ストア [🛠️ Planned]"}}]}
        )
        print("Updated 7.2 as Planned.")

        # 3. Mark Daily Log Sync as Planned
        client.blocks.update(
            block_id=DAILY_LOG_ID,
            bulleted_list_item={"rich_text": [{"type": "text", "text": {"content": "Notion日報化 [🛠️ Planned: git_notion_sync.py 欠損のため]"}}]}
        )
        print("Updated Daily Log sync as Planned.")

        # 4. Mark Mem0 as Deprecated
        client.blocks.update(
            block_id=MEM0_ID,
            bulleted_list_item={"rich_text": [{"type": "text", "text": {"content": "Vector Database (Mem0) [⚠️ Deprecated: SageMemoryへ統合済み]"}}]}
        )
        print("Updated Mem0 as Deprecated.")

    except Exception as e:
        print(f"Error pruning Notion: {e}")

if __name__ == "__main__":
    prune_notion()
