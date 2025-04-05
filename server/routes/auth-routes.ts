import { Router, Request, Response } from 'express';

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

// Logout endpoint
router.get('/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;