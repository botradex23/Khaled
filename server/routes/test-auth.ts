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

export default router;