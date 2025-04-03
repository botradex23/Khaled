"""
Check MongoDB Connection

This script directly checks the MongoDB connection using Python's pymongo library.
It doesn't rely on the project's configuration but directly uses the URI from .env.
"""

import os
import pymongo
from dotenv import load_dotenv

def main():
    """Check MongoDB connection"""
    # Load environment variables from .env file
    load_dotenv()
    
    # Get MongoDB connection string
    mongo_uri = os.getenv("MONGO_URI")
    
    if not mongo_uri:
        print("❌ MONGO_URI environment variable not found in .env file")
        return
    
    print(f"Using MongoDB URI: {mongo_uri[:20]}...")
    
    try:
        # Connect to MongoDB
        client = pymongo.MongoClient(mongo_uri)
        
        # Check connection by pinging the database
        client.admin.command('ping')
        
        print("✅ Successfully connected to MongoDB!")
        
        # Get database name properly
        db_name = "Saas"  # Default database name
        
        # Extract proper database name from URI if possible
        if "mongodb+srv://" in mongo_uri:
            # For MongoDB Atlas URIs (mongodb+srv://...)
            try:
                # Extract just the database name without query parameters
                parts = mongo_uri.split('/')
                if len(parts) >= 4:
                    db_name_with_params = parts[3]
                    db_name = db_name_with_params.split('?')[0]
            except Exception as e:
                print(f"Warning: Could not parse database name from URI: {e}")
        
        print(f"Database name: {db_name}")
        
        # Check for available collections
        db = client[db_name]
        collections = db.list_collection_names()
        
        if collections:
            print(f"Available collections: {', '.join(collections)}")
        else:
            print("No collections found in database")
        
    except Exception as e:
        print(f"❌ Failed to connect to MongoDB: {e}")

if __name__ == "__main__":
    main()