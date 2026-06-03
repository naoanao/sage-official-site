import os
import logging
import time
from pathlib import Path

logger = logging.getLogger(__name__)


def _load_env():
    try:
        from dotenv import dotenv_values
        return dotenv_values()
    except Exception:
        return {}


class YouTubeUploader:
    """
    Uploads videos to YouTube as Shorts via YouTube Data API v3.
    Authentication: OAuth 2.0 with refresh token (offline access).

    Required env vars:
        YOUTUBE_CLIENT_ID       - Google OAuth2 Client ID
        YOUTUBE_CLIENT_SECRET   - Google OAuth2 Client Secret
        YOUTUBE_REFRESH_TOKEN   - OAuth2 Refresh Token (offline)

    Flow:
        1. Exchange refresh token → access token
        2. Upload video via resumable upload (multipart)
        3. Set title, description, tags, category, privacyStatus
        4. Mark as #Shorts by appending #Shorts to description

    Shorts requirements (auto-classified by YouTube):
        - Vertical video (portrait, 9:16 recommended)
        - Duration <= 60 seconds
        - Title/description contains #Shorts (helps discovery)
    """

    UPLOAD_URL = "https://www.googleapis.com/upload/youtube/v3/videos"
    TOKEN_URL = "https://oauth2.googleapis.com/token"
    CATEGORY_EDUCATION = "27"   # Education
    CATEGORY_HOWTO = "26"       # Howto & Style

    def __init__(self):
        env = _load_env()
        self.client_id = env.get("YOUTUBE_CLIENT_ID") or os.getenv("YOUTUBE_CLIENT_ID")
        self.client_secret = env.get("YOUTUBE_CLIENT_SECRET") or os.getenv("YOUTUBE_CLIENT_SECRET")
        self.refresh_token = env.get("YOUTUBE_REFRESH_TOKEN") or os.getenv("YOUTUBE_REFRESH_TOKEN")
        self._access_token = None
        self._token_expiry = 0

    def _is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret and self.refresh_token)

    def _get_access_token(self) -> str | None:
        """Exchange refresh token for access token (cached until expiry)."""
        if self._access_token and time.time() < self._token_expiry - 60:
            return self._access_token

        import requests
        resp = requests.post(self.TOKEN_URL, data={
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": self.refresh_token,
            "grant_type": "refresh_token",
        }, timeout=15)
        data = resp.json()

        if "access_token" not in data:
            logger.error(f"❌ Failed to get YouTube access token: {data}")
            return None

        self._access_token = data["access_token"]
        self._token_expiry = time.time() + data.get("expires_in", 3600)
        logger.info("✅ YouTube access token refreshed.")
        return self._access_token

    def upload_short(
        self,
        video_path: str,
        title: str,
        description: str = "",
        tags: list[str] = None,
        category_id: str = None,
        privacy: str = "public",
        notify_subscribers: bool = True,
    ) -> dict:
        """
        Upload a video file to YouTube as a Short.

        Args:
            video_path      : Path to the local MP4 file
            title           : Video title (max 100 chars)
            description     : Video description (#Shorts appended automatically)
            tags            : List of tag strings
            category_id     : YouTube category ID (default: Education "27")
            privacy         : "public" | "unlisted" | "private"
            notify_subscribers: Whether to notify channel subscribers

        Returns:
            {"success": True, "id": video_id, "url": youtube_url}
            {"success": False, "error": message}
        """
        import requests

        if not self._is_configured():
            logger.warning("⚠️ YouTube credentials not configured.")
            return {"success": False, "error": "Missing YouTube OAuth credentials"}

        if not Path(video_path).exists():
            return {"success": False, "error": f"Video file not found: {video_path}"}

        access_token = self._get_access_token()
        if not access_token:
            return {"success": False, "error": "Failed to obtain access token"}

        # Ensure #Shorts tag is present for discovery
        if "#Shorts" not in description and "#shorts" not in description:
            description = (description + "\n\n#Shorts").strip()

        body = {
            "snippet": {
                "title": title[:100],
                "description": description[:5000],
                "tags": (tags or []) + ["Shorts", "AI", "automation"],
                "categoryId": category_id or self.CATEGORY_EDUCATION,
            },
            "status": {
                "privacyStatus": privacy,
                "selfDeclaredMadeForKids": False,
                "notifySubscribers": notify_subscribers,
            },
        }

        headers = {
            "Authorization": f"Bearer {access_token}",
            "X-Upload-Content-Type": "video/mp4",
        }

        file_size = Path(video_path).stat().st_size
        headers["X-Upload-Content-Length"] = str(file_size)

        # Step 1: Initiate resumable upload session
        logger.info(f"📤 Initiating YouTube upload: {title[:50]}...")
        init_resp = requests.post(
            f"{self.UPLOAD_URL}?uploadType=resumable&part=snippet,status",
            headers=headers,
            json=body,
            timeout=30,
        )

        if init_resp.status_code not in (200, 201):
            logger.error(f"❌ Upload initiation failed: {init_resp.text}")
            return {"success": False, "error": f"Upload init failed: {init_resp.status_code} {init_resp.text[:200]}"}

        upload_url = init_resp.headers.get("Location")
        if not upload_url:
            return {"success": False, "error": "No upload URL returned"}

        # Step 2: Upload video bytes
        logger.info(f"⬆️ Uploading video ({file_size // 1024 // 1024} MB)...")
        with open(video_path, "rb") as f:
            upload_resp = requests.put(
                upload_url,
                data=f,
                headers={"Content-Type": "video/mp4", "Content-Length": str(file_size)},
                timeout=300,  # 5 min for large files
            )

        result = upload_resp.json() if upload_resp.content else {}

        if upload_resp.status_code in (200, 201) and "id" in result:
            video_id = result["id"]
            url = f"https://www.youtube.com/shorts/{video_id}"
            logger.info(f"✅ YouTube Shorts uploaded! ID: {video_id}")
            logger.info(f"   URL: {url}")
            return {"success": True, "id": video_id, "url": url}
        else:
            logger.error(f"❌ Upload failed: {upload_resp.status_code} {upload_resp.text[:300]}")
            return {"success": False, "error": f"Upload failed: {upload_resp.status_code} {result}"}


if __name__ == "__main__":
    bot = YouTubeUploader()
    if not bot._is_configured():
        print("⚠️ No YouTube credentials. Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN in .env")
        print("📺 [MOCK] Would upload to YouTube Shorts.")
    else:
        print("✅ YouTube credentials found. Ready to upload.")
