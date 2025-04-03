/**
 * Simple MongoDB Connection Test
 * 
 * This script checks if MongoDB is accessible and returns a JSON response.
 */

// Import required modules
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/test';

async function checkMongoDBStatus() {
  console.log('Checking MongoDB connection status...');
  
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
    console.log(`Using connection string: ${MONGODB_URI.replace(/mongodb\+srv:\/\/([^:]+):[^@]+@/, 'mongodb+srv://[username]:[password]@')}`);
    
    client = new MongoClient(MONGODB_URI, { 
      connectTimeoutMS: 5000, 
      socketTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    // Ping the database to verify connection
    await client.db().admin().ping();
    console.log('Successfully pinged MongoDB');
    
    return {
      connected: true,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    return {
      connected: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the check and print the results
async function main() {
  try {
    const status = await checkMongoDBStatus();
    console.log('\nMongoDB Connection Status:');
    console.log(JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('Error running the check:', error);
  }
}

main();