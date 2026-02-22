"""
Jira Integration Agent
Enables creating and managing Jira issues from Sage AI

Features:
- Create issues (Task, Bug, Story, Epic)
- Get issue details
- Update issue status
- Add comments
- Search issues
"""

import os
import logging
import requests
from typing import Dict, Optional, List
from dotenv import load_dotenv
from backend.modules.security_utils import SecurityUtils

logger = logging.getLogger(__name__)

class JiraAgent:
    """
    Jira Integration Agent
    
    Connects Sage AI to Jira Cloud via REST API
    """
    
    def __init__(self):
        """Initialize Jira Agent with credentials from environment"""
        load_dotenv()
        
        self.base_url = os.getenv("JIRA_URL")  # e.g., https://your-domain.atlassian.net
        self.username = os.getenv("JIRA_USERNAME")  # Jira account email
        raw_token = os.getenv("JIRA_API_TOKEN")  # API token from Jira
        self.project_key = os.getenv("JIRA_PROJECT_KEY", "SAGE")  # Default project
        
        # Secure Token Handling (Phase 4)
        self.api_token = self._resolve_token(raw_token)
        
        # Validate credentials
        if not all([self.base_url, self.username, self.api_token]):
            logger.warning("⚠️ Jira credentials not configured or failed validation. Running in MOCK MODE.")
            self.mock_mode = True
        else:
            self.mock_mode = False
            logger.info(f"✅ Jira Agent initialized: {self.base_url}")
            # Check if we successfully decrypted a token
            if raw_token and raw_token.startswith("enc:") and self.api_token:
                logger.info("🔐 Running with Encrypted Credentials (DPAPI)")

    def _resolve_token(self, token_val: str) -> Optional[str]:
        """Decrypt token if it's encrypted, otherwise return as is"""
        if not token_val:
            return None
            
        if token_val.startswith("enc:"):
            # It's an encrypted token
            encrypted_payload = token_val[4:] # Remove 'enc:' prefix
            decrypted = SecurityUtils.decrypt_data(encrypted_payload)
            if decrypted:
                return decrypted
            else:
                logger.error("❌ Failed to decrypt JIRA_API_TOKEN")
                return None
        return token_val
    
    def _get_headers(self) -> Dict:
        """Get request headers with authentication"""
        return {
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
    
    def _get_auth(self):
        """Get authentication tuple for requests"""
        return (self.username, self.api_token)
    
    def create_issue(self, 
                    summary: str, 
                    description: str = "",
                    issue_type: str = "Task",
                    priority: str = "Medium",
                    labels: Optional[List[str]] = None) -> Dict:
        """
        Create a new Jira issue
        
        Args:
            summary: Issue title/summary
            description: Issue description (supports Jira markup)
            issue_type: Type of issue (Task, Bug, Story, Epic)
            priority: Priority level (Highest, High, Medium, Low, Lowest)
            labels: Optional list of labels
        
        Returns:
            dict with status, issue_key, issue_url
        """
        if self.mock_mode:
            logger.info("🎭 MOCK MODE: Creating Jira issue")
            return {
                "status": "success",
                "issue_key": "SAGE-123",
                "issue_url": "https://mock.atlassian.net/browse/SAGE-123",
                "summary": summary,
                "mock": True
            }
        
        try:
            endpoint = f"{self.base_url}/rest/api/3/issue"
            
            payload = {
                "fields": {
                    "project": {
                        "key": self.project_key
                    },
                    "summary": summary,
                    "description": {
                        "type": "doc",
                        "version": 1,
                        "content": [
                            {
                                "type": "paragraph",
                                "content": [
                                    {
                                        "type": "text",
                                        "text": description
                                    }
                                ]
                            }
                        ]
                    },
                    "issuetype": {
                        "name": issue_type
                    }
                }
            }
            
            # Add priority if specified
            # if priority:
            # payload["fields"]["priority"] = {"name": priority}
            
            # Add labels if specified
            if labels:
                payload["fields"]["labels"] = labels
            

            
            response = requests.post(
                endpoint,
                json=payload,
                headers=self._get_headers(),
                auth=self._get_auth(),
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                issue_key = result.get("key")
                issue_url = f"{self.base_url}/browse/{issue_key}"
                
                logger.info(f"✅ Created Jira issue: {issue_key}")
                
                return {
                    "status": "success",
                    "issue_key": issue_key,
                    "issue_url": issue_url,
                    "issue_id": result.get("id"),
                    "summary": summary
                }
            else:
                logger.error(f"Jira API error: {response.status_code} - {response.text}")
                return {
                    "status": "error",
                    "message": f"Jira API returned {response.status_code}: {response.text[:200]}"
                }
                
        except Exception as e:
            logger.error(f"Failed to create Jira issue: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def get_issue(self, issue_key: str) -> Dict:
        """
        Get details of a Jira issue
        
        Args:
            issue_key: Issue key (e.g., SAGE-123)
        
        Returns:
            dict with issue details
        """
        if self.mock_mode:
            return {
                "status": "success",
                "issue_key": issue_key,
                "summary": "Mock Issue",
                "description": "This is a mock issue",
                "status": "To Do",
                "mock": True
            }
        
        try:
            endpoint = f"{self.base_url}/rest/api/3/issue/{issue_key}"
            
            response = requests.get(
                endpoint,
                headers=self._get_headers(),
                auth=self._get_auth(),
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                fields = result.get("fields", {})
                
                return {
                    "status": "success",
                    "issue_key": issue_key,
                    "summary": fields.get("summary"),
                    "description": self._extract_description(fields.get("description", {})),
                    "status": fields.get("status", {}).get("name"),
                    "assignee": fields.get("assignee", {}).get("displayName") if fields.get("assignee") else "Unassigned",
                    "priority": fields.get("priority", {}).get("name") if fields.get("priority") else "None",
                    "created": fields.get("created"),
                    "updated": fields.get("updated")
                }
            else:
                return {
                    "status": "error",
                    "message": f"Issue not found or API error: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Failed to get Jira issue: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def add_comment(self, issue_key: str, comment: str) -> Dict:
        """
        Add a comment to a Jira issue
        
        Args:
            issue_key: Issue key (e.g., SAGE-123)
            comment: Comment text
        
        Returns:
            dict with status
        """
        if self.mock_mode:
            return {
                "status": "success",
                "message": f"Comment added to {issue_key} (MOCK)",
                "mock": True
            }
        
        try:
            endpoint = f"{self.base_url}/rest/api/3/issue/{issue_key}/comment"
            
            payload = {
                "body": {
                    "type": "doc",
                    "version": 1,
                    "content": [
                        {
                            "type": "paragraph",
                            "content": [
                                {
                                    "type": "text",
                                    "text": comment
                                }
                            ]
                        }
                    ]
                }
            }
            
            response = requests.post(
                endpoint,
                json=payload,
                headers=self._get_headers(),
                auth=self._get_auth(),
                timeout=30
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Added comment to {issue_key}")
                return {
                    "status": "success",
                    "message": f"Comment added to {issue_key}"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to add comment: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"Failed to add comment: {e}")
            return {
                "status": "error",
                "message": str(e)
            }
    
    def _extract_description(self, description_obj: Dict) -> str:
        """Extract plain text from Jira description object"""
        try:
            if not description_obj:
                return ""
            
            content = description_obj.get("content", [])
            text_parts = []
            
            for block in content:
                if block.get("type") == "paragraph":
                    for item in block.get("content", []):
                        if item.get("type") == "text":
                            text_parts.append(item.get("text", ""))
            
            return " ".join(text_parts)
        except:
            return str(description_obj)


# For testing
if __name__ == "__main__":
    # Test in mock mode
    agent = JiraAgent()
    
    # Test: Create issue
    result = agent.create_issue(
        summary="Test issue from Sage AI",
        description="This is a test issue created by Sage AI",
        issue_type="Task",
        priority="Medium",
        labels=["sage-ai", "automation"]
    )
    print(f"✅ Create Issue: {result}")
    
    # Test: Get issue
    if result.get("issue_key"):
        issue = agent.get_issue(result["issue_key"])
        print(f"✅ Get Issue: {issue}")
    
    # Test: Add comment
    if result.get("issue_key"):
        comment_result = agent.add_comment(
            result["issue_key"],
            "This is an automated comment from Sage AI"
        )
        print(f"✅ Add Comment: {comment_result}")
