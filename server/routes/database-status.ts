import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * @route GET /api/database-status
 * @desc Check MongoDB connection status
 * @access Public
 */
router.get('/', async (req, res) => {
  try {
    console.log('Database status endpoint called');
    
    // Check MongoDB connection
    const mongodbStatus = await storage.checkDatabaseStatus();
    
    // Return status information
    res.json({
      mongodb: mongodbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    res.status(500).json({
      mongodb: {
        connected: false,
        error: error.message,
        description: 'An error occurred while checking MongoDB connection status'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;