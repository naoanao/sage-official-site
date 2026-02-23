
import logging
import requests
import os
import json

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GoogleWorkspaceIntegration:
    """
    Integration for Google Workspace (Gmail, Sheets, Calendar, Drive) via Webhooks.
    Typically connects to a Google Apps Script (GAS) deployed as a Web App.
    """
    def __init__(self):
        # Allow user to set a specific GAS Webhook URL or use a generic automation hub URL
        self.webhook_url = os.getenv("GOOGLE_WORKSPACE_WEBHOOK_URL")
        if not self.webhook_url:
            # Fallback to Make/Zapier hooks if specific GAS hook isn't set, 
            # or log warning if direct integration is intended.
            logger.warning("GOOGLE_WORKSPACE_WEBHOOK_URL not set. Direct GAS integration disabled.")

    def trigger_action(self, action_type: str, payload: dict) -> dict:
        """
        Trigger a Workspace action.
        
        Args:
            action_type: "gmail_send", "sheet_append", "calendar_event", etc.
            payload: Parameters for the action (recipient, subject, body, etc.)
            
        Returns:
            dict: Response from the webhook
        """
        if not self.webhook_url:
            return {"status": "error", "message": "Google Workspace Webhook URL is not configured."}

        try:
            data = {
                "action": action_type,
                "payload": payload,
                "source": "Sage_GenAI_Agent"
            }
            
            logger.info(f"🚀 Triggering Workspace Action: {action_type} -> {self.webhook_url}")
            response = requests.post(self.webhook_url, json=data, timeout=10)
            
            if response.status_code == 200:
                try:
                    return {"status": "success", "data": response.json()}
                except:
                     return {"status": "success", "data": response.text}
            else:
                return {"status": "error", "message": f"Webhook returned {response.status_code}: {response.text}"}

        except Exception as e:
            logger.error(f"Workspace Trigger Failed: {e}")
            return {"status": "error", "message": str(e)}

    def send_email(self, recipient, subject, body):
        return self.trigger_action("gmail_send", {
            "recipient": recipient,
            "subject": subject,
            "body": body
        })

    def append_sheet_row(self, sheet_id, row_data):
        return self.trigger_action("sheet_append", {
            "sheet_id": sheet_id,
            "row_data": row_data
        })
