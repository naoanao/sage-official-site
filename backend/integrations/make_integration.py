
import os
import requests
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class MakeIntegration:
    """
    Integration with Make.com (formerly Integromat) via Webhooks.
    Allows Sage to trigger complex workflows defined in Make.
    """
    def __init__(self):
        self.default_webhook_url = os.getenv("MAKE_WEBHOOK_URL")

    def trigger_scenario(self, scenario_name: str, data: Dict[str, Any], webhook_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Trigger a Make.com scenario via webhook.
        
        Args:
            scenario_name: Name/ID of the event to trigger (used as payload metadata)
            data: Dictionary of data to send to the webhook
            webhook_url: Optional override URL. If None, uses env var MAKE_WEBHOOK_URL.
        
        Returns:
            Dict containing status and response
        """
        target_url = webhook_url or self.default_webhook_url
        
        if not target_url:
            logger.warning("Make.com Webhook URL is not configured.")
            return {
                "status": "error", 
                "message": "Make.com Webhook URL not configured. Set MAKE_WEBHOOK_URL in .env or provide it explicitly."
            }

        payload = {
            "source": "Sage_AI",
            "event": scenario_name,
            "data": data,
            "timestamp": "iso-timestamp-here" # TODO: Add timestamp
        }

        try:
            logger.info(f"🚀 Triggering Make.com Scenario: {scenario_name} at {target_url[:20]}...")
            response = requests.post(target_url, json=payload, timeout=10)
            
            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"✅ Make.com Scenario Triggered Successfully")
                return {
                    "status": "success",
                    "code": response.status_code,
                    "response": response.text
                }
            else:
                logger.error(f"❌ Make.com Error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "code": response.status_code,
                    "message": response.text
                }
                
        except Exception as e:
            logger.error(f"❌ Make.com Connection Failed: {e}")
            return {
                "status": "error", 
                "message": str(e)
            }

# Singleton
make_client = MakeIntegration()
