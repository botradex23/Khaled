/**
 * Minimal Express Server for MongoDB Status Check
 * 
 * This is a standalone Express server that only serves the MongoDB status endpoint.
 * It's a workaround for the issue with the main server's MongoDB status route.
 */

const express = require('express');
const cors = require('cors');

// Import MongoDB and connection details
const { MongoClient } = require('mongodb');
require('dotenv').config();

// Get MongoDB connection string from environment variables
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://username:password@cluster.mongodb.net/test';

// Create a simple in-memory cache for connection status
let connectionStatusCache = {
  connected: false,
  lastChecked: null,
  error: null
};

// Create a new Express application
const app = express();

// Enable CORS for all origins
app.use(cors());

// Set JSON as the default content type
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * Check MongoDB connection status
 */
async function checkDatabaseStatus() {
  console.log('Checking MongoDB connection status...');
  
  // If we have a cached status from the last 5 seconds, use it
  if (connectionStatusCache.lastChecked && 
      (Date.now() - connectionStatusCache.lastChecked) < 5000) {
    console.log('Using cached connection status');
    return {
      connected: connectionStatusCache.connected,
      error: connectionStatusCache.error,
      timestamp: connectionStatusCache.lastChecked,
    };
  }
  
  let client = null;
  
  try {
    console.log('Connecting to MongoDB...');
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
    
    // Update cache
    connectionStatusCache = {
      connected: true,
      lastChecked: Date.now(),
      error: null
    };
    
    return {
      connected: true,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    // Update cache
    connectionStatusCache = {
      connected: false,
      lastChecked: Date.now(),
      error: error.message
    };
    
    return {
      connected: false,
      error: error.message,
      timestamp: Date.now(),
    };
  } finally {
    if (client) {
      await client.close();
      console.log('MongoDB connection closed');
    }
  }
}

/**
 * MongoDB Status Check Endpoint
 */
app.get('/api/mongodb-status', async (req, res) => {
  try {
    console.log('Minimal MongoDB status server: Status check requested');
    
    // Get the MongoDB connection status
    const status = await checkDatabaseStatus();
    
    // Return the status with additional information
    return res.json({
      status: status.connected ? 'connected' : 'disconnected',
      details: status,
      timestamp: new Date().toISOString(),
      engine: 'MongoDB Atlas',
      critical: !status.connected
    });
  } catch (error) {
    console.error('Minimal MongoDB status server: Error:', error);
    
    // Return the error status
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Start the server on port 3001
const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal MongoDB status server running on port ${PORT}`);
});