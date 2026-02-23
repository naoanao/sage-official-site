import os
import json
import logging
import sys
from unittest.mock import MagicMock

# Ensure backend folder is in path
sys.path.append(os.path.abspath("."))

from backend.modules.autonomous_adapter import AutonomousAdapter

# Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestD3Draft")

def test_d3_draft():
    memory = MagicMock()
    orchestrator = MagicMock()
    adapter = AutonomousAdapter(orchestrator, memory)
    adapter.phase_2_execute = True
    
    topic = "AI Monetization 2026"
    decision = {
        "type": "draft_social_post",
        "data": {"topic": topic}
    }
    
    print(f"\n--- 🚀 Triggering D3 Social Drafting for '{topic}' ---")
    adapter._execute_decision(decision)
    
    # Check if file was created
    import pathlib
    draft_dir = pathlib.Path("obsidian_vault/drafts")
    latest_draft = sorted(draft_dir.glob("draft_*.md"), key=os.path.getmtime, reverse=True)
    
    if latest_draft:
        print(f"✅ Success! Draft created: {latest_draft[0]}")
        with open(latest_draft[0], 'r', encoding='utf-8') as f:
            content = f.read()
            print(f"\nDraft Content:\n{content}")
    else:
        print("❌ No draft file was created.")

if __name__ == "__main__":
    test_d3_draft()
