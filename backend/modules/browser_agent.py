
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
        self.use_serpapi = bool(self.serpapi_key and SERPAPI_AVAILABLE)
        self.use_ddg = DDG_AVAILABLE
        
        if self.use_serpapi:
            logger.info("✅ BrowserAgent initialized with SerpAPI")
        elif self.use_ddg:
            logger.info("✅ BrowserAgent initialized with DuckDuckGo (Fallback)")
        else:
            logger.warning("⚠️ BrowserAgent running in LIMITED mode (No Search Backend)")

    def search_google(self, query: str, num_results: int = 5) -> Dict[str, Any]:
        """
        Perform a Google Search using SerpApi or fallback to DDG.
        """
        # 1. Try SerpAPI first
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
                
                # Extract organic results
                organic_results = results.get("organic_results", [])
                
                # Format simply for LLM consumption
                formatted_results = []
                for item in organic_results:
                    formatted_results.append({
                        "title": item.get("title"),
                        "link": item.get("link"),
                        "snippet": item.get("snippet")
                    })
                
                # Check for answer box (instant answer)
                answer_box = results.get("answer_box", {})
                if answer_box:
                     formatted_results.insert(0, {
                        "title": "Instant Answer",
                        "link": "",
                        "snippet": answer_box.get("snippet") or answer_box.get("answer") or "See specific result."
                    })

                if not formatted_results:
                    return {"status": "success", "results": [], "message": "No results found (SerpAPI)."}
                    
                return {
                    "status": "success",
                    "results": formatted_results,
                    "backend": "SerpAPI"
                }

            except Exception as e:
                logger.error(f"❌ SerpAPI Search Error: {e}")
                # Fallthrough to DDG if SerpAPI fails
                pass

        # 2. Fallback to DuckDuckGo
        if self.use_ddg:
            try:
                results = DDGS().text(query, max_results=num_results)
                formatted_results = []
                for item in results:
                    formatted_results.append({
                        "title": item.get("title"),
                        "link": item.get("href"),
                        "snippet": item.get("body")
                    })
                
                if not formatted_results:
                     return {"status": "success", "results": [], "message": "No results found (DDG)."}

                return {
                    "status": "success",
                    "results": formatted_results,
                    "backend": "DuckDuckGo"
                }
            except Exception as e:
                logger.error(f"❌ DuckDuckGo Search Error: {e}")
                return {"status": "error", "message": f"Search failed: {e}"}

        return {
            "status": "error",
            "message": "No search backend available. Set SERPAPI_KEY or install duckduckgo-search."
        }

    # Keep compatibility with old methods if needed, but direct them to search_google
    def search(self, query: str):
        return self.search_google(query)
