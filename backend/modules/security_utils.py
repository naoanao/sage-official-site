import os
import base64
import logging
from typing import Optional
try:
    import win32crypt
    HAS_DPAPI = True
except ImportError:
    HAS_DPAPI = False

try:
    from cryptography.fernet import Fernet
    HAS_FERNET = True
except ImportError:
    HAS_FERNET = False

logger = logging.getLogger(__name__)

class SecurityUtils:
    """
    Security Utilities for Sage AI
    
    Provides methods for secure credential storage using Windows DPAPI or Fernet encryption.
    Physical AI Principle: Bind credentials to the physical device.
    """
    
    @staticmethod
    def encrypt_data(data: str) -> Optional[str]:
        """
        Encrypt data using best available method (DPAPI > Fernet)
        """
        if not data:
            return None
            
        try:
            data_bytes = data.encode('utf-8')
            
            if HAS_DPAPI:
                # Windows DPAPI - CryptProtectData
                # This binds the data to the current user on the current machine.
                encrypted_bytes = win32crypt.CryptProtectData(data_bytes, None, None, None, None, 0)
                # Return as hex string for storage/transmission
                return encrypted_bytes.hex()
            
            elif HAS_FERNET:
                # Fallback to Fernet (Requires key management, less optimal for this use case but works)
                # For this MVP, we generate a key derived from machine-specific info if possible, 
                # or utilize a local key file.
                key = SecurityUtils._get_fernet_key()
                f = Fernet(key)
                encrypted_bytes = f.encrypt(data_bytes)
                return encrypted_bytes.decode('utf-8')
            
            else:
                logger.warning("⚠️ No encryption method available. Storing logic failed.")
                return None
                
        except Exception as e:
            logger.error(f"Encryption failed: {e}")
            return None

    @staticmethod
    def decrypt_data(encrypted_data_str: str) -> Optional[str]:
        """
        Decrypt data using best available method
        """
        if not encrypted_data_str:
            return None
            
        try:
            if HAS_DPAPI:
                # Expect hex string
                try:
                    encrypted_bytes = bytes.fromhex(encrypted_data_str)
                    decrypted_bytes = win32crypt.CryptUnprotectData(encrypted_bytes, None, None, None, 0)[1]
                    return decrypted_bytes.decode('utf-8')
                except ValueError:
                    # Maybe it wasn't hex? Or wrong format
                    pass
            
            if HAS_FERNET:
                # Try Fernet
                key = SecurityUtils._get_fernet_key()
                f = Fernet(key)
                decrypted_bytes = f.decrypt(encrypted_data_str.encode('utf-8'))
                return decrypted_bytes.decode('utf-8')
                
        except Exception as e:
            # logger.error(f"Decryption failed: {e}") # Don't log sensitive info
            pass
            
        return None

    @staticmethod
    def _get_fernet_key() -> bytes:
        """
        Get or generate a Fernet key stored locally.
        (Fallback method, DPAPI is preferred)
        """
        key_file = "sage_security.key"
        if os.path.exists(key_file):
            with open(key_file, "rb") as f:
                return f.read()
        else:
            key = Fernet.generate_key()
            with open(key_file, "wb") as f:
                f.write(key)
            return key

    @staticmethod
    def auto_secure_env(env_path: str = ".env"):
        """
        Autonomously check .env and encrypt sensitive keys (JIRA_API_TOKEN).
        This allows Sage to 'secure itself' without user intervention.
        """
        if not os.path.exists(env_path):
            return {"status": "skipped", "message": ".env not found"}
        
        updated = False
        new_lines = []
        
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            
            for line in lines:
                # Target JIRA_API_TOKEN for now
                if line.strip().startswith("JIRA_API_TOKEN="):
                    key, val = line.strip().split("=", 1)
                    val = val.strip()
                    # Check if already encrypted
                    if not val.startswith("enc:"):
                        logger.info("🔒 Sage is automatically encrypting JIRA_API_TOKEN...")
                        encrypted = SecurityUtils.encrypt_data(val)
                        if encrypted:
                            new_lines.append(f"{key}=enc:{encrypted}\n")
                            updated = True
                            logger.info("✅ Encryption successful.")
                        else:
                            new_lines.append(line) # Keep original if encryption fails
                            logger.error("❌ Encryption check failed.")
                    else:
                        new_lines.append(line)
                else:
                    new_lines.append(line)
            
            if updated:
                with open(env_path, "w", encoding="utf-8") as f:
                    f.writelines(new_lines)
                return {"status": "secured", "message": "JIRA_API_TOKEN has been encrypted."}
            else:
                return {"status": "secure", "message": "Credentials already secured."}
                
        except Exception as e:
            logger.error(f"Auto-secure failed: {e}")
            return {"status": "error", "message": str(e)}
