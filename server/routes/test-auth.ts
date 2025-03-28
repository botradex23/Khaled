import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Test login endpoint
router.post('/test-login', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        error: 'Bad Request', 
        message: 'User ID is required' 
      });
    }
    
    // Get user by ID
    const user = await storage.getUser(parseInt(userId));
    
    if (!user) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'User not found' 
      });
    }
    
    // Manually login user
    req.login(user, (err) => {
      if (err) {
        console.error('Error during test login:', err);
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Error during login process' 
        });
      }
      
      // Set X-Test-User-ID header for subsequent requests
      res.setHeader('X-Test-User-ID', userId.toString());
      
      return res.json({ 
        success: true, 
        message: 'Test login successful', 
        user
      });
    });
  } catch (error) {
    console.error('Test login error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
});

// Specific endpoint to log in as the admin user for testing
router.post('/login-as-admin', async (req: Request, res: Response) => {
  try {
    // Try to find the admin user
    const adminUser = await storage.getUserByUsername('admin');
    
    if (!adminUser) {
      return res.status(404).json({ 
        error: 'Not Found', 
        message: 'Admin user not found. Make sure the admin user was created in storage.ts.' 
      });
    }
    
    // Log API key status
    console.log('Admin user API key status:', {
      userId: adminUser.id,
      username: adminUser.username,
      hasApiKey: !!adminUser.okxApiKey,
      hasSecretKey: !!adminUser.okxSecretKey,
      hasPassphrase: !!adminUser.okxPassphrase,
      apiKeyLength: adminUser.okxApiKey ? adminUser.okxApiKey.length : 'N/A',
      secretKeyLength: adminUser.okxSecretKey ? adminUser.okxSecretKey.length : 'N/A',
      passphraseLength: adminUser.okxPassphrase ? adminUser.okxPassphrase.length : 'N/A'
    });
    
    // Manually login as admin user
    req.login(adminUser, (err) => {
      if (err) {
        console.error('Error during admin login:', err);
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Error during login process' 
        });
      }
      
      // Set header to indicate admin login
      res.setHeader('X-Test-Admin', 'true');
      
      return res.json({ 
        success: true, 
        message: 'Admin login successful',
        user: {
          id: adminUser.id,
          username: adminUser.username,
          email: adminUser.email,
          hasApiKeys: !!(adminUser.okxApiKey && adminUser.okxSecretKey && adminUser.okxPassphrase),
          useTestnet: adminUser.useTestnet
        }
      });
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
});

export default router;