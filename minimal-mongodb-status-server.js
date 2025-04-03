/**
 * Minimal Express Server for MongoDB Status Check
 * 
 * This is a standalone Express server that only serves the MongoDB status endpoint.
 * It's a workaround for the issue with the main server's MongoDB status route.
 */

import express from 'express';
import cors from 'cors';
import { storage } from './server/storage.js';

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
 * MongoDB Status Check Endpoint
 */
app.get('/api/mongodb-status', async (req, res) => {
  try {
    console.log('Minimal MongoDB status server: Status check requested');
    
    // Get the MongoDB connection status
    const status = await storage.checkDatabaseStatus();
    
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