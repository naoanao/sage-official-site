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
        print(f"Error fetching blocks: {e}")
    return text

try:
    content = get_blocks("306f7a7d-a95e-809a-b118-ecb81b3bb047")
    with open("sage_3_hp.md", "w", encoding="utf-8") as f:
        f.write("# SAGE 3.0 ホームページ完全仕様書\n\n")
        f.write(content)
    print("Done")
except Exception as e:
    print(f"Error: {e}")
