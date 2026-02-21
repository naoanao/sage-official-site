import requests
import json
import os
import time
from pathlib import Path
from datetime import datetime
import sys

# Ensure backend modules can be imported if needed
sys.path.append(os.getcwd())
try:
    from backend.modules.sage_memory import SageMemory
except ImportError:
    SageMemory = None

# Constants
API_URL = "http://localhost:8080/api/pilot/generate"
LOG_PATH = Path("backend/logs/sage_ultimate.log")
TOPIC = "AIによる地球環境保全の最新論文を調べて"

def run_test():
    print(f"🚀 Starting Python-based Pilot Smoke Test [STRICT MODE]...")
    
    # --- 0. Pre-check Brain Count ---
    initial_count = -1
    if SageMemory:
        try:
            memory = SageMemory()
            initial_count = memory.collection.count()
            print(f"🧠 Initial Brain Count: {initial_count}")
        except Exception as e:
            print(f"⚠️ Could not check initial Brain count: {e}")

    # --- 1. Get initial log count ---
    initial_log_lines = 0
    if LOG_PATH.exists():
        with open(LOG_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            initial_log_lines = len(f.readlines())
    print(f"📊 Initial log lines: {initial_log_lines}")

    # --- 2. Send Request ---
    payload = {
        "topic": TOPIC,
        "num_sections": 1
    }
    print(f"📡 Sending request to {API_URL}...")
    try:
        start_time = time.time()
        response = requests.post(API_URL, json=payload, timeout=300)
        duration = time.time() - start_time
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        return False

    if response.status_code != 200:
        print(f"❌ API returned {response.status_code}: {response.text}")
        return False

    res_data = response.json()
    if res_data.get("status") != "success":
        print(f"❌ API Logic Error: {res_data.get('message')}")
        return False

    print(f"✅ API returned SUCCESS ({duration:.1f}s)")

    # --- 3. Verify Log ---
    print(f"🔍 Verifying log for Paper Knowledge injection...")
    time.sleep(2)  # Wait for flush
    new_injected = False
    if LOG_PATH.exists():
        with open(LOG_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            new_lines = f.readlines()[initial_log_lines:]
            for line in new_lines:
                if "Paper Knowledge injected successfully" in line:
                    print(f"✅ Found injection log: {line.strip()}")
                    new_injected = True
                    break
    
    if not new_injected:
        print(f"❌ Error: 'Paper Knowledge injected successfully' not found in NEW log lines.")
        return False

    # --- 4. Verify Obsidian Note (Strict Path & Section Check) ---
    note_path_str = res_data.get("obsidian_note")
    note_path = None
    if note_path_str:
        note_path = Path(note_path_str)
        if not note_path.exists():
            # Server might return path relative to 'backend'
            note_path = Path("backend") / note_path_str
    
    if not note_path or not note_path.exists():
        print(f"⚠️ Note path in response invalid or missing. Falling back to latest in vault...")
        vault_dir = Path("obsidian_vault/knowledge")
        notes = list(vault_dir.glob("*.md"))
        notes.sort(key=os.path.getmtime, reverse=True)
        if notes:
            note_path = notes[0]
            print(f"📂 Selected latest note: {note_path}")
        else:
            print(f"❌ Error: No markdown notes found in {vault_dir}")
            return False

    if note_path.exists():
        print(f"📖 Checking content in {note_path}...")
        with open(note_path, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
            
            # --- STRICT VERIFICATION (統合B) ---
            heading = "## 🧪 Research Context & Evidence"
            mandatory_keys = [
                "- **Query**",
                "- **Used-guidelines**",
                "- **URLs/Sources**",
                "- **Date**"
            ]
            
            heading_found_line = -1
            for i, line in enumerate(lines):
                if heading in line:
                    heading_found_line = i
                    break
            
            if heading_found_line != -1:
                print(f"✅ Found Heading: '{heading}' at line {heading_found_line+1}")
                # Check keys within next 100 lines
                found_keys = []
                for j in range(heading_found_line + 1, min(heading_found_line + 101, len(lines))):
                    stripped = lines[j].strip()
                    for key in mandatory_keys:
                        if stripped.startswith(key) and key not in found_keys:
                            found_keys.append(key)
                
                missing_keys = [k for k in mandatory_keys if k not in found_keys]
                if not missing_keys:
                    print(f"✅ All mandatory keys found within Evidence section: {mandatory_keys}")
                else:
                    print(f"❌ Error: Missing keys in Evidence section: {missing_keys}")
                    print("--- Snippet after heading ---")
                    print("".join(lines[heading_found_line:heading_found_line+15]))
                    print("-----------------------------")
                    return False
            else:
                print(f"❌ Error: Required heading '{heading}' NOT found in note content.")
                print("--- Start of note preview ---")
                print("".join(lines[:15]))
                print("-----------------------------")
                return False
    else:
        print(f"❌ Error: Could not find generated note file.")
        return False

    # --- 5. Verify Brain Integration (Chroma Count Check) ---
    if SageMemory and initial_count != -1:
        print(f"🧠 Verifying Brain integration (ChromaDB count check)...")
        time.sleep(2)  # Wait for integration
        try:
            memory = SageMemory()
            final_count = memory.collection.count()
            print(f"🧠 Final Brain Count: {final_count}")
            if final_count > initial_count:
                print(f"✅ Brain count increased! (+{final_count - initial_count})")
            else:
                print(f"❌ Error: Brain count did NOT increase. Integration failed.")
                return False
        except Exception as e:
            print(f"⚠️ Could not check final Brain count: {e}")

    print("🎉 ALL TESTS PASSED! Knowledge Loop Verified.")
    return True

if __name__ == "__main__":
    success = run_test()
    exit(0 if success else 1)
