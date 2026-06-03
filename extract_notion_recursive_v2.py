import os
import time
import shutil
from playwright.sync_api import sync_playwright

def sanitize_filename(name):
    # remove invalid characters for windows filenames
    for char in ['<', '>', ':', '"', '/', '\\', '|', '?', '*']:
        name = name.replace(char, '_')
    return name.strip()

def extract_page_recursive(page, current_url, current_dir, depth, max_depth, visited):
    if depth > max_depth:
        return
    
    # Clean the URL to ignore # fragments
    clean_url = current_url.split('#')[0]
    if clean_url in visited:
        return
    visited.add(clean_url)

    print(f"{'  '*depth}Navigating to: {current_url} (Depth: {depth})")
    try:
        page.goto(current_url, timeout=30000)
        page.wait_for_selector(".notion-page-content", timeout=15000)
        time.sleep(3) # Wait for dynamic rendering
    except Exception as e:
        print(f"{'  '*depth}Failed to load {current_url}: {e}")
        return

    # Extract title
    try:
        # The main title of the page is often in a specific block
        title_element = page.locator("div.notion-page-block > div[contenteditable='false']").first
        page_title = title_element.inner_text().strip()
    except Exception:
        page_title = "Untitled"
        
    if not page_title:
        # Fallback to document title
        page_title = page.title()
        if page_title:
            page_title = page_title.replace("Notion", "").strip(" -|")
        else:
            page_title = "Untitled"
        
    sanitized_title = sanitize_filename(page_title)
    
    # Save content of the current page
    try:
        content = page.locator(".notion-page-content").inner_text()
    except Exception as e:
        print(f"{'  '*depth}Failed to extract content for {page_title}: {e}")
        content = "Failed to extract content."
    
    # If it's depth 0, we don't need a folder for "Untitled" if it gets it wrong, 
    # we just use base_dir.
    if depth == 0:
        page_dir = current_dir
    else:
        page_dir = os.path.join(current_dir, sanitized_title)
        if not os.path.exists(page_dir):
            os.makedirs(page_dir)
            
    file_path = os.path.join(page_dir, f"{sanitized_title}.md" if depth > 0 else "Index.md")
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(f"# {page_title}\n\n")
        f.write(content)
        
    print(f"{'  '*depth}Saved content to {file_path}")

    # Find sub-pages
    try:
        sub_elements = page.locator(".notion-page-content a.notion-link").all()
        sub_urls = []
        for el in sub_elements:
            href = el.get_attribute("href")
            if href:
                url = "https://www.notion.so" + href if href.startswith("/") else href
                if "notion.so" in url:
                    sub_urls.append(url)
    except Exception as e:
        print(f"{'  '*depth}Failed to find sub-links: {e}")
        sub_urls = []
                
    for url in sub_urls:
        extract_page_recursive(page, url, page_dir, depth + 1, max_depth, visited)

def main():
    base_dir = "notion_lectures"
    if os.path.exists(base_dir):
        print(f"Deleting old directory: {base_dir}")
        try:
            shutil.rmtree(base_dir)
        except Exception as e:
            print(f"Error deleting {base_dir}: {e}")
            
    os.makedirs(base_dir, exist_ok=True)

    print("Starting Notion extraction...")
    with sync_playwright() as p:
        try:
            browser = p.chromium.connect_over_cdp('http://127.0.0.1:9222')
            context = browser.contexts[0]
            page = context.pages[0]
            
            main_url = "https://www.notion.so/34af7a7da95e80aba3f6cc6092cab49e"
            visited = set()
            
            # Start recursion. depth=0 is main page, 1 is lecture, 2 is sub-page, 3 is sub-sub-page
            extract_page_recursive(page, main_url, base_dir, depth=0, max_depth=3, visited=visited)
            
            print("Finished extracting all pages.")
        except Exception as e:
            print(f"Playwright connection failed: {e}")
            print("Ensure Chrome is running with --remote-debugging-port=9222")

if __name__ == "__main__":
    main()
