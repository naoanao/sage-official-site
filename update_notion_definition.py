import os
import json
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = Client(auth=os.getenv("NOTION_API_KEY"))

PAGE_ID = "300f7a7d-a95e-8117-bce0-d95b9808441f"
QUOTE_BLOCK_ID = "8e747a9b-7da5-4280-84c9-c32fbce85c0f"

def update_definition():
    new_quote = (
        "「単なるチャットボットを超え、ローカルPCの強大な実行権限（OS制御）とクラウドの自律性を『恒久的神経（ngrok Static Tunnel）』で融合した、完全自律型AI経済OS。 "
        "自らPerplexityで市場を洞察し、自らコードを修復（Self-Healing）し、自ら商品を生成してGitHub/Webへデプロイする。 "
        "24時間365日、記憶を蓄積しながら自己進化を続ける、物理世界とデジタル空間の架け橋となるデジタル・ソロプレナー。」"
    )
    
    try:
        # Update the main quote (ensure clean text)
        client.blocks.update(
            block_id=QUOTE_BLOCK_ID,
            quote={
                "rich_text": [
                    {
                        "type": "text",
                        "text": {"content": new_quote}
                    }
                ]
            }
        )
        print("Main definition updated.")
        
        # Append a clean summary to the page
        summary_blocks = [
            {
                "object": "block",
                "type": "heading_2",
                "heading_2": {"rich_text": [{"type": "text", "text": {"content": "📍 現状のSage 3.0：Neuro-ReIntegration (2026-02-27)"}}]}
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "🧠 脳 (Brain): LangGraph Orchestrator v2 + Neuromorphic Memory"}}]}
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "⚡ 神経 (Nerve): Stable ngrok Static Domain (tetchy-byssal-katherin.ngrok-free.dev)"}}]}
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "🖐 手 (Hands): FileOpsAgent (OS操作) + DeployAgent (Web公開自動化)"}}]}
            },
            {
                "object": "block",
                "type": "bulleted_list_item",
                "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "👁 視覚 (Vision): Perplexity 2.5 API リアルタイム検索"}}]}
            }
        ]
        
        client.blocks.children.append(block_id=PAGE_ID, children=summary_blocks)
        print("Tech Stack summary appended.")
        
    except Exception as e:
        print(f"Error during Notion update: {e}")

if __name__ == "__main__":
    update_definition()
