"""
MongoDB Write Verification - Python Version

This script tests the MongoDB storage layer by:
1. Creating a test user
2. Creating a test bot
3. Logging a sample trade
4. Creating risk settings
5. Verifying all documents exist in their respective collections
"""

import os
import time
import datetime
import pymongo
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB connection string
uri = os.getenv("MONGO_URI")
if not uri:
    print("❌ MONGO_URI environment variable is not set")
    exit(1)

# Test data
test_user = {
    "username": f"test_user_{int(time.time())}",
    "email": f"test_{int(time.time())}@example.com",
    "password": "hashedPassword123",
    "firstName": "Test",
    "lastName": "User",
    "defaultBroker": "binance",
    "useTestnet": True,
    "binanceApiKey": None,
    "binanceSecretKey": None
}

test_bot = {
    "userId": None,  # Will be set after user creation
    "name": f"Test Bot {datetime.datetime.now().strftime('%Y-%m-%d')}",
    "botType": "AI_GRID",
    "tradingPair": "BTCUSDT",
    "status": "IDLE",
    "isRunning": False,
    "config": {
        "upperLimit": "75000",
        "lowerLimit": "65000",
        "gridLines": 10,
        "investmentAmount": "1000"
    }
}

test_trade_log = {
    "symbol": "BTCUSDT",
    "action": "BUY",
    "entry_price": "70345.50",
    "quantity": "0.01",
    "trade_source": "TEST",
    "status": "EXECUTED",
    "predicted_confidence": "0.85",
    "reason": "Testing MongoDB write verification"
}

test_risk_settings = {
    "globalStopLoss": "5",
    "globalTakeProfit": "10",
    "maxPositionSize": "10",
    "maxPortfolioRisk": "15",
    "maxTradesPerDay": 15,
    "enableGlobalStopLoss": True,
    "enableGlobalTakeProfit": True,
    "enableMaxPositionSize": True,
    "stopLossStrategy": "fixed",
    "enableEmergencyStopLoss": True,
    "emergencyStopLossThreshold": "20",
    "defaultStopLossPercent": "3",
    "defaultTakeProfitPercent": "6"
}

def connect_to_mongodb():
    """Connect to MongoDB Atlas"""
    try:
        print("🔄 Connecting to MongoDB Atlas...")
        client = pymongo.MongoClient(uri)
        client.admin.command('ping')  # Check connection
        print("✅ Connected to MongoDB Atlas")
        
        db = client.get_default_database()
        collections = {
            "users": db["users"],
            "bots": db["bots"],
            "tradeLogs": db["tradeLogs"],
            "riskSettings": db["riskSettings"]
        }
        
        return client, db, collections
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return None, None, None

