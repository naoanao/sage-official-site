import os
import time
from playwright.sync_api import sync_playwright

output_dir = r"C:\Users\nao\Desktop\Sage_Final_Unified\ph_images"

def fill_and_next(page, text):
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.locator("textarea, input[type='text'], input:not([type])").first.fill(text)
    
    # Try different submit buttons
    try:
        page.locator("button[type='submit']").click(timeout=1000)
        return
    except:
        pass
    try:
        page.locator("button:has-text('Next')").click(timeout=1000)
        return
    except:
        pass
    try:
        page.locator("button").last.click(timeout=1000)
        return
    except:
        pass

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(locale='en-US')
    page = context.new_page()
    
    print("Starting final flow...")
    page.goto('https://ai-marketing-app-blush.vercel.app/')
    page.wait_for_load_state('networkidle')
    try:
        page.locator("button:has-text('EN')").click(timeout=3000)
    except:
        pass
    
    page.goto('https://ai-marketing-app-blush.vercel.app/onboarding/industry')
    page.wait_for_load_state('networkidle')
    time.sleep(1)
    page.locator("button:has-text('Restaurant')").click()
    
    # Fill step 2
    print("Step 2...")
    fill_and_next(page, "Cozy local cafe")
    
    # Fill step 3
    print("Step 3...")
    fill_and_next(page, "Young professionals and students")
    
    # Fill step 4
    print("Step 4...")
    fill_and_next(page, "Not enough customers on weekdays")
    
    # Fill step 5
    print("Step 5 (Goal)...")
    fill_and_next(page, "Increase weekday revenue by 30%")
    
    print("Waiting for generation to complete (up to 90s)...")
    try:
        page.wait_for_url('**/dashboard', timeout=90000)
        print("Reached dashboard!")
    except Exception as e:
        print("Timeout waiting for dashboard:", e)
        page.screenshot(path=os.path.join(output_dir, 'timeout_state.png'), full_page=True)
        
    page.wait_for_load_state('networkidle')
    time.sleep(3)
    page.screenshot(path=os.path.join(output_dir, '10_dashboard.png'), full_page=True)
    
    # If there's a weekly plan link, click it
    try:
        page.locator("a:has-text('Weekly Plan')").click(timeout=3000)
        page.wait_for_load_state('networkidle')
        time.sleep(2)
        page.screenshot(path=os.path.join(output_dir, '11_weekly_plan.png'), full_page=True)
    except:
        print("No weekly plan link found")
        try:
            # Let's just click any major tabs
            page.locator("button.tab").nth(1).click()
            time.sleep(2)
            page.screenshot(path=os.path.join(output_dir, '11_weekly_plan.png'), full_page=True)
        except:
            pass
            
    print("Success. Final URL:", page.url)
    browser.close()
