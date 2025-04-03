/**
 * MongoDB integration module
 * 
 * This module provides MongoDB operations using a real MongoDB connection.
 * Simulation mode has been completely disabled as per requirements.
 */
import { saveApiKeys, getApiKeys, deleteApiKeys, mongooseConnectionStatus } from '../models/saas';
import type { MongoClient } from 'mongodb';

// Global reference to MongoDB client
export let mongoClient: any = null;

// Connect to MongoDB
export const connectToMongoDB = async () => {
  try {
    // Check if connection string is available
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      console.error('MongoDB connection string not found. Please set MONGO_URI in .env');
      mongooseConnectionStatus.readyState = 0;
      return false;
    }
    
    console.log('MongoDB connection string is configured. Connecting to MongoDB Atlas...');
    
    try {
      // Dynamically import MongoDB to avoid TypeScript errors at build time
      const { MongoClient } = await import('mongodb');
      
      // Initialize MongoDB client with the connection string
      mongoClient = new MongoClient(mongoUri, {
        // Connection options for better reliability
        monitorCommands: true,
      });
      
      // Connect to the MongoDB server
      await mongoClient.connect();
      
      // Test the connection by listing databases
      const adminDb = mongoClient.db().admin();
      const result = await adminDb.listDatabases();
      
      console.log(`Successfully connected to MongoDB Atlas. Found ${result.databases.length} databases.`);
      
      // Mark the connection as ready
      mongooseConnectionStatus.readyState = 1;
      
      return true;
    } catch (connectionError) {
      // No fallback to simulation - just report the error
      console.error('Error establishing MongoDB connection:', connectionError);
      console.error('MongoDB connection failed. Please check your MONGO_URI and network connectivity.');
      
      // Set connection status to disconnected
      mongooseConnectionStatus.readyState = 0;
      return false;
    }
  } catch (error) {
    console.error('Error with MongoDB connection:', error);
    mongooseConnectionStatus.readyState = 0;
    return false;
  }
};

export const testMongoDBConnection = async () => {
  try {
    // Check if connection string is available
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      return {
        connected: false,
        isSimulated: false,
        description: 'MongoDB connection string not found. Please set MONGO_URI in .env.',
        error: 'MongoDB connection string not found'
      };
    }
    
    // Check MongoDB connection status
    const connected = mongooseConnectionStatus.readyState === 1;
    
    // Try to connect if not already connected
    if (!connected) {
      await connectToMongoDB();
    }
    
    // Return detailed status information
    return {
      connected: mongooseConnectionStatus.readyState === 1,
      isSimulated: false,
      description: mongooseConnectionStatus.readyState === 1
        ? 'Successfully connected to MongoDB Atlas database.'
        : 'Failed to connect to MongoDB Atlas. Check your connection string and network connectivity.',
      error: mongooseConnectionStatus.readyState !== 1 ? 'Failed to connect to MongoDB' : null
    };
  } catch (error) {
    return {
      connected: false,
      isSimulated: false,
      description: 'Error occurred during MongoDB connection check',
      error: error instanceof Error ? error.message : 'Unknown error during MongoDB connection check'
    };
  }
};

// Helper function to save Binance API keys to MongoDB
export const saveBinanceApiKeysToMongoDB = async (userId: number, apiKey: string, secretKey: string) => {
  try {
    // Make sure our MongoDB connection is ready
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
    // Make sure our MongoDB connection is ready
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
    // Make sure our MongoDB connection is ready
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