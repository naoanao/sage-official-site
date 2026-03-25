import os
import json
import logging
import sys
import time
from unittest.mock import MagicMock

# Ensure backend folder is in path
sys.path.append(os.path.abspath("."))

from backend.modules.autonomous_adapter import AutonomousAdapter
from backend.modules.browser_agent import BrowserAgent

# Setup
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("TestD1Trends")

def test_d1_with_trends():
    # Mocking components to avoid missing dependency errors in large classes
    memory = MagicMock()
    orchestrator = MagicMock()
    orchestrator.browser_agent = BrowserAgent()
    
    adapter = AutonomousAdapter(orchestrator, memory)
    
    # Enable execution
    adapter.phase_2_execute = True
    
    # Test Topic
    topic = "AI Influencer Trends 2026 Japan"
    
    # Mock a decision for research
    decision = {
        "type": "research_ai_trends",
        "data": {"topic": topic}
    }
    
    print(f"\n--- 🚀 Triggering D1 Research with Trends for '{topic}' ---")
    adapter._execute_decision(decision)
    
    print("\n--- 🏁 Test Complete ---")
    
    # Check if file was created
    import pathlib
    vault_dir = pathlib.Path("obsidian_vault/knowledge")
    latest_research = sorted(vault_dir.glob("research_*.md"), key=os.path.getmtime, reverse=True)
    
    if latest_research:
        print(f"✅ Success! Report created: {latest_research[0]}")
        with open(latest_research[0], 'r', encoding='utf-8') as f:
            content = f.read()
            if "📊 Search Trend Evidence" in content:
                print("✅ Trends Evidence found in report!")
                # Print a snippet of the trends part
                start = content.find("📊 Search Trend Evidence")
                print(f"\nSnippet:\n{content[start:start+500]}...")
            else:
                print("❌ Trends Evidence MISSING from report.")
    else:
        print("❌ No research file was created.")

if __name__ == "__main__":
    test_d1_with_trends()
