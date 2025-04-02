// server/api/analytics/mixpanel-routes.ts

import { Router } from 'express';
import mixpanel from '../../services/mixpanel';

const router = Router();

// Endpoint to track events from the client
router.post('/track', async (req, res) => {
  try {
    const { event, properties } = req.body;
    
    if (!event) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: event is required' 
      });
    }
    
    // Extract distinctId from properties or use anonymous ID
    const distinctId = properties?.distinct_id || 'anonymous-user';
    
    // Track the event using server-side Mixpanel service
    const success = await mixpanel.track(distinctId, event, properties || {});
    
    if (success) {
      res.json({ success: true, message: 'Event tracked successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to track event' });
    }
  } catch (error) {
    console.error('Error in Mixpanel tracking endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while tracking the event' 
    });
  }
});

// Endpoint to identify users
router.post('/identify', async (req, res) => {
  try {
    const { distinctId, userId, userProperties } = req.body;
    
    if (!distinctId || !userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: distinctId and userId are required' 
      });
    }
    
    // Track identification event with user properties
    const success = await mixpanel.track(
      distinctId, 
      '$identify', 
      {
        $identified_id: userId,
        ...userProperties
      }
    );
    
    if (success) {
      res.json({ success: true, message: 'User identified successfully' });
    } else {
      res.status(500).json({ success: false, message: 'Failed to identify user' });
    }
  } catch (error) {
    console.error('Error in Mixpanel identify endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'An error occurred while identifying the user' 
    });
  }
});

export default router;