"""
Sage 3.0: Google Disco Tab Context Analyzer (Local Edition)
Powered by Groq Llama 3.3
"""

import os
import json
import logging
import requests
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class TabContextAnalyzer:
    """
    Analyzes browser tabs to cluster them into tasks/topics.
    Uses Groq API for high-speed classification.
    """
    
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = model
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        
        if not self.api_key:
            logger.warning("⚠️ GROQ_API_KEY not found. Tab Analyzer will be disabled or fallback.")
            
    def analyze_tabs(self, tabs: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Analyze a list of tabs and group them by task.
        
        Args:
            tabs: List of dicts [{"title": "...", "url": "..."}]
            
        Returns:
            Dict containing 'clusters' and 'current_task_summary'
        """
        if not self.api_key:
            return {"error": "Groq API Key missing", "clusters": []}
            
        if not tabs:
            return {"clusters": [], "message": "No tabs provided"}

        # Prepare prompt
        tabs_text = "\n".join([f"- {t.get('title', 'No Title')} ({t.get('url', 'No URL')})" for t in tabs[:20]]) # Limit to 20 tabs for speed
        
        prompt = f"""
        You are an intelligent browser assistant. Analyze the following open tabs and group them into distinct "Task Clusters" (e.g., "Software Development", "Travel Planning", "News Reading").
        
        Tabs:
        {tabs_text}
        
        Return ONLY valid JSON in the following format:
        {{
            "current_focus_task": "Name of the task likely being worked on right now",
            "clusters": [
                {{
                    "topic": "Topic Name",
                    "tab_indices": [0, 2, 5], 
                    "summary": "Brief summary of what this group represents"
                }}
            ]
        }}
        """
        
        try:
            response = requests.post(
                self.api_url,
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": "You are a JSON-only response bot."},
                        {"role": "user", "content": prompt}
                    ],
                    "response_format": {"type": "json_object"},
                    "temperature": 0.3
                },
                timeout=10
            )
            
            if response.status_code != 200:
                logger.error(f"Groq API Error: {response.text}")
                return {"error": f"Groq API Error: {response.status_code}", "clusters": []}
                
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Parse JSON
            parsed = json.loads(content)
            return parsed
            
        except Exception as e:
            logger.error(f"Tab Analysis Failed: {e}")
            return {"error": str(e), "clusters": []}

if __name__ == "__main__":
    # Quick Local Test if run directly
    logging.basicConfig(level=logging.INFO)
    
    # Load .env for testing
    from dotenv import load_dotenv
    from pathlib import Path
    
    # Go up two levels to find .env (backend/modules -> backend -> root)
    env_path = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(env_path)
    
    # Mock Data
    mock_tabs = [
        {"title": "Python itertools documentation", "url": "docs.python.org"},
        {"title": "Stack Overflow - Python list comprehension", "url": "stackoverflow.com"},
        {"title": "Cheap flights to Tokyo", "url": "expedia.com"},
        {"title": "Kyoto hotel booking", "url": "booking.com"},
        {"title": "CNN Breaking News", "url": "cnn.com"}
    ]
    
    analyzer = TabContextAnalyzer()
    print("Running Analysis...")
    result = analyzer.analyze_tabs(mock_tabs)
    print(json.dumps(result, indent=2))
