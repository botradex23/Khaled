import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * @route GET /api/database-status
 * @desc Check MongoDB connection status - the only database used in the application
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('MongoDB database status endpoint called');
    
    // Set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Check MongoDB connection - the only database we use
    const mongodbStatus = await storage.checkDatabaseStatus();
    
    // If MongoDB is not connected, this is a critical error
    if (!mongodbStatus.connected) {
      console.error('CRITICAL: MongoDB database is not connected');
      console.error('The application requires MongoDB Atlas to function properly');
    }
    
    // Return status information
    res.json({
      mongodb: mongodbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      critical: !mongodbStatus.connected // Flag to indicate critical error if MongoDB is not connected
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
        description: 'Critical error checking MongoDB connection - application cannot function properly'
      },
      timestamp: new Date().toISOString(),
      critical: true
    });
  }
});

export default router;