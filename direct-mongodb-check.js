/**
 * Direct MongoDB Connection Check
 * 
 * This script directly tests the MongoDB connection without going through the Express API.
 * It uses the same connection logic as the application but in a standalone context.
 */

import { config } from 'dotenv';
import { MongoClient } from 'mongodb';

config();

// Set the MongoDB connection string from env
const uri = process.env.MONGO_URI;

async function checkMongoDBConnection() {
  let client;
  try {
    if (!uri) {
      console.error('ERROR: MONGO_URI environment variable is not set!');
      return false;
    }
    
    console.log('MongoDB connection string found:', uri.substring(0, 20) + '...');
    console.log('MongoDB cluster:', uri.split('@')[1]?.split('/')[0] || 'Invalid URI format');
    console.log('MongoDB database name:', uri.split('/').pop()?.split('?')[0] || 'Invalid URI format');
    
    console.log('Attempting to connect to MongoDB...');
    client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    await client.connect();
    
    // Check if we can issue a simple database command
    const adminDb = client.db('admin');
    const result = await adminDb.command({ ping: 1 });
    
    if (result && result.ok === 1) {
      console.log('MongoDB connection SUCCESSFUL! 🟢');
      console.log('Server info:', JSON.stringify(result, null, 2));
      return true;
    } else {
      console.error('MongoDB ping command failed:', result);
      return false;
    }
  } catch (error) {
    console.error('MongoDB connection FAILED! 🔴');
    console.error('Error details:', error.message);
    return false;
  } finally {
    if (client) {
      console.log('Closing MongoDB connection...');
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

// Run the check
checkMongoDBConnection()
  .then(isConnected => {
    console.log('MongoDB connection status:', isConnected ? 'Connected' : 'Disconnected');
    process.exit(isConnected ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during connection check:', error);
    process.exit(1);
  });