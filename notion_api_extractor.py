import os
import shutil
from notion_client import Client
from dotenv import load_dotenv

def sanitize_filename(name):
    for char in ['<', '>', ':', '"', '/', '\\', '|', '?', '*']:
        name = name.replace(char, '_')
    return name.strip()

def extract_blocks_to_md(notion, block_id):
    md_content = ""
    has_more = True
    next_cursor = None
    
    while has_more:
        try:
            if next_cursor:
                response = notion.blocks.children.list(block_id=block_id, start_cursor=next_cursor)
            else:
                response = notion.blocks.children.list(block_id=block_id)
        except Exception as e:
            print(f"Error fetching blocks: {e}")
            break
            
        for block in response.get("results", []):
            b_type = block["type"]
            if b_type == "paragraph":
                rich_text = block["paragraph"].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                md_content += f"{text}\n\n"
            elif b_type.startswith("heading"):
                rich_text = block[b_type].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                level = int(b_type[-1])
                md_content += f"{'#' * level} {text}\n\n"
            elif b_type == "bulleted_list_item":
                rich_text = block[b_type].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                md_content += f"- {text}\n"
            elif b_type == "numbered_list_item":
                rich_text = block[b_type].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                md_content += f"1. {text}\n"
            elif b_type == "to_do":
                rich_text = block[b_type].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                checked = block[b_type].get("checked", False)
                checkbox = "[x]" if checked else "[ ]"
                md_content += f"- {checkbox} {text}\n"
            elif b_type == "child_page":
                pass # Handled in a separate pass
            elif b_type == "image":
                md_content += f"[Image omitted]\n\n"
            elif b_type == "code":
                rich_text = block["code"].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                language = block["code"].get("language", "")
                md_content += f"```{language}\n{text}\n```\n\n"
            elif b_type == "quote":
                rich_text = block["quote"].get("rich_text", [])
                text = "".join([t["plain_text"] for t in rich_text])
                md_content += f"> {text}\n\n"
                
        next_cursor = response.get("next_cursor")
        has_more = response.get("has_more")
        
    return md_content

def extract_page_recursive_api(notion, page_id, current_dir, page_title, depth, max_depth):
    if depth > max_depth:
        return
        
    print(f"{'  '*depth}Processing: {page_title} (Depth: {depth})")
    sanitized_title = sanitize_filename(page_title)
    
    # We will create a folder for this page to hold its content and sub-pages
    # At depth 0, we don't need an extra folder if base_dir is already 'notion_lectures'
    if depth == 0:
        page_dir = current_dir
    else:
        page_dir = os.path.join(current_dir, sanitized_title)
        if not os.path.exists(page_dir):
            os.makedirs(page_dir)
            
    md_content = extract_blocks_to_md(notion, page_id)
    
    file_name = f"{sanitized_title}.md" if depth > 0 else "Index.md"
    file_path = os.path.join(page_dir, file_name)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(f"# {page_title}\n\n")
        f.write(md_content)
        
    # Now find child pages
    has_more = True
    next_cursor = None
    child_pages = []
    
    while has_more:
        try:
            if next_cursor:
                response = notion.blocks.children.list(block_id=page_id, start_cursor=next_cursor)
            else:
                response = notion.blocks.children.list(block_id=page_id)
        except Exception as e:
            print(f"{'  '*depth}Error fetching child blocks: {e}")
            break
            
        for block in response.get("results", []):
            if block["type"] == "child_page":
                child_id = block["id"]
                child_title = block["child_page"]["title"]
                child_pages.append((child_id, child_title))
                
        next_cursor = response.get("next_cursor")
        has_more = response.get("has_more")
        
    for child_id, child_title in child_pages:
        extract_page_recursive_api(notion, child_id, page_dir, child_title, depth + 1, max_depth)


def main():
    load_dotenv()
    api_key = os.getenv("NOTION_API_KEY")
    if not api_key:
        print("No NOTION_API_KEY found.")
        return
        
    notion = Client(auth=api_key)
    
    base_dir = "notion_lectures"
    if os.path.exists(base_dir):
        print(f"Deleting old directory: {base_dir}")
        try:
            shutil.rmtree(base_dir)
        except Exception as e:
            print(f"Error deleting {base_dir}: {e}")
            
    os.makedirs(base_dir, exist_ok=True)
    
    root_page_id = "34af7a7da95e80aba3f6cc6092cab49e"
    
    # Get the title of the root page
    try:
        root_page = notion.pages.retrieve(root_page_id)
        root_title = root_page["properties"]["title"]["title"][0]["plain_text"]
    except Exception as e:
        print(f"Failed to get root page: {e}")
        root_title = "講座"
    
    extract_page_recursive_api(notion, root_page_id, base_dir, root_title, depth=0, max_depth=4)
    print("Done!")

if __name__ == "__main__":
    main()
