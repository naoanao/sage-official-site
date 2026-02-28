import os
from notion_client import Client
from dotenv import load_dotenv

load_dotenv()
notion = Client(auth=os.getenv("NOTION_API_KEY"))

def get_blocks(block_id, depth=0, max_depth=4):
    text = ""
    prefix = "  " * depth
    try:
        blocks = notion.blocks.children.list(block_id=block_id)
        for block in blocks.get('results', []):
            b_type = block['type']
            content = ""
            if b_type in block and 'rich_text' in block[b_type]:
                content = "".join([t['plain_text'] for t in block[b_type]['rich_text']])
            if b_type == 'heading_1':   text += f"\n# {content}\n"
            elif b_type == 'heading_2': text += f"\n## {content}\n"
            elif b_type == 'heading_3': text += f"\n### {content}\n"
            elif b_type == 'bulleted_list_item': text += f"{prefix}- {content}\n"
            elif b_type == 'numbered_list_item': text += f"{prefix}{content}\n"
            elif b_type == 'to_do':
                checked = "x" if block[b_type].get('checked') else " "
                text += f"{prefix}[{checked}] {content}\n"
            elif b_type == 'code':
                code = "".join([t['plain_text'] for t in block[b_type].get('rich_text', [])])
                text += f"```\n{code[:500]}\n```\n"
            elif b_type == 'child_page':
                title = block['child_page']['title']
                text += f"\n[PAGE: {title}] id={block['id']}\n"
            elif b_type == 'child_database':
                title = block['child_database']['title']
                text += f"\n[DB: {title}] id={block['id']}\n"
            elif content:
                text += f"{prefix}{content}\n"
            if block.get('has_children') and depth < max_depth and b_type not in ['child_page', 'child_database']:
                text += get_blocks(block['id'], depth + 1, max_depth)
    except Exception as e:
        text += f"[Error: {e}]\n"
    return text

# Step 1: Get most recently edited pages
print("=== 最近更新されたNotion項目 TOP20 ===")
response = notion.search(sort={"direction": "descending", "timestamp": "last_edited_time"}, page_size=20)
results = []
for result in response.get("results", []):
    title = "Untitled"
    if result['object'] == 'page':
        for prop in result.get('properties', {}).values():
            if prop['type'] == 'title' and prop.get('title'):
                title = "".join([t['plain_text'] for t in prop['title']])
    elif result['object'] == 'database':
        if result.get('title'):
            title = "".join([t['plain_text'] for t in result['title']])
    item = {
        "id": result['id'],
        "title": title,
        "type": result['object'],
        "last_edited": result.get('last_edited_time', '')
    }
    results.append(item)
    print(f"[{item['last_edited'][:16]}] {item['type']:8s} | {title[:60]}")

# Step 2: Read content of the sege main page (most recently edited)
print("\n\n=== sege メインページ 全コンテンツ ===")
sege_content = get_blocks("244f7a7d-a95e-804c-af09-d2cc57ab13db")
print(sege_content[:8000])

with open("notion_latest_full.txt", "w", encoding="utf-8") as f:
    f.write("=== TOP20 ===\n")
    for r in results:
        f.write(f"[{r['last_edited'][:16]}] {r['type']:8s} | {r['title']}\n")
    f.write("\n\n=== sege FULL CONTENT ===\n")
    f.write(sege_content)
print("\n\nSaved to notion_latest_full.txt")
