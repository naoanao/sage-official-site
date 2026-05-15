import os
import boto3
import logging
from botocore.exceptions import NoCredentialsError

logger = logging.getLogger(__name__)

class CloudflareR2Uploader:
    """
    Handles uploading images to Cloudflare R2 via internal S3 API (boto3)
    Used to generate public HTTP URLs for Instagram Graph API.
    """
    def __init__(self):
        self.account_id = os.getenv("CF_R2_ACCOUNT_ID")
        self.access_key = os.getenv("CF_R2_ACCESS_KEY")
        self.secret_key = os.getenv("CF_R2_SECRET_KEY")
        self.bucket = os.getenv("CF_R2_BUCKET")
        self.public_url = os.getenv("CF_R2_PUBLIC_URL") # e.g. https://pub-xxxxxx.r2.dev

        self.s3 = None
        if self.account_id and self.access_key and self.secret_key:
            try:
                self.s3 = boto3.client(
                    "s3",
                    endpoint_url=f"https://{self.account_id}.r2.cloudflarestorage.com",
                    aws_access_key_id=self.access_key,
                    aws_secret_access_key=self.secret_key,
                    region_name="auto"
                )
            except Exception as e:
                logger.error(f"❌ Failed to init Cloudflare R2: {e}")

    def upload_file(self, file_path: str, object_name: str = None) -> str:
        """
        Uploads a local file to R2 and returns its public URL.
        Returns None if upload fails or R2 is not configured.
        """
        if not self.s3 or not self.bucket:
            logger.warning("⚠️ R2 is not configured. Cannot upload to R2.")
            return None

        if object_name is None:
            object_name = os.path.basename(file_path)

        # Detect content type
        content_type = "image/jpeg"
        if file_path.lower().endswith(".png"):
            content_type = "image/png"
        elif file_path.lower().endswith(".webp"):
            content_type = "image/webp"
        elif file_path.lower().endswith(".mp4"):
            content_type = "video/mp4"
        elif file_path.lower().endswith(".mov"):
            content_type = "video/quicktime"

        try:
            # R2 doesn't support generic ACLs easily, but standard put works.
            # Make sure bucket is public or public URL is routed.
            ExtraArgs = {'ContentType': content_type}
            
            self.s3.upload_file(file_path, self.bucket, object_name, ExtraArgs=ExtraArgs)
            
            if self.public_url:
                final_url = f"{self.public_url.rstrip('/')}/{object_name}"
                logger.info(f"✅ Uploaded to R2: {final_url}")
                return final_url
            else:
                logger.warning("R2 public URL not configured. Returning None.")
                return None
                
        except FileNotFoundError:
            logger.error(f"❌ File not found: {file_path}")
            return None
        except NoCredentialsError:
            logger.error("❌ R2 Credentials not available")
            return None
        except Exception as e:
            logger.error(f"❌ R2 Upload error: {e}")
            return None
