/**
 * Direct Admin User Check Routes
 * 
 * This module provides direct routes for checking and verifying admin user status,
 * bypassing Vite middleware for direct API testing.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Helper function to mask sensitive values
function maskSecret(secret: string | null): string {
  if (!secret) return '';
  if (secret.length <= 8) return '********';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// Direct route to check a user by email (using query parameters to avoid Vite middleware issues)
router.get('/admin/user', async (req: Request, res: Response) => {
  try {
    const email = req.query.email as string;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email parameter is required'
      });
    }
    
    console.log(`Direct admin check - looking up user with email: ${email}`);
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
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch user'
    });
  }
});

export default router;