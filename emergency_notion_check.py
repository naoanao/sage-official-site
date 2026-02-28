import os
import json
from notion_client import Client
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

try:
    print(f"Auditing Notion at {datetime.now().isoformat()}...")
    # Get the top 10 most recently edited objects
    response = notion.search(sort={"direction": "descending", "timestamp": "last_edited_time"})
    results = []
    
    for result in response.get("results", [])[:10]:
        title = "Untitled"
        if result['object'] == 'page':
            for prop in result.get('properties', {}).values():
                if prop['type'] == 'title' and prop.get('title'):
                    title = "".join([t['plain_text'] for t in prop['title']])
        elif result['object'] == 'database':
            if 'title' in result and result['title']:
                title = "".join([t['plain_text'] for t in result['title']])
        
        results.append({
            "id": result['id'],
            "title": title,
            "last_edited_time": result.get('last_edited_time'),
            "url": result.get('url')
        })
        
    print(json.dumps(results, indent=2, ensure_ascii=False))
    
    # Let's also retrieve the content of the top one immediately to be sure
    if results:
        top_id = results[0]['id']
        print(f"\n--- CONTENT OF TOP ITEM: {results[0]['title']} ({top_id}) ---")
        blocks = notion.blocks.children.list(block_id=top_id)
        for block in blocks.get('results', []):
            b_type = block['type']
            if b_type in block and 'rich_text' in block[b_type]:
                text = "".join([t['plain_text'] for t in block[b_type]['rich_text']])
                print(f"[{b_type}] {text}")

except Exception as e:
    print(f"Error: {e}")
