import { encrypt, decrypt } from '../utils/encryption';

// In-memory store until MongoDB is available
const saasStore = new Map<number, {
  userId: number;
  apiKey: string;
  secretKey: string;
  createdAt: Date;
  updatedAt: Date;
}>();

// MongoDB collection name
const COLLECTION_NAME = 'api_keys';

/**
 * SaaS model for MongoDB integration
 * This will use real MongoDB if available, otherwise falls back to in-memory storage
 */
export const SaasModel = {
  // MongoDB functions to work with the database or in-memory store
  async updateOne(filter: { userId: number }, update: any, options: { upsert: boolean }) {
    const { userId } = filter;
    const now = new Date();
    
    // First try to use real MongoDB if available
    try {
      if (mongooseConnectionStatus.readyState === 1 && !mongooseConnectionStatus.isSimulated) {
        // Import MongoDB dynamically
        const mongodb = await import('mongodb');
        const { mongoClient } = await import('../storage/mongodb');
        
        if (mongoClient) {
          const db = mongoClient.db();
          const collection = db.collection(COLLECTION_NAME);
          
          // Add timestamps to update
          if (!update.$set.updatedAt) {
            update.$set.updatedAt = now;
          }
          
          if (options.upsert && !update.$set.createdAt) {
            update.$set.createdAt = now;
          }
          
          // Perform the update in MongoDB
          const result = await collection.updateOne(filter, update, options);
          return result;
        }
      }
    } catch (error) {
      console.error('Error using real MongoDB, falling back to in-memory store:', error);
    }
    
    // Fall back to in-memory if real MongoDB is not available
    const existingDoc = saasStore.get(userId);
    
    if (existingDoc) {
      // Update existing document
      const updatedDoc = {
        ...existingDoc,
        ...update.$set,
        updatedAt: now
      };
      saasStore.set(userId, updatedDoc);
      
      return { 
        upsertedCount: 0,
        modifiedCount: 1,
        acknowledged: true
      };
    } else if (options.upsert) {
      // Create new document
      const newDoc = {
        userId,
        ...update.$set,
        createdAt: now,
        updatedAt: now
      };
      saasStore.set(userId, newDoc);
      
      return {
        upsertedCount: 1,
        modifiedCount: 0,
        acknowledged: true
      };
    }
    
    return {
      upsertedCount: 0,
      modifiedCount: 0,
      acknowledged: true
    };
  },
  
  async findOne(filter: { userId: number }) {
    const { userId } = filter;
    
    // First try to use real MongoDB if available
    try {
      if (mongooseConnectionStatus.readyState === 1 && !mongooseConnectionStatus.isSimulated) {
        // Import MongoDB dynamically
        const mongodb = await import('mongodb');
        const { mongoClient } = await import('../storage/mongodb');
        
        if (mongoClient) {
          const db = mongoClient.db();
          const collection = db.collection(COLLECTION_NAME);
          
          // Find the document in MongoDB
          const result = await collection.findOne(filter);
          return result;
        }
      }
    } catch (error) {
      console.error('Error using real MongoDB, falling back to in-memory store:', error);
    }
    
    // Fall back to in-memory if real MongoDB is not available
    return saasStore.get(userId) || null;
  },
  
  async deleteOne(filter: { userId: number }) {
    const { userId } = filter;
    
    // First try to use real MongoDB if available
    try {
      if (mongooseConnectionStatus.readyState === 1 && !mongooseConnectionStatus.isSimulated) {
        // Import MongoDB dynamically
        const mongodb = await import('mongodb');
        const { mongoClient } = await import('../storage/mongodb');
        
        if (mongoClient) {
          const db = mongoClient.db();
          const collection = db.collection(COLLECTION_NAME);
          
          // Delete the document from MongoDB
          const result = await collection.deleteOne(filter);
          return result;
        }
      }
    } catch (error) {
      console.error('Error using real MongoDB, falling back to in-memory store:', error);
    }
    
    // Fall back to in-memory if real MongoDB is not available
    const existed = saasStore.has(userId);
    saasStore.delete(userId);
    
    return {
      deletedCount: existed ? 1 : 0,
      acknowledged: true
    };
  }
};

// Mock connection status for MongoDB
export const mongooseConnectionStatus = {
  readyState: 0, // 0: disconnected, 1: connected
  isSimulated: true // Flag to indicate if we're using a real or simulated MongoDB connection
};

/**
 * Save or update API keys in the SaaS collection
 * @param userId User ID
 * @param apiKey API Key (will be encrypted)
 * @param secretKey Secret Key (will be encrypted)
 * @returns Promise that resolves to the updated document
 */
export async function saveApiKeys(userId: number, apiKey: string, secretKey: string) {
  try {
    // Encrypt the API keys before storing
    const encryptedApiKey = encrypt(apiKey);
    const encryptedSecretKey = encrypt(secretKey);
    
    // Log action (without sensitive data)
    console.log(`Saving API keys to SaaS collection for user ${userId}`);
    console.log(`  API key length: ${apiKey.length}, encrypted length: ${encryptedApiKey.length}`);
    console.log(`  Secret key length: ${secretKey.length}, encrypted length: ${encryptedSecretKey.length}`);
    
    // Update or create the document
    const result = await SaasModel.updateOne(
      { userId },
      { 
        $set: { 
          apiKey: encryptedApiKey, 
          secretKey: encryptedSecretKey,
          updatedAt: new Date()
        } 
      },
      { upsert: true }
    );
    
    console.log(`SaaS document ${result.upsertedCount ? 'created' : 'updated'} for user ${userId}`);
    
    // Return the updated document
    return await SaasModel.findOne({ userId });
  } catch (error) {
    console.error('Error saving API keys to SaaS collection:', error);
    throw error;
  }
}

/**
 * Get API keys from the SaaS collection
 * @param userId User ID
 * @returns Promise that resolves to the decrypted API keys or null if not found
 */
export async function getApiKeys(userId: number) {
  try {
    // Find the document
    const saasDoc = await SaasModel.findOne({ userId });
    
    if (!saasDoc) {
      console.log(`No API keys found in SaaS collection for user ${userId}`);
      return null;
    }
    
    // Decrypt the API keys
    const apiKey = decrypt(saasDoc.apiKey);
    const secretKey = decrypt(saasDoc.secretKey);
    
    console.log(`Retrieved API keys from SaaS collection for user ${userId}`);
    console.log(`  API key length: ${apiKey.length}`);
    console.log(`  Secret key length: ${secretKey.length}`);
    
    return { apiKey, secretKey };
  } catch (error) {
    console.error('Error getting API keys from SaaS collection:', error);
    throw error;
  }
}

/**
 * Delete API keys from the SaaS collection
 * @param userId User ID
 * @returns Promise that resolves to true if deleted, false if not found
 */
export async function deleteApiKeys(userId: number) {
  try {
    // Delete the document
    const result = await SaasModel.deleteOne({ userId });
    
    console.log(`Deleted ${result.deletedCount} API key document(s) from SaaS collection for user ${userId}`);
    
    return result.deletedCount > 0;
  } catch (error) {
    console.error('Error deleting API keys from SaaS collection:', error);
    throw error;
  }
}