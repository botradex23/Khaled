/**
 * Direct MongoDB Status Check
 * 
 * A separate minimal Express router that serves a clean JSON response
 * for MongoDB connection status checks
 */

const express = require('express');
const router = express.Router();

// Import storage
const { storage } = require('./storage');

/**
 * @route GET /api/mongodb-status-direct
 * @desc Check MongoDB connection status directly
 * @access Public
 * @returns JSON with MongoDB connection status
 */
router.get('/', async (req, res) => {
  try {
    console.log('Direct MongoDB status endpoint called');
    
    // Explicitly set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Check database status
    const status = await storage.checkDatabaseStatus();
    
    // Return a clean JSON response
    return res.json({
      status: status.connected ? 'connected' : 'disconnected',
      details: status,
      engine: 'MongoDB Atlas',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking MongoDB status:', error);
    
    // Explicitly set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Return error as JSON
    return res.status(500).json({
      status: 'error',
      message: error.message || 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;