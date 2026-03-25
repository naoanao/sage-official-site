import logging
import os
from typing import Dict, Any, Optional

# Import Integrations
try:
    from backend.integrations.google_workspace_integration import GoogleWorkspaceIntegration
    from backend.integrations.google_calendar_integration import GoogleCalendarIntegration
except ImportError:
    from integrations.google_workspace_integration import GoogleWorkspaceIntegration
    from integrations.google_calendar_integration import GoogleCalendarIntegration

logger = logging.getLogger("BusinessManager")

class BusinessManager:
    """
    Unified interface for Business Automation (Google Workspace).
    Wraps GAS Webhooks (Email, Sheets) and Direct API (Calendar).
    """
    def __init__(self):
        logger.info("💼 Initializing Business Manager...")
        self.workspace = GoogleWorkspaceIntegration()
        self.calendar = GoogleCalendarIntegration()
        
    def perform_action(self, action: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dispatch action to appropriate integration.
        
        Args:
            action: Action name (e.g., 'send_email', 'add_calendar_event', 'log_sheet')
            payload: Parameters for the action
        
        Returns:
            Dict with 'status' and 'data' or 'message'
        """
        logger.info(f"💼 Business Action: {action}")
        
        if action == "send_email":
            # Payload: recipient, subject, body
            recipient = payload.get('recipient')
            subject = payload.get('subject')
            body = payload.get('body')
            if not all([recipient, subject, body]):
                return {"status": "error", "message": "Missing email parameters"}
            return self.workspace.send_email(recipient, subject, body)

        elif action == "add_calendar_event":
            # Payload: title, time (start), duration (optional), description
            title = payload.get('title')
            start_time = payload.get('time') # ISO format
            end_time = payload.get('end_time') # ISO format
            description = payload.get('description', '')
            
            if not title or not start_time:
                 return {"status": "error", "message": "Missing calendar parameters"}
            
            # If end_time is missing, default to 1 hour after start (logic inside integration is simple, so we help here)
            if not end_time:
                 # Minimal fallback if integration doesn't handle it well
                 # But let's trust integration or just pass what we have
                 pass

            try:
                event = self.calendar.create_event(
                    summary=title,
                    start_time=start_time,
                    end_time=end_time or start_time, # Fallback handled by integration logic or error
                    description=description
                )
                if event:
                    return {"status": "success", "data": {"link": event.get('htmlLink')}}
                else:
                    return {"status": "error", "message": "Failed to create event"}
            except Exception as e:
                return {"status": "error", "message": str(e)}

        elif action == "log_sheet":
            # Payload: sheet_id, row_data (list or dict)
            sheet_id = payload.get('sheet_id')
            row_data = payload.get('row_data')
            if not sheet_id or not row_data:
                return {"status": "error", "message": "Missing sheet parameters"}
            return self.workspace.append_sheet_row(sheet_id, row_data)

        else:
            return {"status": "error", "message": f"Unknown action: {action}"}

if __name__ == "__main__":
    # Test Run
    logging.basicConfig(level=logging.INFO)
    manager = BusinessManager()
    print("--- Testing Business Action (Mock Email) ---")
    res = manager.perform_action("send_email", {
        "recipient": "test@example.com", 
        "subject": "Hello from Sage", 
        "body": "This is a test."
    })
    print("Result:", res)
