from cryptography.fernet import Fernet
from base64 import b64encode, b64decode
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def encrypt_value(value: str) -> str:
    """Encrypt a string value"""
    if not value:
        return ''
    try:
        f = Fernet(settings.ENCRYPTION_KEY)
        return b64encode(f.encrypt(value.encode())).decode()
    except Exception as e:
        logger.error(f"Encryption error: {e}")
        return ''

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a string value"""
    if not encrypted_value:
        return ''
    try:
        f = Fernet(settings.ENCRYPTION_KEY)
        return f.decrypt(b64decode(encrypted_value)).decode()
    except Exception as e:
        logger.error(f"Decryption failed: {e}")
        return '' 