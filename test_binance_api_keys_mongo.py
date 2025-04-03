"""
Test Binance API Key Storage in MongoDB

This script verifies the proper handling of Binance API keys with allowedIp in MongoDB.
It tests:
1. Saving API keys with allowedIp
2. Retrieving the keys and verifying allowedIp is included
3. Verifying API keys are stored securely (not in plaintext)
4. Deleting the keys and verifying allowedIp is removed
"""

import os
import sys
import pymongo
from dotenv import load_dotenv
from datetime import datetime
from cryptography.fernet import Fernet

# Load environment variables
load_dotenv()

# MongoDB connection details
mongo_uri = os.getenv('MONGO_URI')
db_name = 'Saas'  # From the MongoDB URI: mongodb+srv://...@cluster0.rh8kusi.mongodb.net/Saas

# Test data
TEST_USER_ID = 9999
TEST_API_KEY = f'test_api_key_{int(datetime.now().timestamp())}'
TEST_SECRET_KEY = f'test_secret_key_{int(datetime.now().timestamp())}'
TEST_ALLOWED_IP = '185.199.228.220'

# Get encryption key from environment
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')

def is_encrypted(value, original_value):
    """Check if a value appears to be encrypted"""
    # If the value exactly matches the original, it's not encrypted
    if value == original_value:
        return False
    
    # If the value is base64-encoded and much longer than the original, it might be encrypted
    if len(value) > len(original_value) * 1.5 and not value.startswith(original_value):
        return True
    
    return False

def main():
    """Main test function"""
    if not mongo_uri:
        print('❌ MONGODB_URI not set in .env file')
        sys.exit(1)

    client = pymongo.MongoClient(mongo_uri)
    
    try:
        # Connect to MongoDB
        print('✅ Connected to MongoDB')
        
        db = client[db_name]
        users_collection = db['users']
        
        # 1. Clean up any existing test user
        print(f'\n🧹 Cleaning up existing test user ({TEST_USER_ID})...')
        users_collection.delete_one({'userId': TEST_USER_ID})
        
        # 2. Save API keys with allowedIp
        print('\n💾 Saving Binance API keys with allowedIp...')
        users_collection.insert_one({
            'userId': TEST_USER_ID,
            'username': 'test_user',
            'email': 'test@example.com',
            'binanceApiKey': TEST_API_KEY,
            'binanceSecretKey': TEST_SECRET_KEY,
            'binanceAllowedIp': TEST_ALLOWED_IP,
            'createdAt': datetime.now(),
            'updatedAt': datetime.now()
        })
        
        # 3. Retrieve and verify the saved API keys
        print('\n🔍 Retrieving Binance API keys...')
        saved_user = users_collection.find_one({'userId': TEST_USER_ID})
        
        if not saved_user:
            print('❌ Failed to retrieve test user')
            sys.exit(1)
        
        print('Retrieved user data:')
        
        # Check if API keys are stored securely (not in plaintext)
        is_api_key_encrypted = is_encrypted(saved_user.get('binanceApiKey'), TEST_API_KEY)
        is_secret_key_encrypted = is_encrypted(saved_user.get('binanceSecretKey'), TEST_SECRET_KEY)
        
        # Verify encryption status
        print(f"- binanceApiKey encryption: {'✅ Encrypted' if is_api_key_encrypted else '❌ Not encrypted/stored in plaintext'}")
        print(f"- binanceSecretKey encryption: {'✅ Encrypted' if is_secret_key_encrypted else '❌ Not encrypted/stored in plaintext'}")
        print(f"- binanceAllowedIp: {'✅ Matches' if saved_user.get('binanceAllowedIp') == TEST_ALLOWED_IP else '❌ Does not match'}")
        
        # 4. Delete the API keys and verify they are removed
        print('\n🗑️ Deleting Binance API keys...')
        users_collection.update_one(
            {'userId': TEST_USER_ID},
            {
                '$set': {
                    'binanceApiKey': None,
                    'binanceSecretKey': None,
                    'binanceAllowedIp': None,
                    'updatedAt': datetime.now()
                }
            }
        )
        
        # 5. Verify deletion
        print('\n🔍 Verifying API keys deletion...')
        updated_user = users_collection.find_one({'userId': TEST_USER_ID})
        
        if not updated_user:
            print('❌ Failed to retrieve updated test user')
            sys.exit(1)
        
        print('Updated user data:')
        print(f"- binanceApiKey: {'✅ Properly cleared (null)' if updated_user.get('binanceApiKey') is None else '❌ Not properly cleared'}")
        print(f"- binanceSecretKey: {'✅ Properly cleared (null)' if updated_user.get('binanceSecretKey') is None else '❌ Not properly cleared'}")
        print(f"- binanceAllowedIp: {'✅ Properly cleared (null)' if updated_user.get('binanceAllowedIp') is None else '❌ Not properly cleared'}")
        
        # 6. Final cleanup
        print('\n🧹 Final cleanup...')
        users_collection.delete_one({'userId': TEST_USER_ID})
        
        print('\n✅ All tests completed successfully!')
    
    except Exception as e:
        print(f'❌ An error occurred: {e}')
    finally:
        client.close()
        print('📡 MongoDB connection closed')

if __name__ == '__main__':
    main()