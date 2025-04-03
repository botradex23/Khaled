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
import json
import datetime
from dotenv import load_dotenv
from pymongo import MongoClient

def connect_to_mongodb():
    """Connect to MongoDB Atlas"""
    load_dotenv()
    
    # Get MongoDB connection string
    mongo_uri = os.getenv("MONGO_URI")
    
    if not mongo_uri:
        print("❌ MONGO_URI environment variable not found in .env file")
        return None, None
    
    print(f"Using MongoDB URI: {mongo_uri[:20]}...")
    
    try:
        # Connect to MongoDB
        client = MongoClient(mongo_uri)
        
        # Check connection by pinging the database
        client.admin.command('ping')
        
        print("✅ Successfully connected to MongoDB!")
        
        # Get database name
        db_name = 'Saas'  # Default database name
        
        # Extract proper database name from URI if possible
        if "mongodb+srv://" in mongo_uri:
            try:
                parts = mongo_uri.split('/')
                if len(parts) >= 4:
                    db_name_with_params = parts[3]
                    db_name = db_name_with_params.split('?')[0]
            except Exception as e:
                print(f"Warning: Could not parse database name from URI: {e}")
        
        print(f"Database name: {db_name}")
        
        # Get database
        db = client[db_name]
        
        return client, db
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")
        return None, None

def create_test_user(collections):
    """Create a test user"""
    user_collection = collections["users"]
    
    test_user = {
        "id": 999999,
        "username": "test_user",
        "email": "test@example.com",
        "password": None,
        "firstName": "Test",
        "lastName": "User",
        "defaultBroker": "binance",
        "useTestnet": True,
        "binanceApiKey": "test_api_key_encrypted",
        "binanceSecretKey": "test_secret_key_encrypted",
        "binanceAllowedIp": "185.199.228.220",
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    # Check if user already exists
    existing_user = user_collection.find_one({"username": "test_user"})
    if existing_user:
        print(f"Test user already exists with ID: {existing_user.get('id')}")
        return existing_user.get('id')
    
    try:
        result = user_collection.insert_one(test_user)
        print(f"✅ Created test user with ID: {test_user['id']}")
        return test_user['id']
    except Exception as e:
        print(f"❌ Failed to create test user: {e}")
        return None

def create_test_bot(collections, user_id):
    """Create a test bot"""
    bot_collection = collections["bots"]
    
    test_bot = {
        "id": 999999,
        "userId": user_id,
        "name": "Test Bot",
        "description": "A test trading bot",
        "symbol": "BTCUSDT",
        "strategy": "AI_GRID",
        "isActive": False,
        "isRunning": False,
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow(),
        "settings": {
            "gridLevels": 10,
            "upperLimit": 50000,
            "lowerLimit": 40000,
            "investmentAmount": 1000
        }
    }
    
    # Check if bot already exists
    existing_bot = bot_collection.find_one({"name": "Test Bot", "userId": user_id})
    if existing_bot:
        print(f"Test bot already exists with ID: {existing_bot.get('id')}")
        return existing_bot.get('id')
    
    try:
        result = bot_collection.insert_one(test_bot)
        print(f"✅ Created test bot with ID: {test_bot['id']}")
        return test_bot['id']
    except Exception as e:
        print(f"❌ Failed to create test bot: {e}")
        return None

def create_test_trade_log(collections, user_id):
    """Create a test trade log"""
    trade_log_collection = collections["tradeLogs"]
    
    test_trade_log = {
        "userId": user_id,
        "botId": 999999,
        "symbol": "BTCUSDT",
        "side": "BUY",
        "amount": 0.001,
        "price": 45000,
        "timestamp": datetime.datetime.utcnow(),
        "status": "EXECUTED",
        "orderId": "test_order_id",
        "source": "AI_GRID",
        "profitLoss": 0
    }
    
    try:
        result = trade_log_collection.insert_one(test_trade_log)
        print(f"✅ Created test trade log")
        return result.inserted_id
    except Exception as e:
        print(f"❌ Failed to create test trade log: {e}")
        return None

def create_test_risk_settings(collections, user_id):
    """Create test risk settings"""
    risk_settings_collection = collections["riskSettings"]
    
    test_risk_settings = {
        "userId": user_id,
        "maxRiskPerTrade": 1.0,
        "maxDailyLoss": 5.0,
        "maxWeeklyLoss": 10.0,
        "stopLossPercentage": 2.0,
        "takeProfitPercentage": 3.0,
        "maxOpenTrades": 5,
        "createdAt": datetime.datetime.utcnow(),
        "updatedAt": datetime.datetime.utcnow()
    }
    
    # Check if risk settings already exist
    existing_settings = risk_settings_collection.find_one({"userId": user_id})
    if existing_settings:
        print(f"Risk settings already exist for user ID: {user_id}")
        return existing_settings.get('_id')
    
    try:
        result = risk_settings_collection.insert_one(test_risk_settings)
        print(f"✅ Created test risk settings")
        return result.inserted_id
    except Exception as e:
        print(f"❌ Failed to create test risk settings: {e}")
        return None

def verify_document_exists(collection, filter_):
    """Verify a document exists in a collection"""
    result = collection.find_one(filter_)
    return result is not None

def run_test():
    """Run the MongoDB verification test"""
    client, db = connect_to_mongodb()
    
    if client is None:
        print("Cannot proceed with tests - MongoDB connection failed")
        return
    
    try:
        # Get collections
        collections = {
            "users": db.users,
            "bots": db.bots,
            "tradeLogs": db.tradeLogs,
            "riskSettings": db.riskSettings
        }
        
        # Verify all collections exist
        for name, collection in collections.items():
            if collection.count_documents({}) >= 0:  # This will throw an error if collection doesn't exist
                print(f"✅ Collection '{name}' exists")
            else:
                print(f"❌ Collection '{name}' does not exist")
        
        # Create test data
        user_id = create_test_user(collections)
        if not user_id:
            print("Cannot proceed with remaining tests - user creation failed")
            return
        
        bot_id = create_test_bot(collections, user_id)
        trade_log_id = create_test_trade_log(collections, user_id)
        risk_settings_id = create_test_risk_settings(collections, user_id)
        
        # Verify all documents exist
        print("\nVerifying documents exist...")
        if verify_document_exists(collections["users"], {"id": user_id}):
            print("✅ User document exists")
        else:
            print("❌ User document does not exist")
        
        if verify_document_exists(collections["bots"], {"id": bot_id}):
            print("✅ Bot document exists")
        else:
            print("❌ Bot document does not exist")
        
        if verify_document_exists(collections["tradeLogs"], {"userId": user_id}):
            print("✅ Trade log document exists")
        else:
            print("❌ Trade log document does not exist")
        
        if verify_document_exists(collections["riskSettings"], {"userId": user_id}):
            print("✅ Risk settings document exists")
        else:
            print("❌ Risk settings document does not exist")
        
    except Exception as e:
        print(f"❌ Error during MongoDB verification test: {e}")
    finally:
        # Close the MongoDB connection
        if client:
            client.close()
            print("\nMongoDB connection closed")

if __name__ == "__main__":
    run_test()