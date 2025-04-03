import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * @route GET /api/database/status
 * @desc Check MongoDB connection status (json only route)
 * @access Public
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    console.log('Database status JSON endpoint called');
    
    // Explicitly set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Check MongoDB connection
    const mongodbStatus = await storage.checkDatabaseStatus();
    
    // Return status information as JSON
    return res.json({
      mongodb: mongodbStatus,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    
    // Explicitly set content type to application/json
    res.setHeader('Content-Type', 'application/json');
    
    // Return error as JSON
    return res.status(500).json({
      mongodb: {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
        description: 'An error occurred while checking MongoDB connection status'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;