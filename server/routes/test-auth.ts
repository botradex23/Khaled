import { Router, Request, Response } from 'express';
import { storage } from '../storage';

// Helper function for admin login
const loginAsAdmin = (req: Request, res: Response, adminUser: any) => {
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
  
  // Create a session-compatible admin user object
  const sessionUser = {
    ...adminUser,
    // Include any additional properties needed
    createdAt: adminUser.createdAt || new Date(),
    updatedAt: adminUser.updatedAt || new Date()
  };
  
  // Manually login as admin user
  req.login(sessionUser, { session: true }, (err) => {
    if (err) {
      console.error('Error during admin login:', err);
      return res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Error during login process' 
      });
    }
    
    // Ensure session is saved immediately
    req.session.save((saveErr) => {
      if (saveErr) {
        console.error('Error saving session:', saveErr);
      } else {
        console.log('Session saved successfully, session ID:', req.sessionID);
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
          useTestnet: adminUser.useTestnet,
          isAdmin: adminUser.isAdmin
        }
      });
    });
  });
};

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
    
    // Create a session-compatible user object
    const sessionUser = {
      ...user,
      // Include any additional properties needed
      createdAt: user.createdAt || new Date(),
      updatedAt: user.updatedAt || new Date()
    };
    
    // Manually login user
    req.login(sessionUser, { session: true }, (err) => {
      if (err) {
        console.error('Error during test login:', err);
        return res.status(500).json({ 
          error: 'Internal Server Error', 
          message: 'Error during login process' 
        });
      }
      
      // Ensure session is saved immediately
      req.session.save((saveErr) => {
        if (saveErr) {
          console.error('Error saving session:', saveErr);
        } else {
          console.log('Session saved successfully, session ID:', req.sessionID);
        }
        
        // Set X-Test-User-ID header for subsequent requests
        res.setHeader('X-Test-User-ID', userId.toString());
        
        return res.json({ 
          success: true, 
          message: 'Test login successful', 
          user,
          sessionID: req.sessionID
        });
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

// Helper function to make sure admin user exists
const ensureAdminUserExists = async () => {
  try {
    // Try to find the admin user first
    console.log('Looking for existing admin user...');
    let adminUser = await storage.getUserByUsername('admin');
    
    // If no admin user exists, create one
    if (!adminUser) {
      console.log('Admin user not found, creating a new admin user...');
      
      const newAdminUser = {
        username: "admin",
        email: "admin@example.com",
        password: "admin123", // Simple password for testing
        firstName: "Admin",
        lastName: "User",
        defaultBroker: "binance",
        useTestnet: true,
        isAdmin: true,
        binanceApiKey: process.env.BINANCE_API_KEY || "IdDwQIIneNnLBtj515EZbX3beNliXTlLNPMID9cR5C3ON6C9qnMKybYflbt2Qwty",
        binanceSecretKey: process.env.BINANCE_SECRET_KEY || "COhywWX9SDmIM9B1TrRb26yWFzweU46JdFqRKG6UbEdb60MGOFoCIyra7oLXV7xd",
        okxApiKey: process.env.OKX_API_KEY || "test-api-key",
        okxSecretKey: process.env.OKX_SECRET_KEY || "test-secret-key",
        okxPassphrase: process.env.OKX_PASSPHRASE || "test-passphrase"
      };
      
      adminUser = await storage.createUser(newAdminUser);
      console.log('✅ Admin user created successfully:', adminUser.id);
    } else {
      console.log('✅ Admin user already exists:', adminUser.id);
      
      // Update admin if needed
      if (adminUser && !adminUser.isAdmin) {
        console.log('Updating existing user to have admin privileges');
        adminUser = await storage.updateUser(adminUser.id, { isAdmin: true });
      }
      
      // Update Binance API keys if they're missing
      if (adminUser && (!adminUser.binanceApiKey || !adminUser.binanceSecretKey)) {
        console.log('Updating admin user with Binance API keys');
        adminUser = await storage.updateUser(adminUser.id, { 
          binanceApiKey: process.env.BINANCE_API_KEY || "IdDwQIIneNnLBtj515EZbX3beNliXTlLNPMID9cR5C3ON6C9qnMKybYflbt2Qwty",
          binanceSecretKey: process.env.BINANCE_SECRET_KEY || "COhywWX9SDmIM9B1TrRb26yWFzweU46JdFqRKG6UbEdb60MGOFoCIyra7oLXV7xd" 
        });
      }
    }
    
    return adminUser;
  } catch (error) {
    console.error('Error in ensureAdminUserExists:', error);
    return null;
  }
};

// Create admin user endpoint - will create the admin user if it doesn't exist
router.post('/create-admin', async (req: Request, res: Response) => {
  try {
    const adminUser = await ensureAdminUserExists();
    
    if (!adminUser) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create or find admin user'
      });
    }
    
    return res.json({
      success: true,
      message: 'Admin user created/verified successfully',
      user: {
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        isAdmin: adminUser.isAdmin,
        hasBinanceApiKeys: !!(adminUser.binanceApiKey && adminUser.binanceSecretKey)
      }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'An unknown error occurred'
    });
  }
});

// Specific endpoint to log in as the admin user for testing
router.post('/login-as-admin', async (req: Request, res: Response) => {
  try {
    // Use our helper function to ensure admin user exists
    console.log('Ensuring admin user exists before login attempt...');
    const adminUser = await ensureAdminUserExists();
    
    if (!adminUser) {
      console.error('Failed to create or find admin user');
      return res.status(404).json({
        error: 'Not Found',
        message: 'Admin user could not be created or found'
      });
    }
    
    // Log admin user details
    console.log('Admin user found for login:', {
      id: adminUser.id,
      username: adminUser.username,
      email: adminUser.email,
      isAdmin: adminUser.isAdmin,
      hasBinanceKeys: !!(adminUser.binanceApiKey && adminUser.binanceSecretKey)
    });
    
    // Use our helper for login
    return loginAsAdmin(req, res, adminUser);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      error: 'Internal Server Error', 
      message: error instanceof Error ? error.message : 'An unknown error occurred' 
    });
  }
});

// Feature REMOVED: no need to copy admin API keys
router.post('/copy-admin-keys', async (req: Request, res: Response) => {
  // Return error message explaining this feature has been removed
  return res.status(403).json({
    error: 'Feature Disabled',
    message: 'This feature has been removed. Each user must configure their own API keys for security and data isolation purposes.'
  });
});

export default router;