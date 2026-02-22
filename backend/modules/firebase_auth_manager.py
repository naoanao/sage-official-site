import firebase_admin
from firebase_admin import auth, credentials
import os
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

# Singleton instance handle
_firebase_app = None

def init_firebase():
    global _firebase_app
    if _firebase_app:
        return _firebase_app
        
    project_id = os.getenv("FIREBASE_PROJECT_ID", "gen-lang-client-0437501320")
    
    # Check for service account key in environment or default path
    # For local dev, if no key is found, it will try to use default credentials (ADC)
    try:
        # Check if we have a path to a service account JSON
        key_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY")
        if key_path and os.path.exists(key_path):
            cred = credentials.Certificate(key_path)
            _firebase_app = firebase_admin.initialize_app(cred, {
                'projectId': project_id
            })
            logger.info(f"笨・Firebase Admin initialized with service account: {key_path}")
        else:
            # Fallback to default initialization (works in many envs if logged in via CLI)
            _firebase_app = firebase_admin.initialize_app(options={
                'projectId': project_id
            })
            logger.info(f"笨・Firebase Admin initialized with default credentials for: {project_id}")
    except Exception as e:
        logger.error(f"笶・Firebase Admin Init Failed: {e}")
        # FALLBACK: Use local-mode if auth fails to prevent white screen
        os.environ["SAGE_ADMIN_LOCAL_MODE"] = "1"
        logger.warning("笞・・Falling back to Local Mock Auth (Administrative Bypass Active)")
        
    return _firebase_app

def verify_token(id_token):
    """Verifies a Firebase ID Token from the frontend."""
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        logger.warning(f"Token Verification Failed: {e}")
        return None
