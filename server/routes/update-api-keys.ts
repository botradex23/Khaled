import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../auth';
import { binanceService } from '../api/binance/binanceServiceIntegration';

const router = Router();

// Route to update API keys for Binance
router.post('/update-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { apiKey, secretKey, useTestnet = true } = req.body;

    // Update the user's API keys
    await storage.updateUserApiKeys(userId, {
      binanceApiKey: apiKey,
      binanceSecretKey: secretKey,
      useTestnet,
      defaultBroker: 'binance' // Set Binance as the default broker
    });

    // Attempt to check API status to validate credentials
    try {
      const apiStatus = await binanceService.checkApiStatus();
      
      // If we get here, authentication was successful
      return res.status(200).json({
        success: true,
        message: 'Binance API keys updated and verified successfully',
        username: req.user?.username,
        hasApiKeys: true,
        useTestnet
      });
    } catch (apiError: any) {
      // Save the keys but also return the API error for debugging
      return res.status(202).json({
        success: true,
        message: 'API keys updated but verification failed. You may need to check the keys and permissions.',
        apiError: {
          message: apiError.message,
          code: apiError.code || 'unknown',
          details: apiError.response?.data?.msg || 'No additional details available'
        },
        username: req.user?.username,
        hasApiKeys: true,
        useTestnet
      });
    }
  } catch (error: any) {
    console.error('Error updating API keys:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update API keys',
      error: error.message
    });
  }
});

// Route to test existing API keys
router.get('/test-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Get the user's API keys
    const apiKeys = await storage.getUserApiKeys(userId);
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'No Binance API keys configured for this user' 
      });
    }

    // Attempt to check API status to validate credentials
    try {
      const apiStatus = await binanceService.checkApiStatus();
      
      // If we get here, authentication was successful
      return res.status(200).json({
        success: true,
        message: 'Binance API keys verified successfully',
        username: req.user?.username,
        hasApiKeys: true,
        useTestnet: apiKeys.useTestnet
      });
    } catch (apiError: any) {
      // Return API error details
      return res.status(400).json({
        success: false,
        message: 'API key verification failed',
        apiError: {
          message: apiError.message,
          code: apiError.code || 'unknown',
          details: apiError.response?.data?.msg || 'No additional details available'
        },
        username: req.user?.username,
      });
    }
  } catch (error: any) {
    console.error('Error testing API keys:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to test API keys',
      error: error.message
    });
  }
});

// Route to provide guidance on creating proper Binance API keys
router.get('/guidance', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    title: 'Creating Binance API Keys',
    steps: [
      'Log in to your Binance account at https://www.binance.com/',
      'Navigate to "API Management" in your account settings',
      'Create a new API key with "Read" and "Trading" permissions',
      'Configure IP restrictions for additional security',
      'Save your API Key and Secret Key securely',
      'Enter these credentials in our platform to connect to your Binance account'
    ],
    commonIssues: [
      'Insufficient permissions - Ensure your API key has both "Read" and "Trading" permissions',
      'IP restriction issues - If you set IP restrictions, make sure our platform IP is allowed',
      'Key expiration - Some API keys may expire, check if they need renewal',
      'Using testnet vs. mainnet - Our platform defaults to testnet for testing',
      'Account verification - Ensure your Binance account is properly verified for trading'
    ]
  });
});

export default router;