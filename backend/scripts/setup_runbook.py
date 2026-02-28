
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

# Force reload env
load_dotenv(override=True)

from backend.modules.notion_agent import NotionAgent

def setup_runbook():
    agent = NotionAgent()
    if not agent.enabled:
        print(f"Notion Agent is not enabled.")
        return

    # Use 'sege' page as parent
    parent_id = "244f7a7d-a95e-804c-af09-d2cc57ab13db"

    title = "Sage 3.0 Operational Runbook (Single Source of Truth)"
    
    content = """
# ⚠️ CRITICAL: SYSTEM BOOT METHOD
**起動方式：Windowsローカル（Python + npm）**
**Dockerは使わない（docker-compose手順は無効）**

---

## 🛠 1. 起動手順 (Windows)

### Backend (Flask API)
1. PowerShell または CMD を開く
2. `cd C:\\Users\\nao\\Desktop\\Sage_Final_Unified`
3. `run_sage.bat` を実行（ポート 8080 で起動）
   * または手動：`python -m backend.flask_server`

### Frontend (React/Vite)
* **開発時**: `npm run dev` (Viteサーバがポート 5173 等で起動)
* **本番反映**: 
  1. `npm run build` を実行
  2. Flask 起動時に `dist/` が読み込まれる

---

## ⚙️ 2. 環境設定
* **設定ファイル**: `.env` (API Keys, Obsidian Path, etc.)
* **最重要フラグ**: 
  * `PYTHONUTF8=1` (Windowsエンコード問題回避用)
  * `NOTION_API_KEY` (運用ログ同期用)

---

## 🧠 3. 知識統合ルール (Sage 3.0)
* **Memory Source of Truth**: `memorydb/` フォルダ（SQLite + ChromaDB）
* **Brain 学習**: QA PASS または「人間による手動承認」時のみパターンの feedback を実施
* **QA判断基準**:
  * セクション 3つ以上
  * 1セクション 200文字以上
  * プレースホルダー URL の不在

---

## 🛡 4. セキュリティ & 運用
* **人間承認 API**: ローカル IP (127.0.0.1/::1) からのみ許可。
* **履歴記録**: すべての「承認」「QA WARN」「汚染ブロック」は Notion の Evidence Ledger に実名で自動記録される。
"""

    try:
        result = agent.create_page(title, content, parent_page_id=parent_id)
        if result["status"] == "success":
            print(f"✅ Success: Runbook entry created. URL: {result.get('url')}")
        else:
            print(f"❌ Error: {result.get('message')}")
    except Exception as e:
        print(f"❌ Execution failed: {e}")

if __name__ == "__main__":
    setup_runbook()
