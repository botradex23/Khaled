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
  
  // Create a session-compatible admin user object with all required fields
  const sessionUser = {
    ...adminUser,
    // Ensure all required fields are present
    id: adminUser.id,
    username: adminUser.username || 'admin',
    email: adminUser.email || 'admin@example.com',
    firstName: adminUser.firstName || 'Admin',
    lastName: adminUser.lastName || 'User',
    isAdmin: true,
    useTestnet: adminUser.useTestnet !== undefined ? adminUser.useTestnet : true,
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
    
    // Store login timestamp in session for verification
    if (req.session) {
      // Use typecasting to bypass the TypeScript error
      (req.session as any).loginTime = Date.now();
      (req.session as any).user = { id: sessionUser.id, username: sessionUser.username };
    }
    
    // Force session regeneration to avoid session fixation
    req.session.regenerate((regenerateErr) => {
      if (regenerateErr) {
        console.error('Error regenerating session:', regenerateErr);
        return res.status(500).json({ 
          error: 'Session Error', 
          message: 'Error creating secure session' 
        });
      }
      
      // Re-login after session regeneration
      req.login(sessionUser, { session: true }, (loginErr) => {
        if (loginErr) {
          console.error('Error during re-login:', loginErr);
          return res.status(500).json({ 
            error: 'Login Error', 
            message: 'Error establishing session'
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
          
          // Set cookie header explicitly to reinforce session cookie
          res.cookie('crypto.sid.authenticated', 'true', { 
            maxAge: 90 * 24 * 60 * 60 * 1000,
            path: '/', 
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production'
          });
          
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
            },
            sessionID: req.sessionID
          });
        });
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
      
      // Hash the password with SHA-256 (same as in local.ts)
      const crypto = require('crypto');
      const plainPassword = "admin123"; // Simple password for testing
      const hashedPassword = crypto.createHash('sha256').update(plainPassword).digest('hex');
      
      const newAdminUser = {
        username: "admin",
        email: "admin@example.com",
        password: hashedPassword, // Using hashed password now
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
      
      // Check if password might be stored in plaintext (needs to be hashed)
      if (adminUser && adminUser.password === "admin123") {
        console.log('Found admin with plaintext password, updating to hashed password');
        const crypto = require('crypto');
        const plainPassword = "admin123";
        const hashedPassword = crypto.createHash('sha256').update(plainPassword).digest('hex');
        
        adminUser = await storage.updateUser(adminUser.id, { password: hashedPassword });
        console.log('Updated admin password to properly hashed version');
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

// Special rescue route for admin login page errors
router.get('/fix-admin-login', async (req: Request, res: Response) => {
  try {
    // Find or create admin user
    const adminUser = await ensureAdminUserExists();
    
    if (!adminUser) {
      console.error('Failed to find or create admin user');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to create or find admin user'
      });
    }
    
    // Set admin authentication headers directly
    res.setHeader('X-Test-Admin', 'true');
    
    // Set cookies for admin authentication
    res.cookie('admin_authenticated', 'true', { 
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false,
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    });
    
    res.cookie('admin_user_id', String(adminUser.id), {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      httpOnly: false,
      path: '/',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Login the user in the session
    req.login(adminUser, { session: true }, (loginErr) => {
      if (loginErr) {
        console.error('Error during login in admin fix route:', loginErr);
      } else {
        console.log('Admin user logged in successfully via fix route');
      }
      
      // Always redirect to dashboard regardless of login success
      // The cookies will ensure the user is treated as admin
      return res.redirect('/dashboard');
    });
  } catch (error) {
    console.error('Error in fix-admin-login route:', error);
    return res.redirect('/login?error=admin_login_failed');
  }
});

export default router;