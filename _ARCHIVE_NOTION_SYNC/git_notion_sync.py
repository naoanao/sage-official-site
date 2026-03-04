import os
import subprocess
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime, timedelta

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

# Block ID for Daily Log section in Notion
# This block is where the daily logs will be appended as children
DAILY_LOG_ID = "306f7a7d-a95e-80f9-bfa9-ee2b3d5a6e60"

def get_recent_commits(days=1):
    """Fetch git commits since the specified number of days."""
    since_date = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d")
    # Using 'utf-8' and ignoring potential errors to ensure smooth execution
    try:
        cmd = ["git", "log", f"--since={since_date}", "--pretty=format:- %ad: %s (%h)", "--date=short"]
        result = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
        if result.returncode != 0:
            return f"Error fetching git log: {result.stderr}"
        return result.stdout.strip()
    except Exception as e:
        return f"Exception during git log: {e}"

def sync_git_to_notion():
    print("🚀 Starting Git to Notion Daily Log Sync...")
    commits = get_recent_commits(days=1)
    
    if not commits:
        print("ℹ️ No new commits found in the last 24 hours. (Appending heartbeat instead)")
        commits = "No new commits today. System is active."

    today_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    
    # Structure the update: A timestamped heading followed by the commit log
    content_blocks = [
        {
            "object": "block",
            "type": "heading_3",
            "heading_3": {"rich_text": [{"type": "text", "text": {"content": f"📅 {today_str} 自動日報 (Git Sync)"}}]}
        },
        {
            "object": "block",
            "type": "code",
            "code": {
                "rich_text": [{"type": "text", "text": {"content": commits}}],
                "language": "markdown"
            }
        }
    ]
    
    try:
        # 1. Append the log as children of the Daily Log block
        notion.blocks.children.append(block_id=DAILY_LOG_ID, children=content_blocks)
        print("✅ Git sync complete. Logs appended to Notion.")
        
        # 2. Update the header block itself to reflect 'Active' status
        notion.blocks.update(
            block_id=DAILY_LOG_ID,
            bulleted_list_item={"rich_text": [{"type": "text", "text": {"content": "Notion日報化 [✅ Active]"}}]}
        )
        print("✅ Notion status updated to [Active].")
        
    except Exception as e:
        print(f"❌ Error syncing to Notion: {e}")

if __name__ == "__main__":
    sync_git_to_notion()
