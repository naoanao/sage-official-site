import os
import requests
import json
import opik
from typing import Dict, Any, Optional, List
from datetime import datetime

# Configure Opik
opik.configure(use_local=False)

class DifyIntegration:
    def __init__(self):
        self.name = "Dify Integration"
        self.api_key = os.getenv("DIFY_API_KEY")
        self.api_url = os.getenv("DIFY_API_URL", "https://api.dify.ai/v1")
        
        if not self.api_key:
            print("[Dify] Warning: DIFY_API_KEY not set. Integration will not work.")
    
    def _get_headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    @opik.track(name="dify_trigger_workflow")
    def trigger_workflow(self, app_id: str, inputs: Dict[str, Any], user: str = "default_user") -> Dict[str, Any]:
        if not self.api_key:
            print(f"👾 [MOCK] Dify Workflow Triggered: {app_id} | Inputs: {inputs}")
            # Sage Quality Mock Response
            return {
                "status": "succeeded",
                "outputs": {
                    "analysis": "Based on the input data, the system has identified three critical optimization vectors.",
                    "score": 98.5,
                    "recommendation": "Proceed with immediate implementation of Phase 2 strategies.",
                    "details": "The workflow successfully processed 150 data points and correlated them with historical trends."
                }
            }
        
        print(f"[Dify] Triggering workflow: {app_id}")
        # ... (rest of real implementation) ...
        endpoint = f"{self.api_url}/workflows/run"
        payload = {"inputs": inputs, "response_mode": "blocking", "user": user}
        try:
            response = requests.post(endpoint, headers=self._get_headers(), json=payload, timeout=120)
            response.raise_for_status()
            result = response.json()
            opik.log({"app_id": app_id, "inputs": inputs, "outputs": result.get("outputs", {}), "status": result.get("status")})
            return result
        except Exception as e:
            print(f"[Dify] Workflow execution failed: {e}")
            return {"error": str(e)}

    @opik.track(name="dify_chat_completion")
    def chat_completion(self, app_id: str, query: str, conversation_id: Optional[str] = None, user: str = "default_user") -> Dict[str, Any]:
        if not self.api_key:
            print(f"👾 [MOCK] Dify Chat: {query[:50]}...")
            return {"answer": f"This is a mock response from Dify for query: '{query}'", "conversation_id": "mock_conv_id"}

        print(f"[Dify] Chat completion: {query[:50]}...")
        # ... (rest of real implementation) ...
        endpoint = f"{self.api_url}/chat-messages"
        payload = {"inputs": {}, "query": query, "response_mode": "blocking", "user": user}
        if conversation_id: payload["conversation_id"] = conversation_id
        try:
            response = requests.post(endpoint, headers=self._get_headers(), json=payload, timeout=60)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"[Dify] Chat completion failed: {e}")
            return {"error": str(e)}

    @opik.track(name="dify_get_conversation_history")
    def get_conversation_history(self, conversation_id: str, user: str = "default_user") -> List[Dict[str, Any]]:
        if not self.api_key:
            return [{"id": "mock_msg_1", "query": "Mock Query", "answer": "Mock Answer"}]
        
        # ... (rest of real implementation) ...
        endpoint = f"{self.api_url}/messages"
        params = {"conversation_id": conversation_id, "user": user}
        try:
            response = requests.get(endpoint, headers=self._get_headers(), params=params, timeout=30)
            response.raise_for_status()
            return response.json().get("data", [])
        except Exception as e:
            return [{"error": str(e)}]

    @opik.track(name="dify_list_apps")
    def list_apps(self) -> List[Dict[str, Any]]:
        if not self.api_key:
            return [{"id": "mock_app_1", "name": "Mock App"}]
            
        # ... (rest of real implementation) ...
        endpoint = f"{self.api_url}/apps"
        try:
            response = requests.get(endpoint, headers=self._get_headers(), timeout=30)
            response.raise_for_status()
            return response.json().get("data", [])
        except Exception as e:
            return [{"error": str(e)}]

# Singleton instance
dify_integration = DifyIntegration()
