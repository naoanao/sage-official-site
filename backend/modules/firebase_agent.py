import os
import logging
from pathlib import Path
import json

logger = logging.getLogger(__name__)

class FirebaseAgent:
    """
    Agent for generating Firebase configuration files.
    """
    def __init__(self, base_dir="C:/Users/nao/Desktop/Sage_Final_Unified/generated_apps"):
        self.base_dir = Path(base_dir)

    def init_config(self, project_name: str, firebase_project_id: str = "sage-project") -> dict:
        """
        Generates firebase.json and firestore.indexes.json
        """
        try:
            project_path = self.base_dir / project_name
            if not project_path.exists():
                return {"status": "error", "message": f"Project '{project_name}' not found."}

            # firebase.json
            firebase_json = {
                "firestore": {
                    "rules": "firestore.rules",
                    "indexes": "firestore.indexes.json"
                },
                "hosting": {
                    "public": "build/web",
                    "ignore": [
                        "firebase.json",
                        "**/.*",
                        "**/node_modules/**"
                    ]
                }
            }
            (project_path / "firebase.json").write_text(json.dumps(firebase_json, indent=2))

            # firestore.rules
            firestore_rules = """rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}"""
            (project_path / "firestore.rules").write_text(firestore_rules)
            
            logger.info(f"✅ Firebase config generated for {project_name}")
            return {
                "status": "success",
                "message": f"Initialized Firebase for {project_name}",
                "path": str(project_path / "firebase.json")
            }

        except Exception as e:
            logger.error(f"Failed to init Firebase: {e}")
            return {"status": "error", "message": str(e)}
