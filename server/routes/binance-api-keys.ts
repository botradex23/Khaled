import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { ensureAuthenticated } from '../auth';

const router = Router();

// Utility function to mask sensitive strings
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// Get Binance API keys status
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Get the user's Binance API keys
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Could not retrieve API keys for this user' 
      });
    }
    
    // Check if keys are configured
    const hasApiKeys = !!(
      apiKeys.binanceApiKey && apiKeys.binanceApiKey.trim() !== '' &&
      apiKeys.binanceSecretKey && apiKeys.binanceSecretKey.trim() !== ''
    );
    
    res.status(200).json({
      configured: hasApiKeys,
      hasBinanceApiKey: !!apiKeys.binanceApiKey,
      hasBinanceSecretKey: !!apiKeys.binanceSecretKey,
    });
  } catch (error: any) {
    console.error('Error checking Binance API keys status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check API keys status'
    });
  }
});

// Get Binance API Keys (masked)
router.get('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not retrieve API keys for this user'
      });
    }
    
    // Only send back masked versions for security
    const maskedKeys = {
      binanceApiKey: apiKeys.binanceApiKey ? maskSecret(apiKeys.binanceApiKey) : null,
      binanceSecretKey: apiKeys.binanceSecretKey ? maskSecret(apiKeys.binanceSecretKey) : null,
      binanceAllowedIp: apiKeys.binanceAllowedIp
    };
    
    return res.status(200).json({
      success: true,
      apiKeys: maskedKeys,
      hasBinanceApiKey: !!apiKeys.binanceApiKey,
      hasBinanceSecretKey: !!apiKeys.binanceSecretKey
    });
  } catch (error: any) {
    console.error("Error retrieving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving Binance API keys'
    });
  }
});

// Save/Update Binance API keys
router.post('/', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { apiKey, secretKey, allowedIp, testnet } = req.body;
    
    // Simple validation
    if (!apiKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'API Key and Secret Key are required'
      });
    }
    
    // Update the user's Binance API keys using our storage implementation
    const userId = req.user!.id;
    const updatedUser = await storage.updateUserBinanceApiKeys(userId, {
      binanceApiKey: apiKey,
      binanceSecretKey: secretKey,
      binanceAllowedIp: allowedIp
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not update API keys for this user'
      });
    }
    
    console.log(`Binance API keys saved successfully for user ${userId} (Using testnet: ${testnet})`);
    
    return res.status(200).json({
      success: true,
      message: 'Binance API keys saved successfully'
    });
  } catch (error: any) {
    console.error("Error saving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while saving Binance API keys'
    });
  }
});

export default router;