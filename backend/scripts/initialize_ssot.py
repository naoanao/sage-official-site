
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

# Force reload env
load_dotenv(override=True)

from backend.modules.notion_agent import NotionAgent

def initialize_ssot():
    agent = NotionAgent()
    if not agent.enabled:
        print("❌ Notion Agent is not enabled. Critical IDs or API Key missing.")
        return

    # 1. Update/Create Runbook Page
    runbook_title = "Sage 3.0 Operational Runbook (SSOT)"
    runbook_content = (
        "## ⚠️ SYSTEM BOOT METHOD\n"
        "起動方式：Windowsローカル (Python + npm)\n"
        "Docker不使用 (docker-compose手順は無効)\n\n"
        "## 🛠 PROCEDURES\n"
        "- Backend: run_sage.bat (Port 8080)\n"
        "- Frontend: npm run dev (Dev) / npm run build (Prod)\n\n"
        "## 🧠 KNOWLEDGE RULES\n"
        "- Input Source: research_*.md ONLY (Whitelist)\n"
        "- Memory Source: memorydb/ (SQLite + ChromaDB)\n\n"
        "## 🛡 QA GATE & OVERRIDE\n"
        "- QA PASS required for Brain feedback.\n"
        "- Manual Override: Local access only (127.0.0.1)."
    )
    
    print("🚀 Updating Operational Runbook...")
    runbook_res = agent.update_runbook(runbook_title, runbook_content)
    
    if runbook_res["status"] == "success":
        print(f"✅ Runbook Created/Updated: {runbook_res.get('url')}")
        
        # 2. Log entry in Evidence Ledger linked to Runbook
        print("📋 Recording SSOT Initialization in Evidence Ledger...")
        log_excerpt = f"SSOT established. Runbook URL: {runbook_res.get('url')}"
        ledger_res = agent.log_evidence(
            name="SSOT Initialization",
            topic="Operational Security",
            status="成功",
            log_excerpt=log_excerpt,
            metadata={"commit": "v3.0-ssot-fix"}
        )
        
        if ledger_res["status"] == "success":
            print(f"✅ Evidence Logged: {ledger_res.get('url')}")
        else:
            print(f"❌ Evidence Log Failed: {ledger_res.get('message')}")
    else:
        print(f"❌ Runbook Update Failed: {runbook_res.get('message')}")

if __name__ == "__main__":
    initialize_ssot()
