import os
import logging
import time
from typing import Dict, Any, List
from backend.integrations.hashnode_integration import HashnodeIntegration
from backend.modules.browser_agent import BrowserAgent
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class HatenaPublisher:
    """
    Hatena Blog Publisher using Browser Automation (Selenium).
    Uses ID/Password provided by user.
    """
    def __init__(self):
        self.browser = BrowserAgent(headless=False) # Visual mode for stability & demo
        self.username = os.getenv("HATENA_ID")
        self.password = os.getenv("HATENA_PASSWORD")
        self.blog_id = os.getenv("HATENA_BLOG_ID") # e.g. naonaoa.hatenablog.com

    def post_article(self, title: str, content: str, categories: List[str] = []) -> Dict[str, Any]:
        if not self.username or not self.password:
            return {"status": "error", "message": "Hatena credentials (ID/PASSWORD) not found in .env"}

        try:
            logger.info(f"🚀 Starting Hatena Blog posting sequence (User: {self.username})...")
            
            # 1. Login
            self.browser._initialize_driver()
            driver = self.browser.driver
            
            logger.info("Navigating to Login...")
            driver.get("https://www.hatena.ne.jp/login")
            
            # Wait for login form
            WebDriverWait(driver, 15).until(EC.presence_of_element_located((By.ID, "login-name")))
            
            driver.find_element(By.ID, "login-name").clear()
            driver.find_element(By.ID, "login-name").send_keys(self.username)
            driver.find_element(By.ID, "password").clear()
            driver.find_element(By.ID, "password").send_keys(self.password)
            driver.find_element(By.CLASS_NAME, "submit-button").click()
            
            # Wait for redirect (check for header or specific element)
            time.sleep(5)
            
            # 2. Go to Editor directly
            # Construct URL: https://blog.hatena.ne.jp/{USERNAME}/{BLOG_ID}/edit
            # If BLOG_ID is not set, try to find it or use default
            if self.blog_id:
                edit_url = f"https://blog.hatena.ne.jp/{self.username}/{self.blog_id}/edit"
            else:
                # Fallback: Go to dashboard and find the first blog
                driver.get("https://blog.hatena.ne.jp/")
                time.sleep(3)
                current_url = driver.current_url
                # Usually dashboard redirects to the primary blog's admin or lists them
                # Let's assume the user has one blog for now or we can scrape the "Write" button
                # But constructing the URL is safest if we know the domain.
                # User provided "naonaoa.hatenablog.com" in .env earlier.
                edit_url = f"https://blog.hatena.ne.jp/{self.username}/naonaoa.hatenablog.com/edit"

            logger.info(f"Navigating to Editor: {edit_url}")
            driver.get(edit_url)
            
            # 3. Handle Editor (Visual vs Markdown)
            # Wait for title input
            WebDriverWait(driver, 20).until(EC.presence_of_element_located((By.NAME, "title")))
            
            # Input Title
            driver.find_element(By.NAME, "title").send_keys(title)
            
            # Input Content
            # Hatena often uses a tab system (Visual, HTML, Markdown).
            # We will try to find the main textarea.
            # Usually name="body" works for the raw editor.
            # If it's the Visual Editor, it might be an iframe or contenteditable div.
            # Strategy: Try to switch to "Markdown" mode if possible, or just dump text into the active element.
            
            try:
                body_input = driver.find_element(By.NAME, "body")
                body_input.send_keys(content)
            except:
                # Fallback for Visual Editor: Find the contenteditable div
                logger.info("Standard body input not found. Trying contenteditable...")
                editor_div = driver.find_element(By.CSS_SELECTOR, "div[contenteditable='true']")
                editor_div.send_keys(content)
            
            # 4. Publish
            logger.info("Clicking Publish...")
            # The button usually says "公開する" (Publish) and has type="submit" or specific class
            # It's often <button id="submit-button"> or <input type="submit">
            
            submit_btn = driver.find_element(By.ID, "submit-button")
            submit_btn.click()
            
            time.sleep(5) # Wait for publish to complete
            
            # Check result
            final_url = driver.current_url
            logger.info(f"✅ Published! Final URL: {final_url}")
            
            return {"status": "success", "url": final_url, "platform": "hatena_browser"}

        except Exception as e:
            logger.error(f"❌ Hatena Browser Post Failed: {e}")
            # self.browser.take_screenshot(driver.current_url, "hatena_error.png")
            return {"status": "error", "message": str(e)}
        finally:
            self.browser.close()

import base64
import hashlib
import random
import datetime
import requests

