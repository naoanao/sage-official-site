import os
import requests
import logging
from datetime import datetime
from backend.utils.env_utils import update_env_file

logger = logging.getLogger("InstagramTokenRefresher")

def refresh_instagram_token():
    """
    Refreshes the long-lived Instagram access token.
    Long-lived tokens are valid for 60 days and can be refreshed.
    """
    token = os.getenv("INSTAGRAM_ACCESS_TOKEN")
    app_id = os.getenv("INSTAGRAM_APP_ID")
    app_secret = os.getenv("INSTAGRAM_APP_SECRET")
    
    if not all([token, app_id, app_secret]):
        logger.error("Missing INSTAGRAM configuration in .env. Cannot refresh token.")
        return

    logger.info("🔄 Refreshing Instagram long-lived token...")
    
    # Endpoint for refreshing a long-lived token (Instagram Graph API / Business Login)
    # Ref: https://developers.facebook.com/docs/facebook-login/guides/access-tokens/get-long-lived/
    url = "https://graph.facebook.com/v18.0/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": app_id,
        "client_secret": app_secret,
        "fb_exchange_token": token
    }
    
    try:
        res = requests.get(url, params=params, timeout=10)
        data = res.json()
        
        if res.status_code == 200:
            new_token = data.get("access_token")
            if new_token:
                # Update current process env
                os.environ["INSTAGRAM_ACCESS_TOKEN"] = new_token
                # Update .env file
                update_env_file("INSTAGRAM_ACCESS_TOKEN", new_token)
                
                expires_in = data.get("expires_in", "unknown")
                logger.info(f"✅ Instagram token refreshed successfully. Expires in: {expires_in} seconds.")
                print(f"✅ Instagramトークン更新完了: {datetime.now()}")
                return True
            else:
                logger.error(f"❌ Token refresh response missing access_token: {data}")
        else:
            logger.error(f"❌ Failed to refresh Instagram token: {data}")
            
    except Exception as e:
        logger.error(f"❌ Exception during Instagram token refresh: {e}")
        
    return False

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    refresh_instagram_token()
