import os
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

def get_blocks(block_id, depth=0):
    text = ""
    prefix = "  " * depth
    try:
        blocks = notion.blocks.children.list(block_id=block_id)
        for block in blocks.get('results', []):
            b_type = block['type']
            content = ""
            if b_type in block and 'rich_text' in block[b_type]:
                content = "".join([t['plain_text'] for t in block[b_type]['rich_text']])
                if b_type == 'heading_1': text += f"\n# {content}\n"
                elif b_type == 'heading_2': text += f"\n## {content}\n"
                elif b_type == 'heading_3': text += f"\n### {content}\n"
                elif b_type == 'bulleted_list_item': text += f"{prefix}- {content}\n"
                elif b_type == 'numbered_list_item': text += f"{prefix}1. {content}\n"
                elif b_type == 'to_do':
                    checked = "x" if block[b_type].get('checked') else " "
                    text += f"{prefix}- [{checked}] {content}\n"
                else: text += f"{prefix}{content}\n"
            
            if block.get('has_children'):
                text += get_blocks(block['id'], depth + 1)
    except Exception as e:
        print(f"Error fetching blocks {block_id}: {e}")
    return text

pages = [
    ("312f7a7d-a95e-814f-8ec9-cd9bbb79eb8b", "sage_dev_pipeline_complete.md"),
    ("312f7a7d-a95e-8184-aecaf4dd5fb7fa2c", "notion_evidence_test_2.md"),
    ("312f7a7d-a95e-819c-8949-ea3239664670", "ai_tools_solopreneur.md")
]

for pid, filename in pages:
    print(f"Dumping {filename}...")
    content = get_blocks(pid)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(content)

print("Status check scripts completed.")
