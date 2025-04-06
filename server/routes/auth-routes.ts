import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';

const router = Router();

// Basic user authentication check
router.get('/user', async (req: Request, res: Response) => {
  try {
    // Check for test admin header
    const isTestAdmin = req.headers['x-test-admin'] === 'true';
    
    if (isTestAdmin) {
      // Return a mock admin user for testing
      res.json({
        isAuthenticated: true,
        user: {
          id: 1743796526435,
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          isAdmin: true,
          isSuperAdmin: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });
    } else {
      // Default response for non-authenticated users
      res.json({
        isAuthenticated: false,
        user: null
      });
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    console.log('Login attempt received for email:', req.body.email);
    
    // Add security logging
    console.log('Login request headers:', {
      host: req.headers.host,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers['user-agent']
    });
    
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Get user by email
    const user = await storage.getUserByEmail(email);
    
    // If user not found
    if (!user) {
      console.log(`User not found with email: ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // If user has no password (e.g., OAuth-only user)
    if (!user.password) {
      console.log(`User has no password (likely OAuth-only): ${email}`);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Compare password using SHA-256 hash
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    const isMatch = hash === user.password;
    
    console.log(`Password check details: 
      hashed input  : ${hash.substring(0, 10)}...
      stored password: ${user.password.substring(0, 10)}...
      match result: ${isMatch}
    `);
    
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    }
    
    // Successful login
    console.log('Login successful for user:', user.email);
    
    // Return success response with user data
    return res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        isAdmin: !!user.isAdmin,
        isSuperAdmin: !!user.isSuperAdmin,
        createdAt: user.createdAt || new Date().toISOString(),
        updatedAt: user.updatedAt || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    });
  }
});

// Admin login endpoint
router.post('/login-as-admin', async (req: Request, res: Response) => {
  try {
    // Create default admin user if it doesn't exist already
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Ameena123';
    
    // Check if admin exists
    let adminUser = await storage.getUserByEmail(adminEmail);
    
    if (!adminUser) {
      // Create the admin user
      const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
      
      adminUser = await storage.createUser({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      console.log('Created admin user:', adminUser);
    }
    
    // Return success with user data
    return res.json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName || 'Admin',
        lastName: adminUser.lastName || 'User',
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: adminUser.createdAt || new Date().toISOString(),
        updatedAt: adminUser.updatedAt || new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error during admin login' 
    });
  }
});

// Create default admin
router.post('/create-default-admin', async (req: Request, res: Response) => {
  try {
    // Check if admin already exists
    const adminEmail = 'admin@example.com';
    const adminPassword = 'Ameena123';
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      // Make sure the existing admin has admin privileges
      if (!existingAdmin.isAdmin || !existingAdmin.isSuperAdmin) {
        await storage.updateUser(existingAdmin.id, { 
          isAdmin: true,
          isSuperAdmin: true
        });
      }
      
      // Return existing admin info (but never include password)
      return res.json({
        success: true,
        message: 'Default admin already exists',
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          isAdmin: true,
          isSuperAdmin: true
        }
      });
    }
    
    // Create new admin user
    const hashedPassword = crypto.createHash('sha256').update(adminPassword).digest('hex');
    
    const newAdmin = await storage.createUser({
      email: adminEmail,
      password: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      isAdmin: true,
      isSuperAdmin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    return res.json({
      success: true,
      message: 'Default admin created successfully',
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        isAdmin: true,
        isSuperAdmin: true,
        password: adminPassword // Only include password during creation
      }
    });
  } catch (error) {
    console.error('Error creating default admin:', error);
    return res.status(500).json({
      success: false,
      message: 'Error creating default admin'
    });
  }
});

// Logout endpoint
router.get('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;