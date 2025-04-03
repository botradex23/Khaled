/**
 * Database Status API
 * 
 * Provides information about the status of connected databases (MongoDB, PostgreSQL, etc.)
 */
import express, { Request, Response } from 'express';
import { testMongoDBConnection } from '../storage/mongodb';

const router = express.Router();

/**
 * GET /api/database-status
 * 
 * Returns the status of all database connections
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Test MongoDB connection
    const mongoStatus = await testMongoDBConnection();
    
    // Get MongoDB connection info
    const mongoInfo = {
      connected: mongoStatus.connected,
      description: mongoStatus.description,
      error: mongoStatus.error
    };
    
    // Return overall status
    return res.json({
      status: 'success',
      mongodb: mongoInfo
    });
  } catch (error) {
    console.error('Error checking database status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to check database status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;