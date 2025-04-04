import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Endpoint to check admin status for a user by email
router.get('/admin-status', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    const user = await storage.getUserByEmail(email as string);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        isAdmin: !!user.isAdmin
      }
    });
  } catch (error) {
    console.error('Error checking admin status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error checking admin status' 
    });
  }
});

// Endpoint to set the admin flag for a user
router.post('/set-admin', async (req: Request, res: Response) => {
  try {
    const { email, isAdmin } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }
    
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const updatedUser = await storage.updateUser(user.id, { isAdmin: !!isAdmin });
    
    if (!updatedUser) {
      return res.status(500).json({
        success: false,
        message: "Failed to update user"
      });
    }
    
    return res.json({
      success: true,
      message: `User admin status updated to ${!!isAdmin}`,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        isAdmin: !!updatedUser.isAdmin
      }
    });
  } catch (error) {
    console.error('Error setting admin status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Error setting admin status' 
    });
  }
});

export default router;