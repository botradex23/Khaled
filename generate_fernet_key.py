#!/usr/bin/env python3
"""
Generate a valid Fernet encryption key

This script generates a valid Fernet key and outputs it for use in the .env file
"""

from cryptography.fernet import Fernet
import os
import base64

def generate_key():
    """Generate and print a valid Fernet key"""
    # Generate a new Fernet key
    key = Fernet.generate_key()
    key_str = key.decode('utf-8')
    
    print(f"Generated Fernet key: {key_str}")
    print("\nCopy the above key and add it to your .env file as:")
    print(f"ENCRYPTION_KEY={key_str}")
    
    # Validate the key
    try:
        # Try to create a Fernet instance with the key
        fernet = Fernet(key)
        test_data = b"Test encryption"
        encrypted = fernet.encrypt(test_data)
        decrypted = fernet.decrypt(encrypted)
        
        assert decrypted == test_data, "Encryption/decryption test failed"
        print("\n✅ Key validation successful - this is a valid Fernet key")
    except Exception as e:
        print(f"\n❌ Key validation failed: {e}")
        
if __name__ == "__main__":
    generate_key()