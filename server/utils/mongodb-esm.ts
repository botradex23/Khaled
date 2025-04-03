/**
 * MongoDB ESM Utility
 * 
 * This file provides ESM-compatible MongoDB utilities
 * using top-level await for dynamic imports.
 */

// Try to import MongoDB
let mongodb: any;
let MongoClient: any;
let ObjectId: any;

// Flag to track if MongoDB is available
let isMongoDBAvailable = false;

try {
  // Dynamically import MongoDB
  mongodb = await import('mongodb');
  MongoClient = mongodb.MongoClient;
  ObjectId = mongodb.ObjectId;
  isMongoDBAvailable = true;
  console.log('✅ MongoDB module successfully imported');
} catch (error) {
  console.error('❌ Failed to import MongoDB:', error);
  // Create placeholder implementations for graceful failure
  MongoClient = class MockMongoClient {
    constructor() {
      console.error('MongoDB is not available - using mock implementation');
    }
    connect() {
      return Promise.reject(new Error('MongoDB module not available'));
    }
    db() {
      return {
        collection: () => ({
          find: () => ({ toArray: () => Promise.resolve([]) }),
          findOne: () => Promise.resolve(null),
          insertOne: () => Promise.resolve({ insertedId: 'mock-id' }),
          updateOne: () => Promise.resolve({ modifiedCount: 0 }),
          deleteOne: () => Promise.resolve({ deletedCount: 0 }),
          findOneAndUpdate: () => Promise.resolve(null)
        }),
        command: () => Promise.reject(new Error('MongoDB module not available'))
      };
    }
    close() {
      return Promise.resolve();
    }
  };
  
  ObjectId = class MockObjectId {
    constructor(id: string) {
      this.id = id;
    }
    id: string;
    toString() { return this.id; }
  };
}

// Export MongoDB components and status flag
export { MongoClient, ObjectId, isMongoDBAvailable };

// Utility function to connect to MongoDB
export async function connectToMongoDB(uri: string) {
  if (!isMongoDBAvailable) {
    console.error('❌ Cannot connect to MongoDB - module not available');
    return { client: null, isConnected: false };
  }
  
  try {
    const client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB successfully');
    return { client, isConnected: true };
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return { client: null, isConnected: false };
  }
}

// Utility function to check MongoDB connection
export async function checkMongoDBConnection(client: any) {
  if (!client) {
    return { connected: false, description: 'MongoDB client not initialized' };
  }
  
  try {
    await client.db().command({ ping: 1 });
    return { connected: true, description: 'MongoDB connection is healthy' };
  } catch (error) {
    return { connected: false, description: 'MongoDB connection failed', error };
  }
}