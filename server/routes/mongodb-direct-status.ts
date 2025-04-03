/**
 * MongoDB Direct Status Check Route
 * 
 * This file provides a direct route for checking MongoDB connection status
 * with a specific URL path pattern designed to avoid Vite middleware interception.
 * 
 * The route is deliberately uses a specific format to avoid Vite processing.
 */

import express, { Router, Request, Response } from 'express';

const router = express.Router();

// This URL path uses a specific extension (.json) pattern to avoid Vite interception
router.get('/api/mongodb-status-direct-check.json', async (req: Request, res: Response) => {
  // Force JSON response type
  res.setHeader('Content-Type', 'application/json');
  
  // Get MongoDB URI from environment
  const mongoUri = process.env.MONGO_URI;
  
  if (!mongoUri) {
    return res.status(500).json({
      status: 'error',
      connected: false,
      message: 'MongoDB URI is not configured in environment variables',
      timestamp: new Date().toISOString()
    });
  }
  
  try {
    // Instead of direct MongoDB connection, check if MongoDB is accessible
    // by checking if the storage mongo wrapper is initialized
    const isConnected = global.hasOwnProperty('mongodbConnected') && (global as any).mongodbConnected === true;
    
    const mongoInfo = {
      mongoHost: mongoUri.split('@')[1]?.split('/')[0] || 'unknown',
      dbName: mongoUri.split('/').pop()?.split('?')[0] || 'unknown'
    };
    
    if (isConnected) {
      return res.status(200).json({
        status: 'success',
        connected: true,
        message: 'MongoDB is connected through the application',
        timestamp: new Date().toISOString(),
        mongoInfo
      });
    } else {
      // Try to check if MongoDB is initializing
      return res.status(200).json({
        status: 'warning',
        connected: false,
        initializing: true,
        message: 'MongoDB connection is initializing or not ready yet',
        timestamp: new Date().toISOString(),
        mongoInfo
      });
    }
  } catch (error: any) {
    console.error('MongoDB direct status check error:', error);
    
    return res.status(500).json({
      status: 'error',
      connected: false,
      message: error.message || 'Failed to check MongoDB connection status',
      error: error.toString(),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;