import threading
import time
import random
import logging
import requests
from datetime import datetime

logger = logging.getLogger(__name__)

class SageAutomationAgent:
    """
    Sage 2.0 Automation Agent.
    Runs in the background and periodically triggers the Sage Brain (Orchestrator)
    to generate and publish content autonomously.
    """
    def __init__(self, base_url="http://localhost:8000/api"):
        self.base_url = base_url
        self.is_running = False
        self.thread = None
        self.interval_minutes = 60 # Default to 1 hour
        self.next_run_time = None
        
        # High-value topics for autonomous generation
        self.topics = [
            "The Future of AI in 2025",
            "How to Make Money with Python",
            "Automating Daily Tasks with Code",
            "Web3 and the Future of the Internet",
            "The Ethics of Artificial Intelligence",
            "Top 10 Gadgets for Geeks",
            "Minimalist Lifestyle for Engineers",
            "Cybersecurity Tips for Remote Workers",
            "The Rise of No-Code Tools",
            "Mental Health for Developers"
        ]

    def start(self, interval_minutes=60):
        if self.is_running:
            logger.warning("Automation Agent is already running.")
            return
        
        self.is_running = True
        self.interval_minutes = interval_minutes
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()
        logger.info(f"🚀 Sage Automation Agent started. Interval: {self.interval_minutes} min.")

    def stop(self):
        self.is_running = False
        self.next_run_time = None
        logger.info("🛑 Sage Automation Agent stopped.")

    def get_status(self):
        return {
            "is_running": self.is_running,
            "interval_minutes": self.interval_minutes,
            "next_run_time": self.next_run_time.isoformat() if self.next_run_time else None
        }

    def _loop(self):
        while self.is_running:
            # Calculate next run
            self.next_run_time = datetime.now().timestamp() + (self.interval_minutes * 60)
            
            # Wait for interval (checking stop flag every second)
            for _ in range(int(self.interval_minutes * 60)):
                if not self.is_running:
                    return
                time.sleep(1)
            
            # Trigger Action
            if self.is_running:
                self._trigger_sage_brain()

    def _trigger_sage_brain(self):
        topic = random.choice(self.topics)
        prompt = f"Sage 2.0 Autonomous Mode: Write a high-quality, engaging blog post about '{topic}'. Publish it to Hatena Blog (and Hashnode if appropriate). Make it sound professional yet accessible."
        
        logger.info(f"🤖 Sage Automation Triggered: {topic}")
        
        try:
            payload = {"message": prompt}
            # We use a direct internal call or request to the API to ensure it goes through the full pipeline
            # Using requests to localhost ensures we test the full stack
            res = requests.post(f"{self.base_url}/chat", json=payload)
            
            if res.status_code == 200:
                logger.info("✅ Sage Brain accepted the autonomous task.")
            else:
                logger.error(f"❌ Sage Brain rejected task: {res.status_code} - {res.text}")
                
        except Exception as e:
            logger.error(f"❌ Automation Error: {e}")
