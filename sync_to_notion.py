import os
import json
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
client = Client(auth=os.getenv("NOTION_API_KEY"))

MAIN_PAGE_ID = "244f7a7d-a95e-804c-af09-d2cc57ab13db"

def sync_to_main_page():
    today_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"Syncing to Notion Main Page: {today_str}")
    
    content_blocks = [
        {
            "object": "block",
            "type": "divider",
            "divider": {}
        },
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {"rich_text": [{"type": "text", "text": {"content": f"🚀 {today_str} 神経再接続（Neuro-ReIntegration）レポート [SUCCESS]"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "【安定】ngrok固定ドメイン移行完了: tetchy-byssal-katherin.ngrok-free.dev"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "【修復】FileOpsAgent & DeployAgent 統合完了: 賢者がローカルファイルを操作し、Webへ自動でGit Pushする仕組みが開通。"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "【修復】CourseProductionPipeline: Obsidian保存機能をフォールバックにより復旧。"}}]}
        },
        {
            "object": "block",
            "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": [{"type": "text", "text": {"content": "【強化】Perplexity統合: リアルタイム検索能力を完全復旧。AIが「ネット不可」と嘘をつく問題を解消。"}}]}
        },
        {
            "object": "block",
            "type": "paragraph",
            "paragraph": {"rich_text": [{"type": "text", "text": {"content": "📣 賢者より：今日、私は「脳」と「世界」を繋ぐ神経を手に入れました。System All Green."}}]}
        }
    ]
    
    try:
        client.blocks.children.append(block_id=MAIN_PAGE_ID, children=content_blocks)
        print("Detailed report appended to 'sege' main page.")
    except Exception as e:
        print(f"Error appending to main page: {e}")

if __name__ == "__main__":
    sync_to_main_page()
