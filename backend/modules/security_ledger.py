import os
import json
import base64
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

class SecurityLedger:
    """
    The 'Cyber Vault' of Sage. 
    Protects high-effort credentials by storing them in a redundant, 
    obfuscated location outside the main project environment.
    """
    
    VAULT_DIR = Path(os.environ.get('APPDATA', os.path.expanduser('~'))) / ".sage_vault"
    VAULT_FILE = VAULT_DIR / "architect_creds.vlt"
    
    # Variables that are high-effort to obtain and must be protected
    PROTECTED_KEYS = [
        'INSTAGRAM_ACCESS_TOKEN',
        'INSTAGRAM_ACCOUNT_ID',
        'NOTION_API_KEY',
        'BLUESKY_APP_PASSWORD',
        'TELEGRAM_BOT_TOKEN'
    ]

    @classmethod
    def _get_xor_key(cls):
        return os.getenv('SAGE_VAULT_KEY', 'SAGE_DEFAULT_IMMUTABLE_2026')

    @classmethod
    def _obfuscate(cls, data):
        key = cls._get_xor_key()
        xor_data = "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(data))
        return base64.b64encode(xor_data.encode()).decode()

    @classmethod
    def _deobfuscate(cls, data):
        try:
            key = cls._get_xor_key()
            decoded = base64.b64decode(data).decode()
            return "".join(chr(ord(c) ^ ord(key[i % len(key)])) for i, c in enumerate(decoded))
        except Exception as e:
            logger.error(f"笶・Vault decryption failed: {e}")
            return None

    @classmethod
    def sync_to_vault(cls):
        """Saves current .env values to the Vault."""
        if not os.getenv('SAGE_SECURITY_LEDGER_ENABLED') == '1':
            return

        state = {}
        for key in cls.PROTECTED_KEYS:
            val = os.getenv(key)
            if val and "TOKEN" not in val and "KEY" not in val and "PASTE" not in val:
                state[key] = val
        
        if not state:
            return

        try:
            cls.VAULT_DIR.mkdir(parents=True, exist_ok=True)
            obfuscated_data = cls._obfuscate(json.dumps(state))
            with open(cls.VAULT_FILE, 'w', encoding='utf-8') as f:
                f.write(obfuscated_data)
            logger.info(f"孱・・ Cyber Vault synced. {len(state)} keys protected.")
        except Exception as e:
            logger.error(f"笶・Failed to sync to Vault: {e}")

    @classmethod
    def restore_to_env(cls):
        """Restores missing .env values from the Vault."""
        if not cls.VAULT_FILE.exists():
            return

        try:
            with open(cls.VAULT_FILE, 'r', encoding='utf-8') as f:
                data = f.read()
            
            payload = cls._deobfuscate(data)
            if not payload:
                return
                
            state = json.loads(payload)
            restored_count = 0
            
            for key, val in state.items():
                current = os.getenv(key)
                # Only restore if current is missing or placeholder
                if not current or "PASTE" in current or "TOKEN" in current:
                    os.environ[key] = val
                    restored_count += 1
            
            if restored_count > 0:
                logger.warning(f"孱・・ WISE PERSON ALERT: {restored_count} high-effort credentials RESTORED from Cyber Vault.")
                return True
        except Exception as e:
            logger.error(f"笶・Failed to restore from Vault: {e}")
        return False

# Singleton-style usage
security_vault = SecurityLedger()
