import os
import sys
import logging
from datetime import datetime
from dotenv import load_dotenv
from pytrends.request import TrendReq
import requests

load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SEOBlogAgent:
    def __init__(self):
        self.pytrends = TrendReq(hl='ja-JP', tz=360)
        self.groq_api_key = os.getenv("GROQ_API_KEY")
        self.model_name = "llama-3.3-70b-versatile"
        if not self.groq_api_key:
            logger.warning("Groq API key not found. AI generation will fail.")

    def get_trending_keywords(self):
        try:
            self.pytrends.build_payload(["AI 業務効率化", "生成AI 活用", "DX 自動化"], cat=0, timeframe='now 7-d', geo='JP')
            related_queries = self.pytrends.related_queries()
            # Simplified logic for finding a good keyword
            return "中小企業向けAI導入のステップとROI"
        except Exception as e:
            logger.error(f"Error fetching trends: {e}")
            return "AIによるビジネス自動化の未来"

    def generate_article(self, keyword):
        prompt = f"""
        Write a high-quality, SEO-optimized blog article in localized Japanese.
        Target Word Count: 1000-1200 words.
        Topic: {keyword}
        Focus: Practical AI automation, business efficiency, and ROI for small businesses.
        Structure:
        1. Impactful title
        2. Engaging introduction
        3. 4-5 numbered sections with details
        4. Code example or technical implementation
        5. ROI calculation
        6. Conclusion and CTA
        
        FORMAT: Use MDX. Include frontmatter:
        ---
        title: "[Title]"
        date: "{datetime.now().strftime('%Y-%m-%d')}"
        excerpt: "[Summary]"
        keywords: "{keyword}"
        author: "Sage AI"
        ---
        """
        try:
            url = "https://api.groq.com/openai/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": self.model_name,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.3
            }
            response = requests.post(url, headers=headers, json=payload, timeout=120)
            if response.status_code == 200:
                return response.json()['choices'][0]['message']['content']
            else:
                logger.error(f"Groq API Error: {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error generating article: {e}")
            return None

    def save_article(self, content, slug):
        filename = f"{datetime.now().strftime('%Y-%m-%d')}-{slug}.mdx"
        filepath = os.path.join("frontend", "src", "blog", "posts", filename)
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        with open(filepath, "w", encoding="utf-8") as f:
            f.write(content)
        logger.info(f"Article saved to {filepath}")
        return filepath

if __name__ == "__main__":
    agent = SEOBlogAgent()
    keyword = agent.get_trending_keywords()
    content = agent.generate_article(keyword)
    if content:
        agent.save_article(content, "ai-automation")
