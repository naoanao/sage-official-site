import logging
import os
from playwright.sync_api import sync_playwright, Page, Browser, Playwright, TimeoutError as PlaywrightTimeoutError

logger = logging.getLogger(__name__)

class BrowserAutomationAgent:
    def __init__(self, headless: bool = True):
        self.headless = headless
        self.playwright: Playwright = None
        self.browser: Browser = None
        self.context = None
        self.page: Page = None
        self._is_running = False

    def start(self):
        if self._is_running:
            return
        
        logger.info("Initializing BrowserAutomationAgent (Playwright)...")
        from playwright.sync_api import sync_playwright
        try:
            self.playwright = sync_playwright().start()
            
            # Attempt to use Google Chrome stable channel for better "human" score
            try:
                self.browser = self.playwright.chromium.launch(headless=self.headless, channel="chrome")
            except Exception:
                logger.warning("Chrome channel not found, falling back to bundled chromium.")
                self.browser = self.playwright.chromium.launch(headless=self.headless)
                
            self.context = self.browser.new_context(
                viewport={'width': 1280, 'height': 720},
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                locale="ja-JP",
                timezone_id="Asia/Tokyo",
                permissions=["geolocation"]
            )
            self.page = self.context.new_page()
            self._is_running = True
            logger.info("✅ BrowserAutomationAgent initialized (JP Locale/Tokyo Time).")
        except Exception as e:
            logger.error(f"Failed to start BrowserAutomationAgent: {e}")
            self.cleanup()
            raise

    def cleanup(self):
        if self.page:
            self.page.close()
        if self.context:
            self.context.close()
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        
        self.page = None
        self.context = None
        self.browser = None
        self.playwright = None
        self._is_running = False
        logger.info("BrowserAutomationAgent cleaned up.")

    def ensure_running(self):
        if not self._is_running:
            self.start()

    def navigate(self, url: str):
        self.ensure_running()
        logger.info(f"Navigate: {url}")
        try:
            self.page.goto(url, wait_until="domcontentloaded", timeout=30000) # domcontentloaded is faster than networkidle
            title = self.page.title()
            return {
                "status": "success",
                "url": self.page.url,
                "title": title
            }
        except Exception as e:
            logger.error(f"Navigate failed: {e}")
            return {"status": "error", "message": str(e)}

    def screenshot(self, path: str):
        self.ensure_running()
        logger.info(f"Screenshot: {path}")
        try:
            # Ensure directory exists
            os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
            self.page.screenshot(path=path)
            return {"status": "success", "path": path}
        except Exception as e:
            logger.error(f"Screenshot failed: {e}")
            return {"status": "error", "message": str(e)}

    def take_screenshot(self, url: str, path: str = None):
        """
        Orchestrator helper: Navigates to URL and takes a screenshot.
        """
        self.ensure_running()
        
        # Navigate
        nav_res = self.navigate(url)
        if nav_res.get("status") == "error":
             return nav_res
        
        # Determine path
        if not path:
             import time
             filename = f"screenshot_{int(time.time())}.png"
             # Save to "screenshots" folder in project root if possible, else cwd
             # Looking for a sensible default.
             # Assuming standard project structure:
             project_root = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
             screenshots_dir = os.path.join(project_root, "screenshots")
             path = os.path.join(screenshots_dir, filename)

        return self.screenshot(path)

    def get_content(self):
        self.ensure_running()
        try:
            # Get text content
            content = self.page.content() # HTML
            text = self.page.inner_text("body")
            return {
                "status": "success",
                "html_length": len(content),
                "text_preview": text[:1000]
            }
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def click(self, selector: str):
        self.ensure_running()
        logger.info(f"Click: {selector}")
        try:
            self.page.click(selector, timeout=5000)
            return {"status": "success", "action": "click", "selector": selector}
        except Exception as e:
            return {"status": "error", "message": str(e)}
            
    def type_text(self, selector: str, text: str):
        self.ensure_running()
        logger.info(f"Type: {text} into {selector}")
        try:
            self.page.fill(selector, text, timeout=5000)
            return {"status": "success", "action": "type", "selector": selector}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def search(self, query: str):
        """
        Primary search method: Tries lightweight requests first, then Playwright.
        """
        try:
            import requests
            from bs4 import BeautifulSoup
            
            logger.info(f"🦆 DuckDuckGo Search (Lightweight): {query}")
            headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"}
            url = f"https://html.duckduckgo.com/html/?q={query}"
            
            resp = requests.get(url, headers=headers, timeout=10)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, 'html.parser')
                results = []
                for res in soup.find_all('div', class_='result__body')[:5]:
                    title_tag = res.find('a', class_='result__a')
                    snippet_tag = res.find('a', class_='result__snippet')
                    if title_tag:
                        results.append({
                            "title": title_tag.text.strip(),
                            "url": title_tag['href'],
                            "snippet": snippet_tag.text.strip() if snippet_tag else ""
                        })
                
                if results:
                    return {"status": "success", "results": results, "source": "duckduckgo_light"}
            
            logger.warning("DuckDuckGo lightweight search yielded no results. Falling back to Playwright.")
        except Exception as e:
            logger.info(f"Lightweight search failed ({e}). Falling back to Playwright.")
            
        return self.search_google(query)

    def search_google(self, query: str):
        """
        Perform a Google search with DuckDuckGo fallback.
        Uses ephemeral browser instance to avoid Flask threading issues.
        """
        # self.ensure_running() # <-- REMOVED: Manage lifecycle locally
        from playwright.sync_api import sync_playwright

        results_data = {"status": "error", "message": "Unknown error"}

        try:
            with sync_playwright() as p:
                # Launch Ephemeral Browser (Headless)
                # Note: We create a new browser instance for every search to ensure thread safety
                browser = p.chromium.launch(headless=self.headless)
                context = browser.new_context(
                    viewport={'width': 1280, 'height': 720},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
                    locale="ja-JP",
                    timezone_id="Asia/Tokyo",
                )
                page = context.new_page()

                # 1. Try Google
                try:
                    url = f"https://www.google.com/search?q={query}&hl=ja&gl=jp"
                    logger.info(f"🔍 Searching Google: {query}")
                    page.goto(url, wait_until="domcontentloaded", timeout=15000)
                    
                    # Check for Captcha/Block
                    content = page.content()
                    if "sorry/index" in page.url or "recaptcha" in content or "unusual traffic" in content:
                        logger.warning("⚠️ Google Traffic Block detected. Switching to fallback.")
                        raise Exception("Google Blocked")
                    
                    # Evaluate JS
                    results = page.evaluate("""() => {
                        const items = [];
                        const elements = document.querySelectorAll('div.g'); 
                        
                        if (elements.length === 0) return [];

                        elements.forEach(el => {
                            const titleEl = el.querySelector('h3');
                            const linkEl = el.querySelector('a');
                            const snipEl = el.querySelector('div[style*="-webkit-line-clamp"]'); 
                            const snipEl2 = el.querySelector('div.VwiC3b');
                            
                            if (titleEl && linkEl) {
                                items.push({
                                    title: titleEl.innerText,
                                    link: linkEl.href,
                                    snippet: snipEl ? snipEl.innerText : (snipEl2 ? snipEl2.innerText : "")
                                });
                            }
                        });
                        return items.slice(0, 5);
                    }""")
                    
                    if results:
                        results_data = {"status": "success", "results": results, "source": "google"}
                    else:
                        logger.warning("Google loaded but no results found. Trying fallback.")
                        raise Exception("No Google Results")
                    
                except Exception as e:
                    logger.warning(f"Google search failed ({e}). Trying DuckDuckGo...")

                    # 2. Fallback: DuckDuckGo
                    try:
                        logger.info(f"🦆 Searching DuckDuckGo: {query}")
                        ddg_url = f"https://duckduckgo.com/?q={query}&kl=jp-jp"
                        page.goto(ddg_url, wait_until="domcontentloaded", timeout=15000)
                        
                        results = page.evaluate("""() => {
                            const items = [];
                            // 2. Extract Organic Results
                            const elements = document.querySelectorAll('article[data-testid="result"]');
                            
                            elements.forEach(el => {
                                const titleEl = el.querySelector('[data-testid="result-title-a"]');
                                const snippetEl = el.querySelector('[data-result="snippet"]');
                                
                                if (titleEl) {
                                    items.push({
                                        title: titleEl.innerText,
                                        link: titleEl.href,
                                        snippet: snippetEl ? snippetEl.innerText : el.innerText.substring(0, 200)
                                    });
                                }
                            });
                            
                            // 3. Fallback to legacy
                            if (items.length === 0) {
                                const legacy = document.querySelectorAll('.result');
                                legacy.forEach(el => {
                                    const title = el.querySelector('.result__title');
                                    const link = el.querySelector('.result__url');
                                    const snip = el.querySelector('.result__snippet');
                                    if (title && link) {
                                        items.push({ title: title.innerText, link: link.href, snippet: snip ? snip.innerText : "" });
                                    }
                                });
                            }
                            
                            return items.slice(0, 5);
                        }""")
                        
                        if not results:
                            text = page.inner_text("body")[:2000]
                            logger.warning("No structured results on DDG either. Returning raw text.")
                            results_data = {"status": "success", "results": [], "page_text": text, "source": "ddg_text"}
                        else:
                            results_data = {"status": "success", "results": results, "source": "duckduckgo"}

                    except Exception as e2:
                        logger.error(f"DuckDuckGo search failed: {e2}")
                        results_data = {"status": "error", "message": str(e2)}

                browser.close()
                return results_data

        except Exception as e_outer:
            logger.error(f"Playwright execution failed: {e_outer}")
            return {"status": "error", "message": str(e_outer)}

    def close(self):
        self.cleanup()
