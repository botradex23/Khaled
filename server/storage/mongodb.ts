/**
 * MongoDB integration module - STUB
 * 
 * This module provides stubs for MongoDB operations.
 * MongoDB integration is disabled until package dependency issues are resolved.
 */

// Global reference to MongoDB client (actually not used)
export let mongoClient: any = null;

// Stub MongoDB connection function - returns false
export const connectToMongoDB = async (): Promise<boolean> => {
  console.log('⚠️ MongoDB connection is disabled in this version. Using in-memory storage instead.');
  return false;
};

// Test MongoDB connection (always reports disconnected)
export const testMongoDBConnection = async () => {
  return {
    connected: false,
    isSimulated: true,
    description: 'MongoDB integration is disabled in this version. Using in-memory storage instead.',
    error: 'MongoDB integration is disabled'
  };
};

// Stub for saving Binance API keys
export const saveBinanceApiKeysToMongoDB = async (userId: number, apiKey: string, secretKey: string) => {
  console.log('⚠️ MongoDB API key storage is disabled. Keys will only be stored in memory.');
  return { success: true, message: 'API keys stored in memory only' };
};

// Stub for getting Binance API keys
export const getBinanceApiKeysFromMongoDB = async (userId: number) => {
  console.log('⚠️ MongoDB API key retrieval is disabled. Using memory storage only.');
  return { apiKey: null, secretKey: null };
};

// Stub for deleting Binance API keys
export const deleteBinanceApiKeysFromMongoDB = async (userId: number) => {
  console.log('⚠️ MongoDB API key deletion is disabled. Using memory storage only.');
  return { success: true, message: 'API keys removed from memory only' };
};