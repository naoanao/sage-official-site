import os
import json
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

try:
    print("Searching for ALL recent updates...")
    # Search without query to get everything sorted by time
    response = notion.search(sort={"direction": "descending", "timestamp": "last_edited_time"})
    results_out = []
    for result in response.get("results", [])[:20]:
        title = "Untitled"
        if result['object'] == 'page':
            for prop in result.get('properties', {}).values():
                if prop['type'] == 'title' and prop.get('title'):
                    title = "".join([t['plain_text'] for t in prop['title']])
        elif result['object'] == 'database':
            if 'title' in result and result['title']:
                title = "".join([t['plain_text'] for t in result['title']])
        
        results_out.append({
            "id": result['id'],
            "url": result.get('url'),
            "title": title,
            "object": result['object'],
            "last_edited_time": result.get('last_edited_time')
        })
    
    with open("notion_full_audit.json", "w", encoding="utf-8") as f:
        json.dump(results_out, f, ensure_ascii=False, indent=2)
    print(f"Audit completed: {len(results_out)} items found.")
except Exception as e:
    print(f"Error: {e}")
