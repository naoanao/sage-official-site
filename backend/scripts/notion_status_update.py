
import sys
import os
import logging

# Ensure project root is in path
sys.path.append(os.getcwd())

from backend.modules.notion_agent import NotionAgent
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("NotionUpdate")

def update_status():
    agent = NotionAgent()
    
    title = f"Fix: Sage 3.0 Knowledge Pipeline Reconnected - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
    content = """
    ### Summary of Fixes:
    1. **Memory Unification**: Legacy MemoryAgent is now a wrapper for SageMemory (Source of Truth: memorydb/).
    2. **QA Gate Activated**: Automation now checks for quality and IP risks.
    3. **Brain Learning Restored**: provide_feedback() wired to generation loop (PASS only).
    4. **Contamination Guard**: Blocked non-research files from content context.
    5. **Windows Fix**: PYTHONUTF8=1 applied.
    
    **Status: SYSTEM READY**
    """
    
    try:
        # Assuming we want to add a page to a set parent or DB
        db_id = os.getenv("NOTION_EVIDENCE_LEDGER_DB_ID")
        if db_id:
            logger.info(f"Adding entry to Evidence Ledger: {db_id}")
            agent.add_to_database(db_id, {"Name": {"title": [{"text": {"content": title}}]}}, content)
        else:
            logger.info("No DB ID found, creating standalone page...")
            agent.create_page(title, content)
        
        print("SUCCESS: Notion status updated.")
    except Exception as e:
        print(f"FAILED: {e}")

if __name__ == "__main__":
    update_status()
