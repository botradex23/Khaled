/**
 * Direct API routes outside the /api namespace to avoid Vite middleware interception.
 */

import express from 'express';
import { storage } from './storage';

const router = express.Router();

// Helper function to mask sensitive values
function maskSecret(secret: string | null): string {
  if (!secret) return '';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// Create a default admin user for testing
router.post('/create-admin', async (req, res) => {
  try {
    // Generate a random password
    const password = Math.random().toString(36).slice(2) + Math.random().toString(36).toUpperCase().slice(2);
    
    // Create the admin user
    const adminEmail = 'admin@example.com';
    
    // Check if admin already exists
    const existingAdmin = await storage.getUserByEmail(adminEmail);
    
    if (existingAdmin) {
      console.log('Default admin already exists:', existingAdmin.id);
      return res.json({
        success: true,
        message: 'Admin user already exists',
        admin: {
          id: existingAdmin.id,
          email: existingAdmin.email,
          isAdmin: existingAdmin.isAdmin,
          password: maskSecret(password) // Don't show actual password for existing admin
        }
      });
    }
    
    // Hash the password using SHA-256
    const crypto = require('crypto');
    const hashedPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // Create the admin user in the database
    const admin = await storage.createUser({
      username: adminEmail,
      email: adminEmail,
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      isAdmin: true,
      defaultBroker: 'okx',
      useTestnet: true
    });
    
    console.log('Created default admin:', admin.id);
    
    res.json({
      success: true,
      message: 'Default admin created successfully',
      admin: {
        id: admin.id,
        email: admin.email,
        isAdmin: admin.isAdmin,
        password // Return the non-hashed password for testing purposes
      }
    });
  } catch (error: any) {
    console.error('Error creating admin user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
});

// Get admin user by email
router.get('/admin-check', async (req, res) => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required'
      });
    }
    
    console.log(`XDirectAPI admin check - looking up user with email: ${email}`);
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found'
      });
    }
    
    // Mask sensitive data
    const maskedUser = {
      ...user,
      password: user.password ? `${user.password.substring(0, 10)}...` : null,
      binanceApiKey: user.binanceApiKey ? `${maskSecret(user.binanceApiKey)}` : null,
      binanceSecretKey: user.binanceSecretKey ? `${maskSecret(user.binanceSecretKey)}` : null,
      okxApiKey: user.okxApiKey ? `${maskSecret(user.okxApiKey)}` : null,
      okxSecretKey: user.okxSecretKey ? `${maskSecret(user.okxSecretKey)}` : null,
      okxPassphrase: user.okxPassphrase ? `${maskSecret(user.okxPassphrase)}` : null,
    };
    
    return res.json({ 
      success: true, 
      user: maskedUser
    });
  } catch (error: any) {
    console.error('Error fetching user by email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user',
      error: error.message
    });
  }
});

// Test login for admin user
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }
    
    // Find user by email
    console.log(`XDirectAPI admin login - attempting login for: ${email}`);
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      console.log(`XDirectAPI admin login - user not found: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Hash the input password using SHA-256 (same as in registration)
    const crypto = require('crypto');
    const hashedInputPassword = crypto.createHash('sha256').update(password).digest('hex');
    
    // Check if password matches
    if (user.password !== hashedInputPassword) {
      console.log(`XDirectAPI admin login - password mismatch for: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }
    
    // Check if user is admin
    if (!user.isAdmin) {
      console.log(`XDirectAPI admin login - user is not admin: ${email}`);
      return res.status(403).json({
        success: false,
        message: 'User is not an admin'
      });
    }
    
    console.log(`XDirectAPI admin login - successful login for: ${email}`);
    res.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin
      }
    });
  } catch (error: any) {
    console.error('Error during admin login:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;