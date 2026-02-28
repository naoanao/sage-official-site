import os
import json
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

page_id = "312f7a7d-a95e-819c-8949-ea3239664670"
try:
    page = notion.pages.retrieve(page_id=page_id)
    print("PAGE PROPERTIES:")
    for name, prop in page['properties'].items():
        print(f"[{name}] ({prop['type']}):")
        if prop['type'] == 'rich_text':
            print("  " + "".join([t['plain_text'] for t in prop['rich_text']]))
        elif prop['type'] == 'title':
            print("  " + "".join([t['plain_text'] for t in prop['title']]))
        elif prop['type'] == 'select':
            print("  " + (prop['select']['name'] if prop['select'] else "None"))
        elif prop['type'] == 'status':
            print("  " + (prop['status']['name'] if prop['status'] else "None"))

    print("\nPAGE BLOCKS:")
    blocks = notion.blocks.children.list(block_id=page_id)
    for block in blocks.get('results', []):
        b_type = block['type']
        if b_type in block and 'rich_text' in block[b_type]:
            text = "".join([t['plain_text'] for t in block[b_type]['rich_text']])
            print(f"[{b_type}] {text}")

except Exception as e:
    print(f"Error: {e}")
