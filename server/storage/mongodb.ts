/**
 * MongoDB integration module
 * 
 * This module provides connection and operations for MongoDB Atlas.
 * Uses a simple wrapper approach that doesn't directly require the mongodb package
 * to be available at import time.
 */

// Avoid direct imports by using require later
let MongoClient: any = null;
let ServerApiVersion: any = null;
let uri = '';
let options: any = {};

// Global reference to MongoDB client
export let mongoClient: any = null;

// Safe getter for environment variables to avoid direct import of dotenv/config
function getEnvVar(name: string, defaultValue: string = ''): string {
  return process.env[name] || defaultValue;
}

// Connect to MongoDB Atlas
export const connectToMongoDB = async (): Promise<boolean> => {
  // Get the MongoDB URI from environment variables
  uri = getEnvVar('MONGO_URI', '');
  
  if (!uri) {
    console.error('⚠️ WARNING: MONGO_URI environment variable is not set. MongoDB connection will not be attempted.');
    return false;
  }

  try {
    // Try to dynamically import the mongodb package
    try {
      console.log('Attempting to import MongoDB driver...');
      const mongodb = await import('mongodb');
      MongoClient = mongodb.MongoClient;
      ServerApiVersion = mongodb.ServerApiVersion;
      
      // Now set the options
      options = {
        serverApi: {
          version: ServerApiVersion.v1,
          strict: true,
          deprecationErrors: true,
        }
      };
      console.log('MongoDB driver imported successfully');
    } catch (importError) {
      console.error('Failed to import MongoDB driver:', importError);
      return false;
    }

    console.log('Connecting to MongoDB Atlas...');
    mongoClient = new MongoClient(uri, options);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB Atlas successfully!');
    
    // Ping the database to confirm connection
    await mongoClient.db("admin").command({ ping: 1 });
    console.log("MongoDB connection verified - server is responsive");
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    if (mongoClient) {
      await mongoClient.close();
      mongoClient = null;
    }
    return false;
  }
};

// Test MongoDB connection
export const testMongoDBConnection = async () => {
  try {
    // Get the MongoDB URI from environment variables
    uri = getEnvVar('MONGO_URI', '');
    
    if (!uri) {
      return {
        connected: false,
        isSimulated: true,
        description: 'MONGO_URI environment variable is not set',
        error: 'Missing MONGO_URI configuration'
      };
    }

    // Try to dynamically import the mongodb package if not already imported
    if (!MongoClient) {
      try {
        console.log('Attempting to import MongoDB driver for connection test...');
        const mongodb = await import('mongodb');
        MongoClient = mongodb.MongoClient;
        ServerApiVersion = mongodb.ServerApiVersion;
        
        // Now set the options
        options = {
          serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
          }
        };
        console.log('MongoDB driver imported successfully for connection test');
      } catch (importError) {
        console.error('Failed to import MongoDB driver for connection test:', importError);
        return {
          connected: false,
          isSimulated: true,
          description: 'Failed to import MongoDB driver',
          error: importError instanceof Error ? importError.message : 'Unknown import error'
        };
      }
    }

    const client = new MongoClient(uri, options);
    await client.connect();
    
    // Ping the database to confirm connection
    await client.db("admin").command({ ping: 1 });
    
    // Close the test connection
    await client.close();
    
    return {
      connected: true,
      isSimulated: false,
      description: 'Successfully connected to MongoDB Atlas',
      error: null
    };
  } catch (error: any) {
    console.error('MongoDB connection test failed:', error);
    return {
      connected: false,
      isSimulated: true,
      description: 'Failed to connect to MongoDB Atlas',
      error: error.message || 'Unknown MongoDB error'
    };
  }
};

// Save Binance API keys to MongoDB
export const saveBinanceApiKeysToMongoDB = async (userId: number, apiKey: string, secretKey: string) => {
  if (!mongoClient) {
    console.warn('MongoDB client not initialized. Cannot save Binance API keys.');
    return { success: false, message: 'MongoDB not connected' };
  }

  try {
    const db = mongoClient.db();
    const users = db.collection('users');
    
    // Update or insert user's API keys
    const result = await users.updateOne(
      { userId: userId },
      { 
        $set: { 
          binanceApiKey: apiKey, 
          binanceSecretKey: secretKey,
          updatedAt: new Date()
        },
        $setOnInsert: { 
          userId: userId,
          createdAt: new Date() 
        }
      },
      { upsert: true }
    );
    
    return { 
      success: true, 
      message: 'API keys saved to MongoDB successfully',
      result
    };
  } catch (error: any) {
    console.error('Error saving Binance API keys to MongoDB:', error);
    return { 
      success: false, 
      message: `Failed to save API keys: ${error.message}` 
    };
  }
};

// Get Binance API keys from MongoDB
export const getBinanceApiKeysFromMongoDB = async (userId: number) => {
  if (!mongoClient) {
    console.warn('MongoDB client not initialized. Cannot retrieve Binance API keys.');
    return { apiKey: null, secretKey: null };
  }

  try {
    const db = mongoClient.db();
    const users = db.collection('users');
    
    const user = await users.findOne({ userId: userId });
    
    if (user) {
      return { 
        apiKey: user.binanceApiKey || null, 
        secretKey: user.binanceSecretKey || null 
      };
    }
    
    return { apiKey: null, secretKey: null };
  } catch (error) {
    console.error('Error retrieving Binance API keys from MongoDB:', error);
    return { apiKey: null, secretKey: null };
  }
};

// Delete Binance API keys from MongoDB
export const deleteBinanceApiKeysFromMongoDB = async (userId: number) => {
  if (!mongoClient) {
    console.warn('MongoDB client not initialized. Cannot delete Binance API keys.');
    return { success: false, message: 'MongoDB not connected' };
  }

  try {
    const db = mongoClient.db();
    const users = db.collection('users');
    
    const result = await users.updateOne(
      { userId: userId },
      { 
        $set: { 
          binanceApiKey: null, 
          binanceSecretKey: null,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found' };
    }
    
    return { 
      success: true, 
      message: 'API keys removed from MongoDB successfully',
      result
    };
  } catch (error: any) {
    console.error('Error deleting Binance API keys from MongoDB:', error);
    return { 
      success: false, 
      message: `Failed to delete API keys: ${error.message}` 
    };
  }
};