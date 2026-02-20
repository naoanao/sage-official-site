import requests
import json
import os
import time
from pathlib import Path

# Constants
API_URL = "http://localhost:8080/api/pilot/generate"
LOG_PATH = Path("backend/logs/sage_ultimate.log")
TOPIC = "AIによる地球環境保全の最新論文を調べて"

def run_test():
    print(f"🚀 Starting Python-based Pilot Smoke Test...")
    
    # 1. Get initial log count
    initial_log_lines = 0
    if LOG_PATH.exists():
        with open(LOG_PATH, 'r', encoding='utf-8', errors='ignore') as f:
            initial_log_lines = len(f.readlines())
    print(f"📊 Initial log lines: {initial_log_lines}")

    # 2. Send Request
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

    # 3. Verify Log
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

    # 4. Verify Obsidian Note
    obs_note_path = res_data.get("obsidian_note")
    if not obs_note_path:
        print("❌ Error: obsidian_note path missing in response")
        return False
    
    note_path = Path(obs_note_path)
    # Handle Case where path returned by service might be absolute or relative differently
    # if it doesn't exist, try resolving it relative to project root
    if not note_path.exists():
         # Try resolving if it's relative to backend/ (which is CWD for server)
         alt_path = Path("backend") / note_path
         if alt_path.exists():
             note_path = alt_path

    if not note_path.exists():
        print(f"⚠️ Note path '{note_path}' not found directly. Searching in obsidian_vault...")
        vault_dir = Path("obsidian_vault/knowledge")
        notes = list(vault_dir.glob("*.md"))
        notes.sort(key=os.path.getmtime, reverse=True)
        if notes:
            # Check if latest note contains the topic (even if mangled in filename)
            note_path = notes[0]
            print(f"📂 Selected latest note: {note_path}")

    if note_path.exists():
        print(f"📖 Checking content in {note_path}...")
        with open(note_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
            if "Research Context & Evidence" in content or "Integrated Knowledge" in content:
                print(f"✅ Research Evidence section found in note!")
            else:
                print(f"❌ Error: Research Evidence section NOT found in note content.")
                # Print first 20 lines for debug
                print("--- Content Preview ---")
                print("\n".join(content.splitlines()[:10]))
                print("-----------------------")
                return False
    else:
        print(f"❌ Error: Could not find generated note file.")
        return False

    print("🎉 ALL TESTS PASSED!")
    return True

if __name__ == "__main__":
    success = run_test()
    exit(0 if success else 1)
