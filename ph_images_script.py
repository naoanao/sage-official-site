import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\nao\Desktop\Sage_Final_Unified\ph_images"

def safe_click(page, locator_str, timeout=3000):
    try:
        page.locator(locator_str).click(timeout=timeout)
        return True
    except:
        return False

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(locale='en-US')
    page = context.new_page()
    
    print("Navigating to home...")
    page.goto('https://ai-marketing-app-blush.vercel.app/')
    page.wait_for_load_state('networkidle')
    safe_click(page, "button:has-text('EN')")
    time.sleep(1)
    
    page.goto('https://ai-marketing-app-blush.vercel.app/onboarding/industry')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    safe_click(page, "button:has-text('Restaurant')")
    
    for i in range(4):
        time.sleep(1)
        page.wait_for_load_state('networkidle')
        inputs = page.locator("textarea, input[type='text'], input:not([type])").count()
        if inputs > 0:
            page.locator("textarea, input[type='text'], input:not([type])").first.fill("Pizza")
        
        # Click the action button
        btn_clicked = safe_click(page, "button[type='submit']")
        if not btn_clicked:
            btn_clicked = safe_click(page, "button:has-text('Next')")
        if not btn_clicked:
            btn_clicked = safe_click(page, "button:has-text('次へ')")
        if not btn_clicked:
            btn_clicked = safe_click(page, "button:has-text('Generate')")
        if not btn_clicked:
            # Click the last button on the page (usually the submit one if it's back and submit)
            try:
                page.locator("button").last.click(timeout=1000)
            except:
                pass
                
    time.sleep(2)
    page.wait_for_load_state('networkidle')
    with open(os.path.join(output_dir, 'goal_dom.html'), 'w', encoding='utf-8') as f:
        f.write(page.content())
    
    print("Currently at:", page.url)
    
    # Wait for dashboard to generate
    print("Waiting 15 seconds for dashboard generation...")
    time.sleep(15)
    page.wait_for_load_state('networkidle')
    page.screenshot(path=os.path.join(output_dir, '09_dashboard.png'), full_page=True)
    
    with open(os.path.join(output_dir, 'dashboard_dom.html'), 'w', encoding='utf-8') as f:
        f.write(page.content())
        
    print("Done! Final URL:", page.url)
    browser.close()
