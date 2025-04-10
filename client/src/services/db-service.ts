/**
 * Database Service
 * 
 * This service provides database connectivity and operations for MongoDB.
 * It handles connection management, collection access, and basic CRUD operations.
 */

import { MongoClient, Db, Collection } from 'mongodb';
import { logInfo, logError } from '../utils/logger';

// Database state
let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let connectionString = '';
let dbName = '';

/**
 * Initialize the database service
 * @param options Database connection options
 * @returns Promise resolving to boolean indicating success
 */
async function initialize(options: {
  uri?: string;
  dbName?: string;
} = {}): Promise<boolean> {
  try {
    // Get connection details from options or environment
    connectionString = options.uri || process.env.MONGO_URI || '';
    dbName = options.dbName || process.env.MONGO_DB_NAME || 'tradeliy';
    
    if (!connectionString) {
      logError('Database', 'MongoDB URI not provided');
      return false;
    }
    
    logInfo('Database', 'Initializing database connection');
    
    // Connect to MongoDB
    client = new MongoClient(connectionString);
    await client.connect();
    
    // Get database instance
    db = client.db(dbName);
    
    // Test connection by listing collections
    await db.listCollections().toArray();
    
    isConnected = true;
    logInfo('Database', 'Successfully connected to MongoDB database');
    
    return true;
  } catch (error: any) {
    logError('Database', `Error connecting to database: ${error.message}`);
    return false;
  }
}

/**
 * Get a collection from the database
 * @param collectionName Name of the collection
 * @returns MongoDB collection or null if not connected
 */
function getCollection<T = any>(collectionName: string): Collection<T> | null {
  if (!isConnected || !db) {
    logError('Database', 'Cannot get collection, database not connected');
    return null;
  }
  
  return db.collection<T>(collectionName);
}

/**
 * Create a collection if it doesn't exist
 * @param collectionName Name of the collection to create
 * @returns Promise resolving to boolean indicating success
 */
async function createCollection(collectionName: string): Promise<boolean> {
  if (!isConnected || !db) {
    logError('Database', 'Cannot create collection, database not connected');
    return false;
  }
  
  try {
    // Check if collection exists
    const collections = await db.listCollections({ name: collectionName }).toArray();
    
    if (collections.length === 0) {
      // Collection doesn't exist, create it
      await db.createCollection(collectionName);
      logInfo('Database', `Created collection: ${collectionName}`);
    } else {
      logInfo('Database', `Collection already exists: ${collectionName}`);
    }
    
    return true;
  } catch (error: any) {
    logError('Database', `Error creating collection ${collectionName}: ${error.message}`);
    return false;
  }
}

/**
 * Insert a document into a collection
 * @param collectionName Name of the collection
 * @param document Document to insert
 * @returns Promise resolving to inserted ID or null on failure
 */
async function insertDocument<T>(collectionName: string, document: T): Promise<string | null> {
  const collection = getCollection<T>(collectionName);
  
  if (!collection) {
    return null;
  }
  
  try {
    const result = await collection.insertOne(document as any);
    return result.insertedId.toString();
  } catch (error: any) {
    logError('Database', `Error inserting document: ${error.message}`);
    return null;
  }
}

/**
 * Find documents in a collection
 * @param collectionName Name of the collection
 * @param query Query filter
 * @returns Promise resolving to array of documents or empty array on failure
 */
async function findDocuments<T>(collectionName: string, query: object = {}): Promise<T[]> {
  const collection = getCollection<T>(collectionName);
  
  if (!collection) {
    return [];
  }
  
  try {
    return await collection.find(query).toArray();
  } catch (error: any) {
    logError('Database', `Error finding documents: ${error.message}`);
    return [];
  }
}

/**
 * Update documents in a collection
 * @param collectionName Name of the collection
 * @param query Query filter
 * @param update Update operations
 * @returns Promise resolving to number of documents modified or -1 on failure
 */
async function updateDocuments(
  collectionName: string, 
  query: object, 
  update: object
): Promise<number> {
  const collection = getCollection(collectionName);
  
  if (!collection) {
    return -1;
  }
  
  try {
    const result = await collection.updateMany(query, update);
    return result.modifiedCount;
  } catch (error: any) {
    logError('Database', `Error updating documents: ${error.message}`);
    return -1;
  }
}

/**
 * Delete documents from a collection
 * @param collectionName Name of the collection
 * @param query Query filter
 * @returns Promise resolving to number of documents deleted or -1 on failure
 */
async function deleteDocuments(collectionName: string, query: object): Promise<number> {
  const collection = getCollection(collectionName);
  
  if (!collection) {
    return -1;
  }
  
  try {
    const result = await collection.deleteMany(query);
    return result.deletedCount;
  } catch (error: any) {
    logError('Database', `Error deleting documents: ${error.message}`);
    return -1;
  }
}

/**
 * Get database connection status
 * @returns Object with connection status information
 */
function getStatus(): { connected: boolean; dbName: string } {
  return {
    connected: isConnected,
    dbName
  };
}

/**
 * Close the database connection
 * @returns Promise resolving to boolean indicating success
 */
async function close(): Promise<boolean> {
  if (!client) {
    return false;
  }
  
  try {
    await client.close();
    isConnected = false;
    client = null;
    db = null;
    logInfo('Database', 'Database connection closed');
    return true;
  } catch (error: any) {
    logError('Database', `Error closing database connection: ${error.message}`);
    return false;
  }
}

// Export functions
export {
  initialize,
  getCollection,
  createCollection,
  insertDocument,
  findDocuments,
  updateDocuments,
  deleteDocuments,
  getStatus,
  close
};

// Export default object for backwards compatibility
export default {
  initialize,
  getCollection,
  createCollection,
  insertDocument,
  findDocuments,
  updateDocuments,
  deleteDocuments,
  getStatus,
  close
};