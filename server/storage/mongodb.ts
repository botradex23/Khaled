/**
 * MongoDB integration module
 * 
 * This module provides connection and operations for MongoDB Atlas.
 * Uses a simple wrapper approach that doesn't directly require the mongodb package
 * to be available at import time.
 * 
 * Includes encryption for sensitive data like API keys.
 */

// Avoid direct imports by using require later
import { encrypt, decrypt } from '../services/encryptionService';
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

// Process MongoDB URI to ensure it has the correct format
function processMongoURI(uri: string): string {
  // Check if the URI starts with mongodb:// or mongodb+srv://
  if (uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://')) {
    console.log('MongoDB URI has correct format');
    return uri;
  }
  
  // If it doesn't have the correct prefix, see if we can extract it from the URI
  const mongoPrefix = 'mongodb+srv://';
  const indexOfPrefix = uri.indexOf(mongoPrefix);
  
  if (indexOfPrefix >= 0) {
    const extractedURI = uri.substring(indexOfPrefix);
    console.log('Fixed MongoDB URI format in connect method');
    return extractedURI;
  }
  
  // If we can't extract it, assume it might be a mongodb+srv:// URI without the prefix
  if (uri.includes('@') && uri.includes('.mongodb.net')) {
    console.log('Adding mongodb+srv:// prefix to URI');
    return `mongodb+srv://${uri}`;
  }
  
  // Return the original URI as a fallback
  return uri;
}

