import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../auth';
import { createOkxServiceWithCustomCredentials } from '../api/okx/okxService';

const router = Router();

// Route to update API keys with a special warning about OKX passphrase format
router.post('/update-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const { apiKey, secretKey, passphrase, useTestnet = true } = req.body;

    // Check if the passphrase ends with a dot - which causes issues with OKX API
    const endsWithDot = passphrase && passphrase.endsWith('.');
    if (endsWithDot) {
      return res.status(400).json({ 
        success: false, 
        message: 'Passphrase ends with a dot/period which is known to cause authentication issues with OKX API. Please use a passphrase without a trailing dot.'
      });
    }

    // Update the user's API keys
    await storage.updateUserApiKeys(userId, {
      okxApiKey: apiKey,
      okxSecretKey: secretKey,
      okxPassphrase: passphrase,
      useTestnet,
      defaultBroker: 'okx' // Set OKX as the default broker
    });

    // Validate the new keys immediately
    const testService = createOkxServiceWithCustomCredentials(
      apiKey,
      secretKey,
      passphrase,
      useTestnet // Use testnet if requested
    );

    // Attempt a simple authenticated request to validate credentials
    try {
      await testService.getAccountInfo();
      
      // If we get here, authentication was successful
      return res.status(200).json({
        success: true,
        message: 'API keys updated and verified successfully',
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
    if (!apiKeys || !apiKeys.okxApiKey || !apiKeys.okxSecretKey || !apiKeys.okxPassphrase) {
      return res.status(400).json({ 
        success: false, 
        message: 'No API keys configured for this user' 
      });
    }

    // Create a service instance with the user's API keys
    const testService = createOkxServiceWithCustomCredentials(
      apiKeys.okxApiKey,
      apiKeys.okxSecretKey,
      apiKeys.okxPassphrase,
      apiKeys.useTestnet === true // Ensure it's a boolean
    );

    // Attempt a simple authenticated request to validate credentials
    try {
      const accountInfo = await testService.getAccountInfo();
      
      // If we get here, authentication was successful
      return res.status(200).json({
        success: true,
        message: 'API keys verified successfully',
        accountInfo,
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
        passphraseInfo: {
          endsWithDot: apiKeys.okxPassphrase.endsWith('.'),
          hasSpecialChars: apiKeys.okxPassphrase !== encodeURIComponent(apiKeys.okxPassphrase),
          length: apiKeys.okxPassphrase.length
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

// Route to provide guidance on creating proper OKX API keys
router.get('/guidance', (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    title: 'Creating OKX API Keys',
    steps: [
      'Log in to your OKX account at https://www.okx.com/',
      'Navigate to "API Management" in your account settings',
      'Create a new API key with "Read" and "Trade" permissions',
      'Use a simple passphrase WITHOUT special characters or trailing dots',
      'Save your API Key, Secret Key, and Passphrase securely',
      'Enter these credentials in our platform to connect to your OKX account'
    ],
    commonIssues: [
      'Passphrase ending with a dot/period (.) - This causes encoding issues',
      'Special characters in passphrase - These can cause authentication problems',
      'Insufficient permissions - Ensure your API key has "Read" and "Trade" permissions',
      'Using keys from OKX Wallet instead of the main OKX exchange',
      'Testnet and mainnet confusion - Our platform uses the testnet for testing'
    ]
  });
});

export default router;