import express from 'express';
import { storage } from '../storage';

// Create a new router
const router = express.Router();

// Apply middleware to force JSON Content-Type for all routes
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

/**
 * Simple MongoDB status API endpoint
 * 
 * @route GET /api/mongodb/status
 * @returns {Object} Basic MongoDB status information
 */
router.get('/status', async (req, res) => {
  try {
    console.log('MongoDB basic status API endpoint called');
    
    // First check the global connection flag for immediate status
    const isGloballyConnected = global.hasOwnProperty('mongodbConnected') && (global as any).mongodbConnected === true;
    
    if (!isGloballyConnected) {
      console.error('MongoDB is not connected according to global connection flag');
      
      // Return status based on global flag
      return res.status(503).json({
        connected: false,
        globalFlagStatus: false,
        reason: 'MongoDB connection not established (global flag)',
        timestamp: new Date().toISOString()
      });
    }
    
    // If global flag shows connected, get detailed database status from storage
    const status = await storage.checkDatabaseStatus();
    
    // Return simple status
    return res.json({
      connected: status.connected,
      globalFlagStatus: true,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking MongoDB basic status:', error);
    
    // Return error as JSON
    return res.status(500).json({
      connected: false,
      globalFlagStatus: global.hasOwnProperty('mongodbConnected') ? Boolean((global as any).mongodbConnected) : false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed MongoDB status API endpoint that returns detailed information
 * about the MongoDB connection status.
 * 
 * @route GET /api/mongodb/detailed-status
 * @returns {Object} Detailed MongoDB status information
 */
router.get('/detailed-status', async (req, res) => {
  try {
    console.log('MongoDB detailed status API endpoint called');
    
    // Force content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // First check the global connection flag for immediate status
    const isGloballyConnected = global.hasOwnProperty('mongodbConnected') && (global as any).mongodbConnected === true;
    
    if (!isGloballyConnected) {
      console.error('MongoDB is not connected according to global connection flag - detailed status');
      
      // Return detailed status based on global flag
      return res.status(503).json({
        status: {
          connected: false,
          description: 'MongoDB connection not established (global flag check)',
          initializing: true
        },
        globalFlagStatus: false,
        engine: 'MongoDB Atlas',
        type: 'Document Database',
        isRequired: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        isCritical: true,
        notes: 'MongoDB connection is not established according to global flag',
        mongoUri: process.env.MONGO_URI 
          ? `${process.env.MONGO_URI.split('@')[0].substring(0, 15)}...` 
          : 'Not configured'
      });
    }
    
    // If global flag is connected, get database status from storage
    const status = await storage.checkDatabaseStatus();
    
    // Add additional information
    const result = {
      status,
      globalFlagStatus: true,
      engine: 'MongoDB Atlas',
      type: 'Document Database',
      isRequired: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isCritical: !status.connected,
      notes: status.connected 
        ? 'MongoDB connection is healthy' 
        : 'MongoDB connection is down - application may not function correctly'
    };
    
    return res.json(result);
  } catch (error) {
    console.error('Error checking MongoDB status:', error);
    
    // Force content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Return error as JSON
    return res.status(500).json({
      status: {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        description: 'Error occurred while checking MongoDB status'
      },
      globalFlagStatus: global.hasOwnProperty('mongodbConnected') ? Boolean((global as any).mongodbConnected) : false,
      engine: 'MongoDB Atlas',
      type: 'Document Database',
      isRequired: true,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      isCritical: true
    });
  }
});

export default router;