/**
 * MongoDB integration module
 * 
 * This module provides MongoDB operations using a real MongoDB connection when available,
 * otherwise falls back to a simulated in-memory store.
 */
import { saveApiKeys, getApiKeys, deleteApiKeys, mongooseConnectionStatus } from '../models/saas';
import type { MongoClient } from 'mongodb';

// Global reference to MongoDB client
export let mongoClient: any = null;

// Connect to MongoDB (real or simulated)
export const connectToMongoDB = async () => {
  try {
    // Check if connection string is available
    if (process.env.MONGODB_URI) {
      console.log('MongoDB connection string is configured. Attempting real connection...');
      
      try {
        // Dynamically import MongoDB to avoid TypeScript errors at build time
        const { MongoClient } = await import('mongodb');
        
        // Initialize MongoDB client with the connection string
        mongoClient = new MongoClient(process.env.MONGODB_URI, {
          // Connection options
          monitorCommands: true,
        });
        
        // Connect to the MongoDB server
        await mongoClient.connect();
        
        // Test the connection by listing databases
        const adminDb = mongoClient.db().admin();
        const result = await adminDb.listDatabases();
        
        console.log(`Successfully connected to MongoDB. Found ${result.databases.length} databases.`);
        
        // Mark the connection as ready
        mongooseConnectionStatus.readyState = 1;
        mongooseConnectionStatus.isSimulated = false;
        
        return true;
      } catch (connectionError) {
        console.error('Error establishing real MongoDB connection:', connectionError);
        console.log('Falling back to simulated MongoDB store...');
        
        // In this case we need to use a simulation
        console.log('NOTICE: This is a MongoDB SIMULATION. Data is stored in memory only.');
        console.log(`NOTICE: MongoDB URI configured: ${process.env.MONGODB_URI.substring(0, process.env.MONGODB_URI.indexOf('://') + 3)}...`);
        
        // Mark the mock connection as ready
        mongooseConnectionStatus.readyState = 1;
        mongooseConnectionStatus.isSimulated = true;
        
        console.log('MongoDB simulated connection established successfully');
        return true;
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
        isSimulated: true,
        description: 'MongoDB connection string not found',
        error: 'MongoDB connection string not found'
      };
    }
    
    // Check simulated MongoDB connection status
    const connected = mongooseConnectionStatus.readyState === 1;
    
    // Try to connect if not already connected
    if (!connected) {
      await connectToMongoDB();
    }
    
    // Return detailed status information including simulation state
    return {
      connected: mongooseConnectionStatus.readyState === 1,
      isSimulated: mongooseConnectionStatus.isSimulated || true,
      description: mongooseConnectionStatus.isSimulated 
        ? 'MongoDB is running in simulation mode. Data is stored in memory only.' 
        : 'MongoDB is connected to a real database.',
      error: mongooseConnectionStatus.readyState !== 1 ? 'Failed to connect to MongoDB' : null
    };
  } catch (error) {
    return {
      connected: false,
      isSimulated: true,
      description: 'Error occurred during MongoDB connection check',
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