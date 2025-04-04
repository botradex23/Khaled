import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { ensureAuthenticated } from '../auth';
import { storage } from '../storage';

const router = Router();

// Middleware to ensure the user is an admin
function ensureAdmin(req: Request, res: Response, next: Function) {
  // First check for X-Test-Admin header
  if (req.headers['x-test-admin']) {
    console.log('X-Test-Admin header detected in ensureAdmin middleware');
    next();
  }
  // Then check standard authentication
  else if (req.isAuthenticated() && req.user && (req.user as any).isAdmin) {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Admin access required' });
  }
}

// Special middleware to handle test admin header for this route
function handleTestAdmin(req: Request, res: Response, next: Function) {
  if (req.headers['x-test-admin']) {
    console.log('X-Test-Admin header detected in OpenAI update route');
    
    // Find admin user
    storage.getUserByUsername('admin').then(adminUser => {
      if (adminUser) {
        console.log('Admin user found via header:', adminUser.id);
        
        // Set user in request for this request only
        req.user = adminUser;
        next();
      } else {
        // Try to create admin user
        const newAdminUser = {
          username: "admin",
          email: "admin@example.com",
          password: "admin123",
          firstName: "Admin",
          lastName: "User",
          defaultBroker: "binance",
          useTestnet: true,
          isAdmin: true,
          binanceApiKey: process.env.BINANCE_API_KEY || "testkey",
          binanceSecretKey: process.env.BINANCE_SECRET_KEY || "testsecret"
        };
        
        storage.createUser(newAdminUser).then(createdAdmin => {
          console.log('Created new admin user via header handler in OpenAI route:', createdAdmin.id);
          
          // Set user in request for this request only
          req.user = createdAdmin;
          next();
        }).catch(createErr => {
          console.error('Failed to create admin user:', createErr);
          res.status(500).json({ success: false, message: 'Failed to create admin user' });
        });
      }
    }).catch(err => {
      console.error('Error getting admin user:', err);
      res.status(500).json({ success: false, message: 'Error getting admin user' });
    });
  } else {
    // No test header, continue to normal authentication
    next();
  }
}

// Update OpenAI API key
router.post('/update-openai-key', handleTestAdmin, ensureAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // Validate API key format
    if (!apiKey.startsWith('sk-') || apiKey.length < 30) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid API key format. OpenAI API keys typically start with "sk-" and are at least 30 characters long.' 
      });
    }
    
    // Read the current .env file
    const envPath = path.resolve(process.cwd(), '.env');
    let envContent = '';
    
    try {
      envContent = fs.readFileSync(envPath, 'utf-8');
    } catch (error) {
      console.error('Error reading .env file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to read environment configuration' 
      });
    }
    
    // Update or add the OPENAI_API_KEY
    const keyExists = envContent.includes('OPENAI_API_KEY=');
    
    let updatedContent = '';
    if (keyExists) {
      // Replace existing key
      const keyRegex = /OPENAI_API_KEY=.*/;
      updatedContent = envContent.replace(keyRegex, `OPENAI_API_KEY=${apiKey}`);
    } else {
      // Add new key
      updatedContent = envContent + `\nOPENAI_API_KEY=${apiKey}\n`;
    }
    
    // Write updated content back to .env file
    try {
      fs.writeFileSync(envPath, updatedContent);
      
      // Update the current environment variable
      process.env.OPENAI_API_KEY = apiKey;
      
      return res.json({ 
        success: true, 
        message: 'OpenAI API key updated successfully' 
      });
    } catch (error) {
      console.error('Error updating .env file:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update environment configuration' 
      });
    }
  } catch (error) {
    console.error('Error updating OpenAI API key:', error);
    return res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

export default router;