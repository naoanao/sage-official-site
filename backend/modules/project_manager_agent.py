"""
Sage 3.0: Project Manager Agent (Local Edition)
Powered by Groq Llama 3.3
"""

import os
import logging
import requests
import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class ProjectManagerAgent:
    """
    Generates Project Plans (Gantt Charts) from Task Clusters.
    Output: Mermaid.js diagram code.
    """
    
    def __init__(self, model: str = "llama-3.3-70b-versatile"):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = model
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        
        if not self.api_key:
            logger.warning("⚠️ GROQ_API_KEY not found. Project Manager Agent disabled.")
            
    def generate_gantt(self, task_name: str, context: str) -> str:
        """
        Generate a Gantt chart for a specific task.
        
        Args:
            task_name: The main goal (e.g., "Build a React App")
            context: Additional details (e.g., tab summaries)
            
        Returns:
            String containing pure Mermaid.js code.
        """
        if not self.api_key:
            return "%% Error: Groq API Key missing"

        today = datetime.date.today().strftime("%Y-%m-%d")

        prompt = f"""
        You are a Project Manager Expert. Create a GANTT CHART for the following project using Mermaid.js syntax.
        
        PROJECT: {task_name}
        CONTEXT: {context}
        Start Date: {today}
        
        INSTRUCTIONS:
        1. Break the project down into logical phases (e.g., Research, Design, Implementation).
        2. Create 5-10 items with realistic durations.
        3. Use standard Mermaid `gantt` syntax.
        4. Exclude "weekend" keyword if it causes issues, keep it simple.
        5. Return ONLY the mermaid code. No markdown fences.
        
        Example Output Format:
        gantt
            title Project Schedule
            dateFormat YYYY-MM-DD
            section Phase 1
            Task 1 :a1, {today}, 3d
            Task 2 :after a1, 2d
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
                        {"role": "system", "content": "You are a diagram generator. Output only raw Mermaid code."},
                        {"role": "user", "content": prompt}
                    ],
                    "temperature": 0.2, # Low temperature for strict syntax
                    "max_tokens": 2000
                },
                timeout=20
            )
            
            if response.status_code != 200:
                logger.error(f"Groq API Error: {response.text}")
                return f"%% Groq API Error: {response.status_code}"
                
            result = response.json()
            content = result['choices'][0]['message']['content']
            
            # Clean up markdown if present
            content = content.replace("```mermaid", "").replace("```", "").strip()
            
            return content
            
        except Exception as e:
            logger.error(f"Gantt Generation Failed: {e}")
            return f"%% Generation Failed: {e}"

if __name__ == "__main__":
    # Quick Local Test
    logging.basicConfig(level=logging.INFO)
    
    # Load .env for testing
    from dotenv import load_dotenv
    from pathlib import Path
    env_path = Path(__file__).parent.parent.parent / '.env'
    load_dotenv(env_path)
    
    agent = ProjectManagerAgent()
    
    print("Running Gantt Generation...")
    mermaid_code = agent.generate_gantt(
        task_name="Launch a Coffee Shop",
        context="Looking up suppliers, commercial real estate, and menu inspiration."
    )
    
    print("\n--- Generated Mermaid Code ---")
    print(mermaid_code)
    print("------------------------------")
