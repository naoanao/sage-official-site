
import os
import json
import logging
from typing import Dict, List, Any

# Configure logging
logger = logging.getLogger(__name__)

# Try importing SerpApi
try:
    from serpapi import GoogleSearch
    SERPAPI_AVAILABLE = True
except ImportError:
    SERPAPI_AVAILABLE = False
    logger.warning("⚠️ google-search-results not installed.")

# Try importing DuckDuckGo
try:
    from duckduckgo_search import DDGS
    DDG_AVAILABLE = True
except ImportError:
    DDG_AVAILABLE = False
    logger.warning("⚠️ duckduckgo-search not installed.")

class BrowserAgent:
    """
    Revised BrowserAgent using SerpApi for reliable Google Search.
    Falls back to DuckDuckGo if SerpAPI key is missing.
    """
    def __init__(self):
        self.serpapi_key = os.getenv("SERPAPI_KEY")
        self.perplexity_key = os.getenv("PERPLEXITY_API_KEY")
        
        self.use_serpapi = bool(self.serpapi_key and SERPAPI_AVAILABLE)
        self.use_perplexity = bool(self.perplexity_key)
        self.use_ddg = DDG_AVAILABLE
        
        if self.use_serpapi:
            logger.info("✅ BrowserAgent initialized with SerpAPI")
        elif self.use_perplexity:
            logger.info("✅ BrowserAgent initialized with Perplexity (Robust Search)")
        elif self.use_ddg:
            logger.info("✅ BrowserAgent initialized with DuckDuckGo (Fallback)")
        else:
            logger.warning("⚠️ BrowserAgent running in LIMITED mode (No Search Backend)")

    def search_google(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Perform a Google Search using SerpApi, Perplexity, or fallback to DDG.
        """
        # 1. Try SerpAPI first (Direct Google results)
        if self.use_serpapi:
            try:
                params = {
                    "q": query,
                    "api_key": self.serpapi_key,
                    "engine": "google",
                    "num": num_results,
                    "hl": "ja", # Japanese results priority
                    "gl": "jp"
                }
                
                search = GoogleSearch(params)
                results = search.get_dict()
                organic_results = results.get("organic_results", [])
                
                formatted_results = []
                for item in organic_results:
                    formatted_results.append({
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "snippet": item.get("snippet")
                    })
                
                answer_box = results.get("answer_box", {})
                if answer_box:
                     formatted_results.insert(0, {
                        "title": "Instant Answer",
                        "link": "",
                        "snippet": answer_box.get("snippet") or answer_box.get("answer") or "See specific result."
                    })

                if formatted_results:
                    return {"status": "success", "results": formatted_results, "backend": "SerpAPI"}
            except Exception as e:
                logger.error(f"❌ SerpAPI Search Error: {e}")

        # 2. Try Perplexity (Highly reliable for up-to-date and Japanese facts)
        if self.use_perplexity:
            try:
                import requests
                headers = {
                    "Authorization": f"Bearer {self.perplexity_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "sonar", # Fast and up-to-date
                    "messages": [
                        {"role": "system", "content": "You are a research assistant. Provide concise facts with citations if possible. Focus on Japanese context if the query is in Japanese."},
                        {"role": "user", "content": f"Provide up-to-date information for this query: {query}"}
                    ],
                    "max_tokens": 1000
                }
                
                response = requests.post("https://api.perplexity.ai/chat/completions", headers=headers, json=payload, timeout=20)
                if response.status_code == 200:
                    data = response.json()
                    answer = data['choices'][0]['message']['content']
                    citations = data.get('citations', [])
                    
                    return {
                        "status": "success",
                        "results": [{
                            "title": "Perplexity Dynamic Search Result",
                            "link": citations[0] if citations else "https://perplexity.ai",
                            "snippet": answer
                        }],
                        "backend": "Perplexity API"
                    }
                else:
                    logger.warning(f"⚠️ Perplexity API responded with status {response.status_code}")
            except Exception as e:
                logger.error(f"❌ Perplexity Search Error: {e}")

        # 3. Fallback to DuckDuckGo (Basic search)
        if self.use_ddg:
            try:
                from duckduckgo_search import DDGS
                with DDGS() as ddgs:
                    # Try using 'text' with simplified params
                    results = [r for r in ddgs.text(query, max_results=num_results)]
                
                formatted_results = []
                for item in results:
                    formatted_results.append({
                        "title": item.get('title'),
                        "link": item.get('href'),
                        "snippet": item.get('body')
                    })
                
                if formatted_results:
                    return {"status": "success", "results": formatted_results, "backend": "DuckDuckGo"}
                else:
                    return {"status": "success", "results": [], "message": "No results found even with fallback."}

            except Exception as e:
                logger.error(f"❌ DuckDuckGo Search Error: {e}")
                return {"status": "error", "message": f"Search failed on all backends: {e}"}

        return {
            "status": "error",
            "message": "No search backend available. Please configure API keys or install dependencies."
        }

    def validate_url(self, url: str) -> Dict[str, Any]:
        """
        Check if a URL is valid and reachable.
        Returns status code and basic info.
        """
        try:
            import requests
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, headers=headers, timeout=10)
            
            return {
                "status": "success",
                "reachable": response.status_code == 200,
                "status_code": response.status_code,
                "url": url,
                "domain": url.split('/')[2] if '/' in url else url
            }
        except Exception as e:
            return {
                "status": "error",
                "reachable": False,
                "message": str(e),
                "url": url
            }

    def verify_url_content(self, url: str, search_terms: List[str]) -> Dict[str, Any]:
        """
        Advanced Verification (D1.5 Ground Truth): 
        Fetches the URL content and checks if specified numeric terms/facts exist in the text.
        """
        try:
            import requests
            import re
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, headers=headers, timeout=15)
            
            if response.status_code != 200:
                return {"status": "error", "reachable": False, "verified": False}

            # Simple HTML tag removal (crude but effective for search)
            text_content = re.sub(r'<[^>]+>', ' ', response.text).lower()
            
            results = {}
            for term in search_terms:
                term_clean = str(term).lower().strip()
                # Check for exact string match
                found = term_clean in text_content
                results[term] = found

            return {
                "status": "success",
                "reachable": True,
                "verified": all(results.values()),
                "match_map": results,
                "url": url
            }
        except Exception as e:
            logger.error(f"❌ Verification Error at {url}: {e}")
            return {"status": "error", "message": str(e), "url": url}

    def get_google_trends(self, keyword: str) -> Dict[str, Any]:
        """
        Fetch Google Trends data using pytrends.
        Provides 'Real Water' evidence of search interest.
        """
        try:
            from pytrends.request import TrendReq
            # hl='ja-JP', tz=540 for Japan time (UTC+9)
            pytrends = TrendReq(hl='ja-JP', tz=540)
            
            # 1. Build Payload
            pytrends.build_payload([keyword], cat=0, timeframe='today 3-m', geo='JP')
            
            # 2. Interest Over Time
            iot_df = pytrends.interest_over_time()
            iot_data = []
            if not iot_df.empty:
                # Take last 5 points for conciseness
                recent = iot_df.tail(5)
                for index, row in recent.iterrows():
                    iot_data.append({
                        "date": index.strftime('%Y-%m-%d'),
                        "value": int(row[keyword])
                    })
            
            # 3. Related Queries
            related = pytrends.related_queries()
            top_related = []
            rising_related = []
            
            if keyword in related:
                top_df = related[keyword].get('top')
                rising_df = related[keyword].get('rising')
                
                if top_df is not None and not top_df.empty:
                    top_related = top_df.head(5).to_dict('records')
                if rising_df is not None and not rising_df.empty:
                    rising_related = rising_df.head(5).to_dict('records')

            return {
                "status": "success",
                "keyword": keyword,
                "interest_over_time": iot_data,
                "related_top": top_related,
                "related_rising": rising_related,
                "backend": "Google Trends (Pytrends)"
            }
        except Exception as e:
            logger.error(f"❌ Google Trends Error: {e}")
            return {"status": "error", "message": str(e)}

    # Keep compatibility with old methods if needed, but direct them to search_google
    def search(self, query: str):
        return self.search_google(query)

    def browse_url(self, url: str) -> Dict[str, Any]:
        """
        Fetches the content of a URL and extracts readable text.
        """
        try:
            import requests
            from bs4 import BeautifulSoup
            import urllib3
            
            # Suppress insecure request warning as we might disable SSL verification for resilience
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'ja,en-US;q=0.7,en;q=0.3'
            }
            
            logger.info(f"🌐 Browsing URL: {url}")
            # Use verify=False to handle sites with expired/bad certificates (common in search results)
            response = requests.get(url, headers=headers, timeout=15, verify=False)
            response.raise_for_status()
            
            # Detect encoding
            encoding = response.encoding if response.encoding else 'utf-8'
            
            # Use BeautifulSoup to clean content
            soup = BeautifulSoup(response.content, 'html.parser', from_encoding=encoding)
            
            # Remove scripts, styles, nav, footer to get clean text
            for script_or_style in soup(["script", "style", "nav", "footer", "header"]):
                script_or_style.decompose()
            
            text = soup.get_text(separator='\n')
            
            # Basic cleanup: remove extra whitespace
            lines = (line.strip() for line in text.splitlines())
            chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
            clean_text = '\n'.join(chunk for chunk in chunks if chunk)
            
            # Truncate if too long (Sage context limit)
            max_chars = 15000
            if len(clean_text) > max_chars:
                clean_text = clean_text[:max_chars] + "\n\n... (Content truncated for context) ..."

            return {
                "status": "success",
                "url": url,
                "title": soup.title.string if soup.title else "No Title",
                "content": clean_text,
                "length": len(clean_text)
            }
        except Exception as e:
            logger.error(f"❌ Browse Error at {url}: {e}")
            return {"status": "error", "message": f"Failed to browse {url}: {str(e)}"}

