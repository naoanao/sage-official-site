import requests
import logging
import json
import os

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ZapierAgent:
    """
    Zapier Agent for triggering workflows via Webhooks.
    """
    def __init__(self, webhook_url=None):
        self.webhook_url = webhook_url or os.getenv("ZAPIER_WEBHOOK_URL")
        # In a real scenario, we might manage multiple webhooks for different actions
        self.webhooks = {} 

    def register_webhook(self, name, url):
        """Register a new webhook URL with a name."""
        self.webhooks[name] = url
        logger.info(f"Registered Zapier Webhook: {name}")

    def trigger(self, webhook_name, data={}):
        """
        Trigger a Zapier webhook.
        """
        url = self.webhooks.get(webhook_name) or self.webhook_url
        
        if not url:
            return {"status": "error", "message": f"Webhook '{webhook_name}' not found and no default URL set."}

        try:
            logger.info(f"Triggering Zapier Webhook: {webhook_name}")
            response = requests.post(url, json=data, timeout=10)
            response.raise_for_status()
            return {"status": "success", "response": response.text}
        except requests.exceptions.RequestException as e:
            logger.error(f"Zapier Trigger Failed: {e}")
            return {"status": "error", "message": str(e)}

    def trigger_automation(self, action, details):
        """
        Generic automation trigger (compatible with Orchestrator).
        """
        # Map generic actions to specific webhooks if needed
        # For now, we just send everything to a 'default' webhook if it exists
        return self.trigger("default", {"action": action, "details": details})

if __name__ == "__main__":
    print("⚡ Starting ZapierAgent Self-Test...")
    agent = ZapierAgent()
    
    # Test with a dummy webhook (will fail, but verifies logic)
    agent.register_webhook("test_hook", "https://hooks.zapier.com/hooks/catch/123456/abcdef/")
    
    res = agent.trigger("test_hook", {"message": "Hello from Sage 2.0"})
    print(f"Trigger Result: {res}")
