import os
import sys
import logging
import requests
import json

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SlackAgent:
    """
    Slack Agent for sending notifications via Incoming Webhooks.
    """
    def __init__(self, webhook_url=None):
        self.webhook_url = webhook_url or os.getenv("SLACK_WEBHOOK_URL")
        self.enabled = bool(self.webhook_url)
        
        if self.enabled:
            logger.info("Slack Agent initialized.")
        else:
            logger.warning("SLACK_WEBHOOK_URL not found. Slack Agent disabled.")

    def send_message(self, text: str):
        """Send a simple text message to Slack."""
        if not self.enabled:
            # Mock Mode
            logger.info(f"👾 [MOCK] Slack Message: {text[:50]}...")
            return {"status": "success", "message": "Message sent (Mock Mode)"}

        payload = {"text": text}
        
        try:
            response = requests.post(
                self.webhook_url,
                data=json.dumps(payload),
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
            response.raise_for_status()
            return {"status": "success", "response": response.text}
        except requests.exceptions.RequestException as e:
            logger.error(f"Slack Send Failed: {e}")
            return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("📢 Starting SlackAgent Self-Test...")
    # Test with a dummy URL if none exists, just to verify logic flow (it will fail connection but pass logic)
    test_url = os.getenv("SLACK_WEBHOOK_URL")
    if not test_url:
        print("⚠️ No Webhook URL found. Using dummy for logic test.")
        agent = SlackAgent(webhook_url="https://example.com/dummy_slack_hook")
    else:
        agent = SlackAgent()
        
    print(f"Agent Enabled: {agent.enabled}")
    res = agent.send_message("Hello from Sage 2.0 Self-Test")
    print(f"Send Result: {res}")
