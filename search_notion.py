import os
import json
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

try:
    print("Searching Notion...")
    response = notion.search(query="SAGE 3.0", sort={"direction": "descending", "timestamp": "last_edited_time"})
    with open("notion_out_safe.json", "w", encoding="utf-8") as f:
        results_out = []
        for result in response.get("results", [])[:5]:
            title = ""
            if result['object'] == 'page':
                for prop in result.get('properties', {}).values():
                    if prop['type'] == 'title' and prop.get('title'):
                        title = "".join([t['plain_text'] for t in prop['title']])
            results_out.append({
                "id": result['id'],
                "url": result.get('url'),
                "title": title
            })
        json.dump(results_out, f, ensure_ascii=False, indent=2)
except Exception as e:
    print(f"Error: {e}")
