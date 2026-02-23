
import os
import requests
import logging
from typing import Dict, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ZapierIntegration:
    """
    Integration with Zapier via Webhooks.
    allows Sage to trigger Zaps.
    """
    def __init__(self):
        self.default_webhook_url = os.getenv("ZAPIER_WEBHOOK_URL")

    def trigger_zap(self, event_name: str, data: Dict[str, Any], webhook_url: Optional[str] = None) -> Dict[str, Any]:
        """
        Trigger a Zapier Zap via webhook.
        
        Args:
            event_name: Name of the event (metadata)
            data: Data payload
            webhook_url: Optional override URL
        
        Returns:
            Dict containing status
        """
        target_url = webhook_url or self.default_webhook_url
        
        if not target_url:
            logger.warning("Zapier Webhook URL is not configured.")
            return {
                "status": "error", 
                "message": "Zapier Webhook URL not configured. Set ZAPIER_WEBHOOK_URL in .env"
            }

        payload = {
            "source": "Sage_AI",
            "event": event_name,
            "payload": data
        }

        try:
            logger.info(f"⚡ Triggering Zapier Zap: {event_name}...")
            response = requests.post(target_url, json=payload, timeout=10)
            
            if response.status_code >= 200 and response.status_code < 300:
                logger.info(f"✅ Zapier Zap Triggered Successfully")
                return {
                    "status": "success",
                    "code": response.status_code,
                    "response": response.json() if response.content else "OK"
                }
            else:
                logger.error(f"❌ Zapier Error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "code": response.status_code,
                    "message": response.text
                }
                
        except Exception as e:
            logger.error(f"❌ Zapier Connection Failed: {e}")
            return {
                "status": "error", 
                "message": str(e)
            }

# Singleton
zapier_client = ZapierIntegration()
