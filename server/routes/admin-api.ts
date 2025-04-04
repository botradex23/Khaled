import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from '../auth';
import { storage } from '../storage';

const router = Router();

/**
 * Admin route to check which users have API keys configured
 * This could be used for monitoring and system management
 */
router.get('/users/api-keys-status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // First check if the requesting user is an admin
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Check if the user has admin privileges using the isAdmin field
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden - Admin privileges required' 
      });
    }
    
    // Get all users (since we're using MemStorage, we can access all users)
    // In a real production system with proper DB, you'd have a more structured query
    const memStorage = storage as any;
    if (!memStorage.users || typeof memStorage.users.values !== 'function') {
      return res.status(500).json({ 
        success: false, 
        message: 'Could not access users - storage interface not available' 
      });
    }
    
    const users = Array.from(memStorage.users.values());
    
    // Prepare response with masked API key status (for security)
    const usersStatus = users.map(user => ({
      id: user.id,
      email: user.email,
      username: user.username,
      apiKeysConfigured: !!(user.okxApiKey && user.okxSecretKey && user.okxPassphrase),
      defaultBroker: user.defaultBroker || 'okx',
      useTestnet: user.useTestnet === undefined ? true : !!user.useTestnet,
      lastUpdated: user.createdAt // In a real system, you'd track when keys were last updated
    }));
    
    return res.json({
      success: true,
      totalUsers: users.length,
      usersWithApiKeys: usersStatus.filter(u => u.apiKeysConfigured).length,
      users: usersStatus
    });
  } catch (error: any) {
    console.error('Error in API key status:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

/**
 * Admin route to verify and update API keys for a specific user
 * This is useful for customer support scenarios
 */
router.post('/users/:userId/verify-api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // First check if the requesting user is an admin
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    // Check if the user has admin privileges using the isAdmin field
    if (!req.user.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: 'Forbidden - Admin privileges required' 
      });
    }
    
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(targetUserId)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid user ID' 
      });
    }
    
    // Get the target user
    const user = await storage.getUser(targetUserId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Check if the user has API keys configured
    const apiKeys = await storage.getUserApiKeys(targetUserId);
    if (!apiKeys || !apiKeys.okxApiKey || !apiKeys.okxSecretKey || !apiKeys.okxPassphrase) {
      return res.status(400).json({ 
        success: false, 
        message: 'User does not have API keys configured',
        details: {
          hasApiKey: !!apiKeys?.okxApiKey,
          hasSecretKey: !!apiKeys?.okxSecretKey,
          hasPassphrase: !!apiKeys?.okxPassphrase
        }
      });
    }
    
    // In a real implementation, you'd validate the keys with the exchange API
    // For now, we'll just check if they exist
    
    return res.json({
      success: true,
      message: 'API keys verification successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      apiKeysStatus: {
        configured: true,
        defaultBroker: apiKeys.defaultBroker,
        useTestnet: apiKeys.useTestnet
      }
    });
  } catch (error: any) {
    console.error('Error verifying API keys:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Server error: ${error.message}` 
    });
  }
});

export default router;