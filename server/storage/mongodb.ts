/**
 * MongoDB integration module
 * 
 * This module provides MongoDB-like operations using a simulated in-memory store.
 * When real MongoDB is available, this will be upgraded to use actual MongoDB connections.
 */
import { saveApiKeys, getApiKeys, deleteApiKeys, mongooseConnectionStatus } from '../models/saas';

// Connect to MongoDB (simulated)
export const connectToMongoDB = async () => {
  try {
    // Check if connection string is available
    if (process.env.MONGODB_URI) {
      console.log('MongoDB connection string is configured. Using simulated MongoDB store.');
      
      try {
        // בהמשך כאן יהיה קוד חיבור אמיתי ל-MongoDB
        // כעת אנחנו מדמים חיבור מוצלח אבל גם מציגים שמדובר בסימולציה
        console.log('NOTICE: This is a MongoDB SIMULATION. Data is stored in memory only.');
        console.log('NOTICE: To use real MongoDB storage, mongoose package needs to be installed.');
        console.log(`NOTICE: MongoDB URI configured: ${process.env.MONGODB_URI.substring(0, process.env.MONGODB_URI.indexOf('://') + 3)}...`);
        
        // Mark the mock connection as ready
        mongooseConnectionStatus.readyState = 1;
        
        // הצגת מידע ברור למשתמש שזה סימולציה
        console.log('MongoDB simulated connection established successfully');
        
        return true;
      } catch (connectionError) {
        console.error('Error establishing MongoDB connection:', connectionError);
        mongooseConnectionStatus.readyState = 0;
        return false;
      }
    } else {
      console.log('MongoDB connection string not found. Using in-memory storage instead.');
      mongooseConnectionStatus.readyState = 0;
      return false;
    }
  } catch (error) {
    console.error('Error with MongoDB simulation:', error);
    mongooseConnectionStatus.readyState = 0;
    return false;
  }
};

export const testMongoDBConnection = async () => {
  try {
    // Check if connection string is available
    if (!process.env.MONGODB_URI) {
      return {
        connected: false,
        error: 'MongoDB connection string not found'
      };
    }
    
    // Check simulated MongoDB connection status
    const connected = mongooseConnectionStatus.readyState === 1;
    
    // Try to connect if not already connected
    if (!connected) {
      await connectToMongoDB();
    }
    
    return {
      connected: mongooseConnectionStatus.readyState === 1,
      error: mongooseConnectionStatus.readyState !== 1 ? 'Failed to connect to MongoDB' : null
    };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error during MongoDB connection check'
    };
  }
};

// Helper function to save Binance API keys to MongoDB
export const saveBinanceApiKeysToMongoDB = async (userId: number, apiKey: string, secretKey: string) => {
  try {
    // Make sure our simulated MongoDB connection is ready
    if (mongooseConnectionStatus.readyState !== 1) {
      await connectToMongoDB();
      
      if (mongooseConnectionStatus.readyState !== 1) {
        throw new Error('Could not establish MongoDB connection');
      }
    }
    
    // Save using the SaaS model function
    return await saveApiKeys(userId, apiKey, secretKey);
  } catch (error) {
    console.error('Error saving Binance API keys to MongoDB:', error);
    throw error;
  }
};

// Helper function to get Binance API keys from MongoDB
export const getBinanceApiKeysFromMongoDB = async (userId: number) => {
  try {
    // Make sure our simulated MongoDB connection is ready
    if (mongooseConnectionStatus.readyState !== 1) {
      await connectToMongoDB();
      
      if (mongooseConnectionStatus.readyState !== 1) {
        throw new Error('Could not establish MongoDB connection');
      }
    }
    
    // Get using the SaaS model function
    return await getApiKeys(userId);
  } catch (error) {
    console.error('Error getting Binance API keys from MongoDB:', error);
    throw error;
  }
};

// Helper function to delete Binance API keys from MongoDB
export const deleteBinanceApiKeysFromMongoDB = async (userId: number) => {
  try {
    // Make sure our simulated MongoDB connection is ready
    if (mongooseConnectionStatus.readyState !== 1) {
      await connectToMongoDB();
      
      if (mongooseConnectionStatus.readyState !== 1) {
        throw new Error('Could not establish MongoDB connection');
      }
    }
    
    // Delete using the SaaS model function
    return await deleteApiKeys(userId);
  } catch (error) {
    console.error('Error deleting Binance API keys from MongoDB:', error);
    throw error;
  }
};