def create_test_user(collections):
    """Create a test user"""
    try:
        full_user = {
            **test_user,
            "id": int(time.time()),
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        
        result = collections["users"].insert_one(full_user)
        print(f"✅ Created test user: {full_user['username']} (ID: {full_user['id']}, MongoDB ID: {result.inserted_id})")
        return {**full_user, "_id": result.inserted_id}
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        return None

def create_test_bot(collections, user_id):
    """Create a test bot"""
    try:
        full_bot = {
            **test_bot,
            "userId": user_id,
            "id": int(time.time()),
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        
        result = collections["bots"].insert_one(full_bot)
        print(f"✅ Created test bot: {full_bot['name']} (ID: {full_bot['id']}, MongoDB ID: {result.inserted_id})")
        return {**full_bot, "_id": result.inserted_id}
    except Exception as e:
        print(f"❌ Failed to create test bot: {e}")
        return None

def create_test_trade_log(collections, user_id):
    """Create a test trade log"""
    try:
        full_log = {
            **test_trade_log,
            "userId": user_id,
            "timestamp": datetime.datetime.now()
        }
        
        result = collections["tradeLogs"].insert_one(full_log)
        print(f"✅ Created test trade log: {full_log['symbol']} {full_log['action']} (MongoDB ID: {result.inserted_id})")
        return {**full_log, "_id": result.inserted_id}
    except Exception as e:
        print(f"❌ Failed to create test trade log: {e}")
        return None

def create_test_risk_settings(collections, user_id):
    """Create test risk settings"""
    try:
        full_settings = {
            **test_risk_settings,
            "userId": user_id,
            "id": int(time.time()),
            "createdAt": datetime.datetime.now(),
            "updatedAt": datetime.datetime.now()
        }
        
        result = collections["riskSettings"].insert_one(full_settings)
        print(f"✅ Created test risk settings for user ID {user_id} (MongoDB ID: {result.inserted_id})")
        return {**full_settings, "_id": result.inserted_id}
    except Exception as e:
        print(f"❌ Failed to create test risk settings: {e}")
        return None

def verify_document_exists(collection, filter_):
    """Verify a document exists in a collection"""
    try:
        result = collection.find_one(filter_)
        return bool(result)
    except Exception as e:
        print(f"❌ Failed to verify document: {e}")
        return False

def run_test():
    """Run the MongoDB verification test"""
    success = True
    
    # Connect to MongoDB
    client, db, collections = connect_to_mongodb()
    if not client:
        return False
    
    try:
        # Step 1: Create a test user
        print("\n🧪 Step 1: Creating test user...")
        user = create_test_user(collections)
        if not user:
            print("❌ Test failed: Unable to create user")
            success = False
        else:
            user_exists = verify_document_exists(collections["users"], {"id": user["id"]})
            print(f"{'✅' if user_exists else '❌'} User exists in MongoDB: {user_exists}")
            success = success and user_exists
            
            # Step 2: Create a test bot
            if success:
                print("\n🧪 Step 2: Creating test bot...")
                bot = create_test_bot(collections, user["id"])
                if not bot:
                    print("❌ Test failed: Unable to create bot")
                    success = False
                else:
                    bot_exists = verify_document_exists(collections["bots"], {"id": bot["id"]})
                    print(f"{'✅' if bot_exists else '❌'} Bot exists in MongoDB: {bot_exists}")
                    success = success and bot_exists
            
            # Step 3: Create a test trade log
            if success:
                print("\n🧪 Step 3: Creating test trade log...")
                trade_log = create_test_trade_log(collections, user["id"])
                if not trade_log:
                    print("❌ Test failed: Unable to create trade log")
                    success = False
                else:
                    trade_log_exists = verify_document_exists(collections["tradeLogs"], {"_id": trade_log["_id"]})
                    print(f"{'✅' if trade_log_exists else '❌'} Trade log exists in MongoDB: {trade_log_exists}")
                    success = success and trade_log_exists
            
            # Step 4: Create test risk settings
            if success:
                print("\n🧪 Step 4: Creating test risk settings...")
                settings = create_test_risk_settings(collections, user["id"])
                if not settings:
                    print("❌ Test failed: Unable to create risk settings")
                    success = False
                else:
                    settings_exist = verify_document_exists(collections["riskSettings"], {"id": settings["id"]})
                    print(f"{'✅' if settings_exist else '❌'} Risk settings exist in MongoDB: {settings_exist}")
                    success = success and settings_exist
    
    except Exception as e:
        print(f"❌ Unexpected error during test: {e}")
        success = False
    
    finally:
        # Close the MongoDB connection
        if client:
            client.close()
            print("\n🔄 MongoDB connection closed")
        
        # Summary
        print("\n📊 Test Summary:")
        print(f"{'✅ All tests passed! MongoDB is working correctly.' if success else '❌ Some tests failed. Check the logs above.'}")
        print("MongoDB collections tested:")
        print("- users")
        print("- bots")
        print("- tradeLogs")
        print("- riskSettings")
        
        return success

if __name__ == "__main__":
    success = run_test()
    exit(0 if success else 1)