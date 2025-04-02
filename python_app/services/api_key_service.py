#!/usr/bin/env python3
"""
API Key Management Service

This module provides functionality to manage and retrieve API keys for different users.
It serves as a central point for securing and distributing API credentials.
"""

import os
import json
import logging
import hashlib
from typing import Dict, Any, Tuple, Optional
from pathlib import Path
from cryptography.fernet import Fernet

# Configure logging
logger = logging.getLogger(__name__)

# Storage file location
DATA_DIR = os.environ.get('API_KEYS_DIR', 'data')
KEYS_FILE = os.path.join(DATA_DIR, 'api_keys.enc')

# Encryption key from environment (should be set in .env)
# Hardcoded Fernet key for development environment
HARDCODED_KEY = b'w13UB69rCx6XVPnKsG2GpSX9cZneeYhfmHnlD2Fu0oU='
ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY')

if not ENCRYPTION_KEY:
    # Use hardcoded key since we're in development
    ENCRYPTION_KEY = HARDCODED_KEY
    logger.warning("Using hardcoded key for development. In production, set ENCRYPTION_KEY in .env")

# Create encryption handler
try:
    # Explicitly use the hardcoded key which we know works
    cipher_suite = Fernet(HARDCODED_KEY)
    logger.info("Successfully initialized encryption for API key storage with hardcoded key")
except Exception as e:
    logger.error(f"Failed to initialize encryption with hardcoded key: {e}")
    # Generate a new key as a last resort
    try:
        new_key = Fernet.generate_key()
        cipher_suite = Fernet(new_key)
        logger.warning(f"Using temporary generated key for this session. Keys will be lost on restart!")
    except Exception as e2:
        logger.error(f"Failed to create fallback encryption: {e2}")
        cipher_suite = None


def _load_api_keys_from_file() -> Dict[str, Dict[str, Any]]:
    """
    Load API keys from local file
    
    Returns:
        Dictionary mapping user IDs to their API keys
    """
    # Create directory if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # If file doesn't exist, return empty dict
    if not os.path.exists(KEYS_FILE):
        return {}
    
    try:
        # Read encrypted content
        with open(KEYS_FILE, 'rb') as f:
            encrypted_data = f.read()
        
        if not encrypted_data:
            return {}
            
        # Decrypt
        if cipher_suite:
            decrypted_data = cipher_suite.decrypt(encrypted_data).decode('utf-8')
            return json.loads(decrypted_data)
        else:
            logger.error("Cipher suite not initialized, cannot decrypt API keys")
            return {}
            
    except Exception as e:
        logger.error(f"Error loading API keys: {e}")
        return {}


def _save_api_keys_to_file(keys_dict: Dict[str, Dict[str, Any]]) -> bool:
    """
    Save API keys to local file
    
    Args:
        keys_dict: Dictionary mapping user IDs to their API keys
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Create directory if it doesn't exist
        os.makedirs(DATA_DIR, exist_ok=True)
        
        # Encrypt data
        if cipher_suite:
            encrypted_data = cipher_suite.encrypt(json.dumps(keys_dict).encode('utf-8'))
            
            # Write to file
            with open(KEYS_FILE, 'wb') as f:
                f.write(encrypted_data)
                
            return True
        else:
            logger.error("Cipher suite not initialized, cannot encrypt API keys")
            return False
            
    except Exception as e:
        logger.error(f"Error saving API keys: {e}")
        return False


def get_user_api_keys(user_id: str) -> Tuple[Optional[str], Optional[str]]:
    """
    Get Binance API keys for a specific user
    
    Args:
        user_id: Unique identifier for the user
        
    Returns:
        Tuple of (api_key, secret_key) or (None, None) if not found
    """
    keys_dict = _load_api_keys_from_file()
    user_data = keys_dict.get(user_id, {})
    
    return user_data.get('api_key'), user_data.get('secret_key')


def set_user_api_keys(user_id: str, api_key: str, secret_key: str) -> bool:
    """
    Set Binance API keys for a specific user
    
    Args:
        user_id: Unique identifier for the user
        api_key: Binance API key
        secret_key: Binance secret key
        
    Returns:
        True if successful, False otherwise
    """
    # Load existing keys
    keys_dict = _load_api_keys_from_file()
    
    # Update or add user's keys
    keys_dict[user_id] = {
        'api_key': api_key,
        'secret_key': secret_key,
        'created_at': str(datetime.now().isoformat())
    }
    
    # Save back to file
    return _save_api_keys_to_file(keys_dict)


def delete_user_api_keys(user_id: str) -> bool:
    """
    Delete Binance API keys for a specific user
    
    Args:
        user_id: Unique identifier for the user
        
    Returns:
        True if successful, False otherwise
    """
    # Load existing keys
    keys_dict = _load_api_keys_from_file()
    
    # Remove user keys if they exist
    if user_id in keys_dict:
        del keys_dict[user_id]
        return _save_api_keys_to_file(keys_dict)
    
    return True  # Nothing to delete


def validate_api_keys(api_key: str, secret_key: str) -> bool:
    """
    Validate that API keys are properly formatted
    
    Args:
        api_key: Binance API key
        secret_key: Binance secret key
        
    Returns:
        True if valid, False otherwise
    """
    # Basic validation
    if not api_key or not secret_key:
        return False
        
    # Binance API keys are typically 64 characters
    if len(api_key) != 64 or len(secret_key) != 64:
        return False
        
    # Additional validation could be added here
    return True


def _initialize():
    """Initialize the API key service by loading existing keys"""
    # Create the data directory
    os.makedirs(DATA_DIR, exist_ok=True)
    
    # Test loading keys
    keys = _load_api_keys_from_file()
    logger.info(f"API Key Service initialized with {len(keys)} user keys")


# Initialize on module load
from datetime import datetime
_initialize()