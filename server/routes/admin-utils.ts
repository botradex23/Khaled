/**
 * Admin Utilities Routes
 * 
 * This file contains utility routes for admin-related operations
 * like fixing admin account issues.
 */
import { Router, Request, Response } from 'express';
import { fixAdminPassword } from '../utils/admin-password-fix';
import { listCollections, getCollectionSample, getUserByUsername } from '../utils/db-debug';

const router = Router();

// Middleware to check admin utility key
const checkAdminKey = (req: Request, res: Response, next: Function) => {
  const adminKey = req.headers['x-admin-utility-key'];
  
  if (!adminKey || adminKey !== process.env.ADMIN_UTILITY_KEY) {
    console.log('Admin key validation failed');
    return res.status(403).json({
      success: false,
      message: 'Unauthorized - requires admin utility key'
    });
  }
  
  console.log('Admin key validation passed');
  next();
};

// Endpoint to fix admin password
router.post('/fix-admin-password', checkAdminKey, async (req: Request, res: Response) => {
  try {
    console.log('Admin utils fix-admin-password endpoint called');
    
    // Run the fix function
    const result = await fixAdminPassword();
    console.log('Fix admin password result:', result);
    
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /fix-admin-password endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Endpoint to list database collections
router.get('/db/collections', checkAdminKey, async (req: Request, res: Response) => {
  try {
    console.log('Admin utils list collections endpoint called');
    
    // Get list of collections
    const result = await listCollections();
    console.log('List collections result:', result);
    
    return res.json(result);
  } catch (error: any) {
    console.error('Error in /db/collections endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Endpoint to get a sample from a collection
router.get('/db/collection/:name', checkAdminKey, async (req: Request, res: Response) => {
  try {
    console.log(`Admin utils get collection sample endpoint called for ${req.params.name}`);
    
    // Get limit from query param, default to 1
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 1;
    
    // Get collection sample
    const result = await getCollectionSample(req.params.name, limit);
    console.log(`Collection sample result for ${req.params.name}:`, result.success);
    
    return res.json(result);
  } catch (error: any) {
    console.error(`Error in /db/collection/${req.params.name} endpoint:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Endpoint to get user by username
router.get('/db/user/:username', checkAdminKey, async (req: Request, res: Response) => {
  try {
    console.log(`Admin utils get user endpoint called for ${req.params.username}`);
    
    // Get user by username
    const result = await getUserByUsername(req.params.username);
    console.log(`Get user result for ${req.params.username}:`, result.success);
    
    return res.json(result);
  } catch (error: any) {
    console.error(`Error in /db/user/${req.params.username} endpoint:`, error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;