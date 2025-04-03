import express from 'express';
import { storage } from '../storage';

// Setup the Express router
const router = express.Router();

// Plain JSON API endpoint for MongoDB status check
router.get('/', async (req, res) => {
  try {
    console.log('MongoDB status check endpoint called');
    
    // Force Content-Type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Get the status from the storage interface
    const status = await storage.checkDatabaseStatus();
    
    // Return as simple JSON
    return res.json(status);
  } catch (error) {
    console.error('Error checking MongoDB status:', error);
    
    // Force Content-Type to application/json 
    res.setHeader('Content-Type', 'application/json');
    
    return res.status(500).json({
      connected: false,
      error: error instanceof Error ? error.message : String(error),
      description: 'An error occurred while checking MongoDB connection status'
    });
  }
});

export default router;