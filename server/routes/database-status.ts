import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { testMongoDBConnection } from '../storage/mongodb';

/**
 * Checks if PostgreSQL database is connected
 * @returns Object with connection information
 */
const checkPostgres = async () => {
  try {
    // Test PostgreSQL connection by executing a simple query
    const result = await db.execute(sql`SELECT 1 as connected`);
    const rows = result as unknown as Array<{connected: number}>;
    const connected = rows && rows.length > 0 && rows[0].connected === 1;
    
    return {
      connected,
      status: connected ? 'connected' : 'disconnected',
      description: connected 
        ? 'PostgreSQL connection is active and responding to queries' 
        : 'PostgreSQL connection failed to execute test query'
    };
  } catch (error) {
    console.error('Error checking PostgreSQL:', error);
    return {
      connected: false,
      status: 'error',
      description: `PostgreSQL connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

/**
 * Checks if MongoDB database is connected
 * @returns Object with connection information
 */
const checkMongoDB = async () => {
  try {
    // Test MongoDB connection using the test function
    const { connected, error } = await testMongoDBConnection();
    
    return {
      connected,
      status: connected ? 'connected' : 'disconnected',
      description: connected 
        ? 'MongoDB connection is active and responding to queries' 
        : `MongoDB connection failed: ${error || 'Unknown reason'}`
    };
  } catch (error) {
    console.error('Error checking MongoDB:', error);
    return {
      connected: false,
      status: 'error',
      description: `MongoDB connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

const router = Router();

// Get database connection status
router.get('/status', async (req, res) => {
  try {
    // Check PostgreSQL connection
    const pgStatus = await checkPostgres();
    
    // Check MongoDB connection
    const mongoStatus = await checkMongoDB();
    
    // Determine overall status
    const allConnected = pgStatus.connected && mongoStatus.connected;
    const anyConnected = pgStatus.connected || mongoStatus.connected;
    
    // Format response with connection details
    const response = {
      status: allConnected ? 'ok' : (anyConnected ? 'partial' : 'error'),
      connections: {
        postgresql: pgStatus,
        mongodb: mongoStatus
      },
      message: allConnected 
        ? 'All database connections are active' 
        : (anyConnected ? 'Some database connections failed' : 'All database connections failed')
    };
    
    // Set HTTP status based on connection status
    if (!pgStatus.connected && !mongoStatus.connected) {
      // Both connections failed
      return res.status(503).json(response);
    } else if (!pgStatus.connected || !mongoStatus.connected) {
      // One connection failed
      return res.status(207).json(response);
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