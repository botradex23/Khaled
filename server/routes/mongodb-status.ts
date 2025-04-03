import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * @route GET /api/mongodb/status
 * @desc Check MongoDB connection status - dedicated endpoint for MongoDB, the only database used in the application
 * @access Public
 * @returns JSON with MongoDB connection status and details
 */
router.get('/', async (req, res) => {
  try {
    console.log('MongoDB dedicated status endpoint called');
    
    // Set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // First check the global connection flag for immediate status
    const isGloballyConnected = global.hasOwnProperty('mongodbConnected') && (global as any).mongodbConnected === true;
    
    if (!isGloballyConnected) {
      console.error('CRITICAL DATABASE ERROR: MongoDB Atlas is not connected (global flag)');
      console.error('The application requires MongoDB Atlas to function properly');
      console.error('Please check your MongoDB connection configuration in .env');
      
      // Return status 503 Service Unavailable if MongoDB is not connected based on global flag
      return res.status(503).json({
        mongodb: {
          connected: false,
          engine: 'MongoDB Atlas',
          type: 'Document Database',
          isRequired: true,
          notes: 'CRITICAL ERROR: MongoDB Atlas connection failed - global connection flag shows disconnected',
          description: 'MongoDB connection is not established according to global tracker'
        },
        globalFlagStatus: false,
        timestamp: new Date().toISOString(),
        critical: true,
        message: 'MongoDB Atlas connection failed - application cannot function'
      });
    }
    
    // If global flag is good, check MongoDB connection status using storage
    const mongodbStatus = await storage.checkDatabaseStatus();
    
    // Add MongoDB-specific information to the response
    const detailedStatus = {
      ...mongodbStatus,
      engine: 'MongoDB Atlas',
      type: 'Document Database',
      isRequired: true, // MongoDB is required for the application to function
      notes: mongodbStatus.connected 
        ? 'MongoDB Atlas connection is active and healthy' 
        : 'CRITICAL ERROR: MongoDB Atlas connection failed - application cannot function without MongoDB'
    };
    
    // If MongoDB is not connected, this is a critical error
    if (!mongodbStatus.connected) {
      console.error('CRITICAL DATABASE ERROR: MongoDB Atlas is not connected');
      console.error('The application requires MongoDB Atlas to function properly');
      console.error('Please check your MongoDB connection configuration in .env');
      
      // Return status 503 Service Unavailable if MongoDB is not connected
      return res.status(503).json({
        mongodb: detailedStatus,
        globalFlagStatus: true, // Global flag is true but the database check failed
        timestamp: new Date().toISOString(),
        critical: true,
        message: 'MongoDB Atlas connection failed - application cannot function'
      });
    }
    
    // Return full status information for a healthy connection
    res.json({
      mongodb: detailedStatus,
      globalFlagStatus: true,
      timestamp: new Date().toISOString(),
      critical: false,
      message: 'MongoDB Atlas connection is healthy'
    });
  } catch (error) {
    console.error('Error checking MongoDB database status:', error);
    console.error('This is a critical error - the application requires MongoDB Atlas');
    
    // Set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    res.status(500).json({
      mongodb: {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        description: 'Critical error checking MongoDB connection - application cannot function properly',
        engine: 'MongoDB Atlas',
        type: 'Document Database',
        isRequired: true,
        notes: 'CRITICAL ERROR: Unable to verify MongoDB connection status'
      },
      globalFlagStatus: false,
      timestamp: new Date().toISOString(),
      critical: true,
      message: 'Failed to check MongoDB connection status - application cannot function properly'
    });
  }
});

export default router;