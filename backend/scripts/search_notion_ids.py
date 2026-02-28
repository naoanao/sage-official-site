
import os
import sys
from dotenv import load_dotenv

# Add project root to path
sys.path.append(os.getcwd())

# Force reload env
load_dotenv(override=True)

from backend.modules.notion_agent import NotionAgent

def search_notion():
    agent = NotionAgent()
    if not agent.enabled:
        print("Notion Agent is not enabled.")
        return

    try:
        # Search for all accessible objects
        response = agent.client.search()
        results = response.get("results", [])
        with open("notion_search_results.txt", "w", encoding="utf-8") as f:
            for res in results:
                obj_type = res.get("object")
                res_id = res['id']
                title = "Untitled"
                if obj_type == "database":
                    title = res.get("title", [{}])[0].get("plain_text", "Untitled")
                else:
                    props = res.get('properties', {})
                    for p in props.values():
                        if p.get('type') == 'title':
                            title = p.get('title', [{}])[0].get('plain_text', 'Untitled')
                            break
                out = f"- [{obj_type}] {title} (ID: {res_id})\n"
                print(out, end="")
                f.write(out)

    except Exception as e:
        print(f"Search failed: {e}")

if __name__ == "__main__":
    search_notion()