// Connect to MongoDB Atlas
export const connectToMongoDB = async (): Promise<boolean> => {
  // Get the MongoDB URI from environment variables
  let rawUri = getEnvVar('MONGO_URI', '');
  
  if (!rawUri) {
    console.error('⚠️ WARNING: MONGO_URI environment variable is not set. MongoDB connection will not be attempted.');
    return false;
  }
  
  // Process the URI to ensure it has the correct format
  uri = processMongoURI(rawUri);
  
  console.log(`MongoDB URI: ${uri.substring(0, 20)}...`);
  
  if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
    console.error('⚠️ WARNING: MONGO_URI does not have the correct format. Should start with mongodb:// or mongodb+srv://');
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
    
    // List available databases
    const adminDb = mongoClient.db("admin");
    const dbList = await adminDb.admin().listDatabases();
    console.log("Available databases:", dbList.databases.map((db: any) => db.name));
    
    // Use the Saas database explicitly
    const saasDb = mongoClient.db("Saas");
    console.log("Using database:", saasDb.databaseName);
    
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
    let rawUri = getEnvVar('MONGO_URI', '');
    
    if (!rawUri) {
      return {
        connected: false,
        isSimulated: true,
        description: 'MONGO_URI environment variable is not set',
        error: 'Missing MONGO_URI configuration'
      };
    }
    
    // Process the URI to ensure it has the correct format
    uri = processMongoURI(rawUri);
    
    if (!uri.startsWith('mongodb://') && !uri.startsWith('mongodb+srv://')) {
      return {
        connected: false,
        isSimulated: true,
        description: 'MONGO_URI does not have the correct format',
        error: 'Invalid MongoDB URI format'
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
export const saveBinanceApiKeysToMongoDB = async (userId: number, apiKey: string, secretKey: string, allowedIp?: string | null) => {
  if (!mongoClient) {
    console.warn('MongoDB client not initialized. Cannot save Binance API keys.');
    return { success: false, message: 'MongoDB not connected' };
  }

  try {
    // Encrypt API keys before storing
    const encryptedApiKey = encrypt(apiKey);
    const encryptedSecretKey = encrypt(secretKey);
    
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const users = db.collection('users');
    
    // Create update document
    const updateDoc: any = { 
      $set: { 
        binanceApiKey: encryptedApiKey, 
        binanceSecretKey: encryptedSecretKey,
        updatedAt: new Date()
      },
      $setOnInsert: { 
        userId: userId,
        createdAt: new Date() 
      }
    };
    
    // Add allowed IP if provided
    if (allowedIp !== undefined) {
      updateDoc.$set.binanceAllowedIp = allowedIp;
    }
    
    // Update or insert user's API keys
    const result = await users.updateOne(
      { userId: userId },
      updateDoc,
      { upsert: true }
    );
    
    console.log(`✅ Binance API keys saved for user: ${userId}`);
    
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
    return { apiKey: null, secretKey: null, allowedIp: null };
  }

  try {
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const users = db.collection('users');
    
    const user = await users.findOne({ userId: userId });
    
    if (user) {
      console.log(`Retrieved Binance API keys from MongoDB for user: ${userId}`);
      
      // Decrypt API keys if they exist
      let apiKey = null;
      let secretKey = null;
      
      if (user.binanceApiKey) {
        try {
          apiKey = decrypt(user.binanceApiKey);
        } catch (decryptError) {
          console.error('Error decrypting apiKey:', decryptError);
          // If decryption fails, might be stored without encryption - return as is
          apiKey = user.binanceApiKey;
        }
      }
      
      if (user.binanceSecretKey) {
        try {
          secretKey = decrypt(user.binanceSecretKey);
        } catch (decryptError) {
          console.error('Error decrypting secretKey:', decryptError);
          // If decryption fails, might be stored without encryption - return as is
          secretKey = user.binanceSecretKey;
        }
      }
      
      return { 
        apiKey: apiKey, 
        secretKey: secretKey,
        allowedIp: user.binanceAllowedIp || null
      };
    }
    
    return { apiKey: null, secretKey: null, allowedIp: null };
  } catch (error) {
    console.error('Error retrieving Binance API keys from MongoDB:', error);
    return { apiKey: null, secretKey: null, allowedIp: null };
  }
};

// Delete Binance API keys from MongoDB
export const deleteBinanceApiKeysFromMongoDB = async (userId: number) => {
  if (!mongoClient) {
    console.warn('MongoDB client not initialized. Cannot delete Binance API keys.');
    return { success: false, message: 'MongoDB not connected' };
  }

  try {
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const users = db.collection('users');
    
    const result = await users.updateOne(
      { userId: userId },
      { 
        $set: { 
          binanceApiKey: null, 
          binanceSecretKey: null,
          binanceAllowedIp: null,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return { success: false, message: 'User not found' };
    }
    
    console.log(`Binance API keys removed from MongoDB for user: ${userId}`);
    
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

// Test function for API key encryption (for development only)
export const testApiKeyEncryption = async () => {
  const testApiKey = `test-api-key-${Date.now()}`;
  const testSecretKey = `test-secret-key-${Date.now()}`;
  
  console.log('=== API Key Encryption Test ===');
  console.log('Original API Key:', testApiKey);
  console.log('Original Secret Key:', testSecretKey);
  
  // Encrypt the keys
  console.log('\nEncrypting...');
  const encryptedApiKey = encrypt(testApiKey);
  const encryptedSecretKey = encrypt(testSecretKey);
  
  console.log('Encrypted API Key:', encryptedApiKey);
  console.log('Encrypted Secret Key:', encryptedSecretKey);
  
  // Decrypt the keys
  console.log('\nDecrypting...');
  const decryptedApiKey = decrypt(encryptedApiKey);
  const decryptedSecretKey = decrypt(encryptedSecretKey);
  
  console.log('Decrypted API Key:', decryptedApiKey);
  console.log('Decrypted Secret Key:', decryptedSecretKey);
  
  // Verify the decryption
  console.log('\nVerification:');
  console.log('API Key Match:', decryptedApiKey === testApiKey);
  console.log('Secret Key Match:', decryptedSecretKey === testSecretKey);
  
  // Return the test results
  const success = decryptedApiKey === testApiKey && decryptedSecretKey === testSecretKey;
  console.log(success ? '\n✅ Encryption test PASSED!' : '\n❌ Encryption test FAILED!');
  
  return {
    success,
    original: { apiKey: testApiKey, secretKey: testSecretKey },
    encrypted: { apiKey: encryptedApiKey, secretKey: encryptedSecretKey },
    decrypted: { apiKey: decryptedApiKey, secretKey: decryptedSecretKey }
  };
};