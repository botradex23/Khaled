/**
 * Database Health Check
 * 
 * Checks if the MongoDB database is accessible and responsive.
 */

import { MongoClient } from 'mongodb';
import { DatabaseCheckResult, Issue } from '../types';
import { logger } from '../logger';

// Database check configuration
interface DatabaseConfig {
  uri: string;
  name: string;
  enabled: boolean;
}

/**
 * Check if MongoDB database is accessible
 */
export async function checkDatabaseConnection(config: DatabaseConfig): Promise<DatabaseCheckResult> {
  logger.info('Checking database connection', { dbName: config.name, enabled: config.enabled });
  
  // If database check is disabled, return success
  if (!config.enabled) {
    logger.info('Database check is disabled, skipping');
    return {
      healthy: true,
      issues: [],
      connected: false
    };
  }
  
  const issues: Issue[] = [];
  let connected = false;
  let responseTime: number | undefined;
  let error: string | undefined;
  
  try {
    // Create MongoDB client
    const client = new MongoClient(config.uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    
    // Time the connection
    const startTime = Date.now();
    
    // Connect to MongoDB
    await client.connect();
    
    // Test a basic command
    const adminDb = client.db('admin');
    await adminDb.command({ ping: 1 });
    
    // Calculate response time
    responseTime = Date.now() - startTime;
    
    // Successfully connected
    connected = true;
    
    logger.info(`Successfully connected to MongoDB (${responseTime}ms)`);
    
    // Check if specified database exists
    const dbList = await client.db().admin().listDatabases();
    const dbExists = dbList.databases.some(db => db.name === config.name);
    
    if (!dbExists) {
      logger.warn(`Database '${config.name}' doesn't exist`);
      
      issues.push({
        type: 'database',
        severity: 'high',
        component: 'mongodb',
        message: `Database '${config.name}' doesn't exist`,
        timestamp: new Date().toISOString()
      });
    } else {
      // Check if we can access the database
      const db = client.db(config.name);
      const collections = await db.listCollections().toArray();
      logger.info(`Found ${collections.length} collections in ${config.name} database`);
    }
    
    // Close the connection
    await client.close();
  } catch (err) {
    logger.error('Failed to connect to MongoDB', { error: err });
    
    error = err.message;
    
    issues.push({
      type: 'database',
      severity: 'critical',
      component: 'mongodb',
      message: 'Failed to connect to MongoDB',
      details: { error: err.message },
      timestamp: new Date().toISOString()
    });
  }
  
  // Check if response time is too high
  if (connected && responseTime && responseTime > 1000) {
    logger.warn(`MongoDB connection is slow: ${responseTime}ms`);
    
    issues.push({
      type: 'database',
      severity: 'medium',
      component: 'mongodb',
      message: `MongoDB connection is slow: ${responseTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
  
  const result: DatabaseCheckResult = {
    healthy: connected && issues.length === 0,
    issues,
    connected,
    responseTime,
    error
  };
  
  logger.info('Database check completed', { result });
  return result;
}