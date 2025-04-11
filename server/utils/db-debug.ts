/**
 * MongoDB Debug Utility
 * 
 * This utility script is used to debug and explore the MongoDB database
 * structure, collections, and documents.
 */
import { connectToMongoDB } from '../storage/mongodb';

export async function listCollections() {
  try {
    // Connect to MongoDB
    console.log('Attempting to connect to MongoDB...');
    const connected = await connectToMongoDB();
    if (!connected) {
      console.error('Failed to connect to MongoDB. Cannot list collections.');
      return { success: false, message: 'Failed to connect to MongoDB' };
    }
    
    // Now import the mongoClient which should be initialized
    const { mongoClient } = await import('../storage/mongodb');
    
    if (!mongoClient) {
      console.error('MongoDB client not initialized after connection.');
      return { success: false, message: 'MongoDB client not initialized' };
    }
    
    console.log('MongoDB connection established');
    
    // Get database name and information
    const adminDb = mongoClient.db('admin');
    const databases = await adminDb.admin().listDatabases();
    console.log('Available databases:', databases.databases.map((db: any) => db.name));
    
    // Explicitly use the Saas database
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    
    // Get all collections in the database
    const collections = await db.listCollections().toArray();
    
    console.log(`Found ${collections.length} collections in the database:`, collections.map((col: { name: string }) => col.name));
    
    // Return collection names
    return {
      success: true,
      collections: collections.map((col: { name: string }) => col.name)
    };
  } catch (error: any) {
    console.error('Error listing collections:', error);
    return { 
      success: false, 
      message: `Error listing collections: ${error.message}`,
      error: error.message
    };
  }
}

export async function getCollectionSample(collectionName: string, limit: number = 1) {
  try {
    // Connect to MongoDB if not already connected
    if (!(await connectToMongoDB())) {
      return { success: false, message: 'Failed to connect to MongoDB' };
    }
    
    const { mongoClient } = await import('../storage/mongodb');
    
    if (!mongoClient) {
      return { success: false, message: 'MongoDB client not initialized' };
    }
    
    // Get the collection from Saas database
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const collection = db.collection(collectionName);
    
    // Get a sample of documents
    const documents = await collection.find().limit(limit).toArray();
    
    return {
      success: true,
      collectionName,
      count: documents.length,
      documents
    };
  } catch (error: any) {
    console.error(`Error getting sample from ${collectionName}:`, error);
    return { 
      success: false, 
      message: `Error getting documents: ${error.message}`,
      error: error.message
    };
  }
}

export async function getUserByUsername(username: string) {
  try {
    // Connect to MongoDB if not already connected
    if (!(await connectToMongoDB())) {
      return { success: false, message: 'Failed to connect to MongoDB' };
    }
    
    const { mongoClient } = await import('../storage/mongodb');
    
    if (!mongoClient) {
      return { success: false, message: 'MongoDB client not initialized' };
    }
    
    // Get the users collection from Saas database
    const db = mongoClient.db('Saas');
    console.log('Using database:', db.databaseName);
    const users = db.collection('users');
    
    // Find user by username
    const user = await users.findOne({ username });
    
    if (!user) {
      return {
        success: false,
        message: `User with username '${username}' not found`
      };
    }
    
    return {
      success: true,
      message: `Found user: ${username}`,
      user
    };
  } catch (error: any) {
    console.error(`Error finding user ${username}:`, error);
    return { 
      success: false, 
      message: `Error finding user: ${error.message}`,
      error: error.message
    };
  }
}