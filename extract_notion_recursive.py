import os
import time
from playwright.sync_api import sync_playwright

def sanitize_filename(name):
    # remove invalid characters for windows filenames
    for char in ['<', '>', ':', '"', '/', '\\', '|', '?', '*']:
        name = name.replace(char, '_')
    return name.strip()

def main():
    base_dir = "notion_lectures"
    if not os.path.exists(base_dir):
        os.makedirs(base_dir)

    with sync_playwright() as p:
        browser = p.chromium.connect_over_cdp('http://127.0.0.1:9222')
        context = browser.contexts[0]
        page = context.pages[0] # reuse the existing tab
        
        main_url = "https://www.notion.so/34af7a7da95e80aba3f6cc6092cab49e"
        
        print(f"Navigating to main URL: {main_url}")
        page.goto(main_url, timeout=30000)
        page.wait_for_selector(".notion-page-content", timeout=15000)
        time.sleep(3)
        
        # Get date links
        date_elements = page.locator(".notion-page-content a.notion-link").all()
        date_pages = []
        for el in date_elements:
            text = el.inner_text().strip()
            href = el.get_attribute("href")
            if "講座" in text:
                url = "https://www.notion.so" + href if href.startswith("/") else href
                date_pages.append({"title": text, "url": url})
        
        print(f"Found {len(date_pages)} date pages.")
        
        for date_page in date_pages:
            date_title = sanitize_filename(date_page["title"])
            date_dir = os.path.join(base_dir, date_title)
            if not os.path.exists(date_dir):
                os.makedirs(date_dir)
                
            print(f"Processing Date Page: {date_title}")
            page.goto(date_page["url"], timeout=30000)
            page.wait_for_selector(".notion-page-content", timeout=15000)
            time.sleep(3)
            
            # Get sub-page links
            sub_elements = page.locator(".notion-page-content a.notion-link").all()
            sub_pages = []
            for el in sub_elements:
                text = el.inner_text().strip()
                href = el.get_attribute("href")
                url = "https://www.notion.so" + href if href.startswith("/") else href
                sub_pages.append({"title": text, "url": url})
            
            print(f"  Found {len(sub_pages)} sub-pages in {date_title}.")
            
            for sub_page in sub_pages:
                sub_title = sanitize_filename(sub_page["title"])
                if not sub_title:
                    sub_title = "Untitled"
                print(f"  -> Extracting: {sub_title}")
                
                page.goto(sub_page["url"], timeout=30000)
                page.wait_for_selector(".notion-page-content", timeout=15000)
                time.sleep(3)
                
                # Try to extract the title from the page content header, if not use link text
                page_title = sub_title
                try:
                    header_text = page.locator("div.notion-page-block > div[contenteditable='false']").inner_text()
                    if header_text:
                        page_title = sanitize_filename(header_text)
                except Exception:
                    pass
                
                content = page.locator(".notion-page-content").inner_text()
                
                file_path = os.path.join(date_dir, f"{page_title}.md")
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(f"# {sub_page['title']}\n\n")
                    f.write(content)
                    
                print(f"     Saved to {file_path}")

        print("Finished extracting all pages.")

if __name__ == "__main__":
    main()
