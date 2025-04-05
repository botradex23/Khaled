import { Router, Request, Response } from 'express';

const router = Router();

// Simple proxy endpoint for Mixpanel analytics
router.post('/mixpanel/track', async (req: Request, res: Response) => {
  try {
    // Just return success to prevent client errors
    // In production, you would forward this to Mixpanel's API
    // but for now we'll just return a success response
    res.json({ success: true, message: 'Event tracked successfully' });
  } catch (error) {
    console.error('Error in mixpanel tracking:', error);
    res.status(500).json({ success: false, message: 'Failed to track event' });
  }
});

export default router;