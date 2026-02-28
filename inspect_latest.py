import os
import json
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

def inspect_page(page_id):
    try:
        page = notion.pages.retrieve(page_id=page_id)
        print(f"--- Page: {page_id} ---")
        # print(json.dumps(page, indent=2))
        
        blocks = notion.blocks.children.list(block_id=page_id)
        content = ""
        for block in blocks.get('results', []):
            b_type = block['type']
            if b_type in block and 'rich_text' in block[b_type]:
                text = "".join([t['plain_text'] for t in block[b_type]['rich_text']])
                content += f"[{b_type}] {text}\n"
        return content
    except Exception as e:
        return f"Error: {e}"

# The latest edited item according to audit was 312f7a7d-a95e-819c-8949-ea3239664670
latest_id = "312f7a7d-a95e-819c-8949-ea3239664670"
content = inspect_page(latest_id)
with open("latest_notion_content.txt", "w", encoding="utf-8") as f:
    f.write(content)

# Also check the second one just in case
second_id = "312f7a7d-a95e-8184-aecaf4dd5fb7fa2c"
content2 = inspect_page(second_id)
with open("latest_notion_content_2.txt", "w", encoding="utf-8") as f:
    f.write(content2)

print("Done inspecting.")
