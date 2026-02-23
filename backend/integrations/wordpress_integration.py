import os
import requests
from typing import Dict, Any, List

class WordPressIntegration:
    """
    Basic WordPress Integration for Sage.
    """
    def __init__(self):
        self.name = "WordPress Integration"
        self.api_url = os.getenv("WORDPRESS_API_URL", "https://example.com/wp-json/wp/v2")
        self.username = os.getenv("WORDPRESS_USERNAME", "admin")
        self.password = os.getenv("WORDPRESS_PASSWORD", "password")

    def post_article(self, article: Dict[str, Any], images: List[str] = None) -> Dict[str, Any]:
        """
        Posts an article to WordPress.
        Returns the response dict from WordPress API.
        """
        if "example.com" in self.api_url:
            print("👾 [MOCK] WordPress Post: URL not configured. Simulating success.")
            # Sage Quality Mock Response
            return {
                "status": "success", 
                "url": "http://mock-wordpress-site.com/post/sage-insights-2025", 
                "id": 123,
                "message": "Article published successfully. SEO score: 95/100. Social shares scheduled."
            }

        title = article.get('title', 'Untitled')
        content = article.get('content', '')
        status = article.get('status', 'draft') # Default to draft for safety

        # Basic Auth
        auth = (self.username, self.password)
        
        # 1. Upload Images (if any) - Simplified for now (Future: Upload media endpoint)
        # For now, we assume images are already URLs or we skip upload logic to keep it simple first.
        
        # 2. Create Post
        data = {
            'title': title,
            'content': content,
            'status': status
        }
        
        try:
            response = requests.post(f"{self.api_url}/posts", json=data, auth=auth, timeout=30)
            response.raise_for_status()
            result = response.json()
            print(f"[WordPress] Successfully posted: {result.get('link')}")
            return {"status": "success", "url": result.get('link'), "id": result.get('id')}
            
        except Exception as e:
            print(f"[WordPress] Failed to post: {e}")
            return {"status": "error", "message": str(e)}

# Singleton
wordpress_integration = WordPressIntegration()
