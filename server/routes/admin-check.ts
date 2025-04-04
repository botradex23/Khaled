/**
 * Admin User Check Routes
 * 
 * This module provides routes for checking and verifying admin user status.
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

// Route to check a user directly by email
router.get('/user/:email', async (req: Request, res: Response) => {
  try {
    const { email } = req.params;
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
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
    
    return res.json({ success: true, user: maskedUser });
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

export default router;