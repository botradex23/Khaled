import { Router } from 'express';
import { check_database_status } from '../utils/check-database-status';

const router = Router();

// Get database connection status
router.get('/status', async (req, res) => {
  try {
    // Check PostgreSQL connection
    const pgConnected = await check_database_status.checkPostgresConnection();
    
    // Check MongoDB connection
    const mongoConnected = await check_database_status.checkMongoDBConnection();
    
    // Format response with connection details
    const response = {
      status: 'ok',
      connections: {
        postgresql: {
          connected: pgConnected,
          status: pgConnected ? 'connected' : 'disconnected',
          description: pgConnected ? 'PostgreSQL connection is active' : 'PostgreSQL connection failed'
        },
        mongodb: {
          connected: mongoConnected,
          status: mongoConnected ? 'connected' : 'disconnected',
          description: mongoConnected ? 'MongoDB connection is active' : 'MongoDB connection failed'
        }
      },
      message: 'Database status check completed'
    };
    
    // Set HTTP status based on connection status
    if (!pgConnected && !mongoConnected) {
      // Both connections failed
      return res.status(503).json({
        ...response,
        status: 'error',
        message: 'All database connections failed'
      });
    } else if (!pgConnected || !mongoConnected) {
      // One connection failed
      return res.status(207).json({
        ...response,
        status: 'partial',
        message: 'Some database connections failed'
      });
    }
    
    // All connections successful
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error checking database status:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred while checking database status',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;