class HatenaAPIPublisher:
    """
    Hatena Blog Publisher using AtomPub API.
    More stable than browser automation.
    Requires: HATENA_ID, HATENA_API_KEY, HATENA_BLOG_ID (domain)
    """
    def __init__(self):
        self.username = os.getenv("HATENA_ID")
        self.api_key = os.getenv("HATENA_API_KEY")
        self.blog_id = os.getenv("HATENA_BLOG_ID") # e.g. naonaoa.hatenablog.com
        
        # Try to parse blog_id from URL if not set explicitly
        if not self.blog_id and os.getenv("HATENA_BLOG_URL"):
            url = os.getenv("HATENA_BLOG_URL")
            self.blog_id = url.replace("https://", "").replace("http://", "").strip("/")

    def _wsse_auth(self):
        """Generates WSSE header for Hatena API."""
        created = datetime.datetime.now().isoformat() + "Z"
        nonce = hashlib.sha1(str(random.random()).encode()).digest()
        nonce_b64 = base64.b64encode(nonce).decode()
        
        digest = hashlib.sha1((nonce + created.encode() + self.api_key.encode())).digest()
        digest_b64 = base64.b64encode(digest).decode()
        
        return f'UsernameToken Username="{self.username}", PasswordDigest="{digest_b64}", Nonce="{nonce_b64}", Created="{created}"'

    def post_article(self, title: str, content: str, categories: List[str] = []) -> Dict[str, Any]:
        if not self.username or not self.api_key or not self.blog_id:
            return {"status": "error", "message": "Hatena API credentials missing (Need HATENA_ID, HATENA_API_KEY, HATENA_BLOG_ID)"}

        url = f"https://blog.hatena.ne.jp/{self.username}/{self.blog_id}/atom/entry"
        
        # XML Body for AtomPub
        categories_xml = "".join([f'<category term="{c}" />' for c in categories])
        
        # Check if content is Markdown (Hatena needs explicit type or it defaults to HTML/Hatena Syntax)
        # We'll wrap it in CDATA just in case, or convert simple MD
        
        xml_data = f"""<?xml version="1.0" encoding="utf-8"?>
        <entry xmlns="http://www.w3.org/2005/Atom"
               xmlns:app="http://www.w3.org/2007/app">
          <title>{title}</title>
          <author><name>{self.username}</name></author>
          <content type="text/plain">{content}</content>
          {categories_xml}
          <app:control>
            <app:draft>no</app:draft>
          </app:control>
        </entry>
        """
        
        # Using WSSE Auth (Standard for Hatena)
        wsse_header = self._wsse_auth()
        
        try:
            logger.info(f"🚀 Posting to Hatena API: {url}")
            response = requests.post(
                url,
                data=xml_data.encode('utf-8'),
                headers={
                    'Content-Type': 'application/xml',
                    'X-WSSE': wsse_header
                }
            )
            
            if response.status_code == 201:
                logger.info("✅ Posted to Hatena via API!")
                # Parse response to get URL (simple string search)
                # <link rel="alternate" type="text/html" href="URL" />
                try:
                    res_txt = response.text
                    link_start = res_txt.find('rel="alternate" type="text/html" href="') + 39
                    link_end = res_txt.find('"', link_start)
                    post_url = res_txt[link_start:link_end]
                except:
                    post_url = "URL parsing failed but posted."
                
                return {"status": "success", "url": post_url, "platform": "hatena_api"}
            else:
                logger.error(f"❌ Hatena API Error: {response.status_code} - {response.text}")
                return {"status": "error", "message": f"API Error {response.status_code}"}
                
        except Exception as e:
            logger.error(f"❌ Hatena API Exception: {e}")
            return {"status": "error", "message": str(e)}

class SagePublisher:
    """
    Unified Publisher Module for Sage.
    Routes requests to the appropriate platform agent.
    """
    def __init__(self):
        self.hashnode = HashnodeIntegration()
        self.hatena_browser = HatenaPublisher()
        self.hatena_api = HatenaAPIPublisher()

    def publish(self, platform: str, title: str, content: str, tags: List[str] = [], image: str = None) -> Dict[str, Any]:
        """
        Publishes content to the specified platform.
        """
        platform = platform.lower()
        logger.info(f"📢 SagePublisher: Publishing to {platform}...")

        if "hashnode" in platform:
            return self.hashnode.post_article(title, content, tags, image)
        
        elif "hatena" in platform:
            # Prefer API if available (Now verified working!)
            if self.hatena_api.api_key:
                logger.info("Using Hatena API (Stable)")
                return self.hatena_api.post_article(title, content, tags)
            else:
                logger.info("Using Hatena Browser Automation (Fallback)")
                return self.hatena_browser.post_article(title, content, tags)
        
        elif "all" in platform:
            results = {}
            results["hashnode"] = self.hashnode.post_article(title, content, tags, image)
            
            if self.hatena_api.api_key:
                results["hatena"] = self.hatena_api.post_article(title, content, tags)
            else:
                results["hatena"] = self.hatena_browser.post_article(title, content, tags)
                
            return results
            
        else:
            return {"status": "error", "message": f"Unknown platform: {platform}"}

if __name__ == "__main__":
    # Test
    publisher = SagePublisher()
    # publisher.publish("hashnode", "Test Post", "Hello World", ["test"])
