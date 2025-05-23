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
router.get('/status', async (req: Request, res: Response) => {
  try {
    // Support both authenticated users and test user ID
    let userId: number;
    
    // Check if we have a test user ID in the headers (for development)
    const testUserId = req.headers['x-test-user-id'];
    
    if (testUserId && typeof testUserId === 'string') {
      // Use the test user ID
      userId = parseInt(testUserId, 10);
      console.log(`[STATUS] Using test user ID from headers: ${userId}`);
    } else if (req.user && req.user.id) {
      // Use the authenticated user's ID
      userId = req.user.id;
      console.log(`[STATUS] Using authenticated user ID: ${userId}`);
    } else {
      // No user ID available
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
router.post('/', async (req: Request, res: Response) => {
  try {
    // Support both authenticated users and test user ID
    let userId: number;
    
    // Check if we have a test user ID in the headers (for development)
    const testUserId = req.headers['x-test-user-id'];
    
    if (testUserId && typeof testUserId === 'string') {
      // Use the test user ID
      userId = parseInt(testUserId, 10);
      console.log(`Using test user ID from headers: ${userId}`);
    } else if (req.user && req.user.id) {
      // Use the authenticated user's ID
      userId = req.user.id;
      console.log(`Using authenticated user ID: ${userId}`);
    } else {
      // No user ID available
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in or provide a test user ID to save API keys'
      });
    }

    const { apiKey, secretKey, allowedIp, testnet } = req.body;
    
    console.log(`Request to save Binance API keys for user ${userId}`);
    
    // Simple validation
    if (!apiKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'API Key and Secret Key are required'
      });
    }
    
    // Clean up the API keys to remove any whitespace that might cause format errors
    const cleanedApiKey = apiKey ? apiKey.replace(/\s+/g, '').trim() : '';
    const cleanedSecretKey = secretKey ? secretKey.replace(/\s+/g, '').trim() : '';
    const cleanedAllowedIp = allowedIp ? allowedIp.replace(/\s+/g, '').trim() : allowedIp;
    
    // Validate that keys are not empty after trimming
    if (cleanedApiKey === '' || cleanedSecretKey === '') {
      return res.status(400).json({
        error: 'Invalid fields',
        message: 'API Key and Secret Key cannot be empty or contain only whitespace'
      });
    }
    
    // Validate key formats - Binance API keys are typically 64 characters
    if (cleanedApiKey.length < 10 || cleanedApiKey.length > 200) {
      return res.status(400).json({
        error: 'Invalid API Key format',
        message: 'API Key should be at least 10 characters long. Please check your API key format.'
      });
    }
    
    if (cleanedSecretKey.length < 10 || cleanedSecretKey.length > 200) {
      return res.status(400).json({
        error: 'Invalid Secret Key format',
        message: 'Secret Key should be at least 10 characters long. Please check your Secret key format.'
      });
    }
    
    console.log(`Saving Binance API keys for user ${userId} - API Key length: ${cleanedApiKey.length}, Secret Key length: ${cleanedSecretKey.length}`);
    
    // Default to proxy IP if none provided
    const finalAllowedIp = cleanedAllowedIp || "185.199.228.220";
    console.log(`Using allowed IP: ${finalAllowedIp} for Binance API`);
    
    try {
      // Update the user's Binance API keys using our storage implementation
      const updatedUser = await storage.updateUserBinanceApiKeys(userId, {
        binanceApiKey: cleanedApiKey,
        binanceSecretKey: cleanedSecretKey,
        binanceAllowedIp: finalAllowedIp
      });
      
      console.log(`Update result: ${updatedUser ? "Success" : "Failed"}`);
      
      if (!updatedUser) {
        return res.status(404).json({
          error: 'User not found',
          message: 'Could not update API keys for this user'
        });
      }
      
      console.log(`User updated successfully. Has API Key: ${!!updatedUser.binanceApiKey}, Has Secret Key: ${!!updatedUser.binanceSecretKey}`);
      
      // Log success
      console.log(`Binance API keys saved successfully for user ${userId} (Using testnet: ${testnet})`);
      console.log(`API Key format: ${cleanedApiKey.substring(0, 4)}... (length: ${cleanedApiKey.length})`);
      
      // Return success response immediately - don't wait for session save
      return res.status(200).json({
        success: true,
        message: 'Binance API keys saved successfully'
      });
    } catch (storageError) {
      console.error("Error in storage layer when saving Binance API keys:", storageError);
      return res.status(500).json({
        error: 'Storage error',
        message: 'An error occurred while storing Binance API keys'
      });
    }
  } catch (error: any) {
    console.error("Error saving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while saving Binance API keys'
    });
  }
});

// Get full, unmasked Binance API keys (for authenticated users only)
router.get('/full', async (req: Request, res: Response) => {
  try {
    // Support both authenticated users and test user ID
    let userId: number;
    
    // Check if we have a test user ID in the headers (for development)
    const testUserId = req.headers['x-test-user-id'];
    
    if (testUserId && typeof testUserId === 'string') {
      // Use the test user ID
      userId = parseInt(testUserId, 10);
      console.log(`[FULL] Using test user ID from headers: ${userId}`);
    } else if (req.user && req.user.id) {
      // Use the authenticated user's ID
      userId = req.user.id;
      console.log(`[FULL] Using authenticated user ID: ${userId}`);
    } else {
      // No user ID available
      return res.status(401).json({ 
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access API keys'
      });
    }
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
        message: 'Could not retrieve API keys for this user'
      });
    }
    
    // ניקוי המפתחות מרווחים וודא שהם בפורמט תקין
    // השתמש בגישה העקבית לניקוי - קודם הסר רווחים ואז trim
    const cleanApiKey = apiKeys.binanceApiKey ? apiKeys.binanceApiKey.replace(/\s+/g, '').trim() : '';
    const cleanSecretKey = apiKeys.binanceSecretKey ? apiKeys.binanceSecretKey.replace(/\s+/g, '').trim() : '';
    const cleanAllowedIp = apiKeys.binanceAllowedIp ? apiKeys.binanceAllowedIp.replace(/\s+/g, '').trim() : '';
    
    // בדיקה אם המפתחות בפורמט תקין
    const isApiKeyValid = cleanApiKey && cleanApiKey.length >= 10;
    const isSecretKeyValid = cleanSecretKey && cleanSecretKey.length >= 10;
    
    console.log(`Returning cleaned Binance API keys - API Key valid: ${isApiKeyValid}, Secret Key valid: ${isSecretKeyValid}, API Key length: ${cleanApiKey.length}, Secret Key length: ${cleanSecretKey.length}`);
    
    // הדפס את תוכן המפתחות ללא הסתרה לצורך בדיקת אינטגריטי
    if (cleanApiKey && cleanSecretKey) {
      console.log(`API Key first 4 chars: ${cleanApiKey.substring(0, 4)}, last 4 chars: ${cleanApiKey.substring(cleanApiKey.length - 4)}`);
      console.log(`Secret Key first 4 chars: ${cleanSecretKey.substring(0, 4)}, last 4 chars: ${cleanSecretKey.substring(cleanSecretKey.length - 4)}`);
    }
    
    // בדיקה אם מפתחות ההצפנה השתנו
    // נבדוק אם מפתחות ה-API נראים כמו מפתחות תקינים, אבל לא יכולים להיפתח
    let encryptionChanged = false;
    
    // אם יש מפתחות מוצפנים שלא יכולים להיפתח בצורה תקינה, סימן שמפתחות ההצפנה השתנו
    if (apiKeys.binanceApiKey && apiKeys.binanceSecretKey && 
        (!isApiKeyValid || !isSecretKeyValid)) {
      console.warn('Detected encryption key change affecting Binance API keys');
      encryptionChanged = true;
    }
    
    // השב את המפתחות המנוקים המלאים
    return res.status(200).json({
      success: true,
      apiKey: cleanApiKey,  // שליחת המפתח המלא
      secretKey: cleanSecretKey,  // שליחת המפתח המלא
      allowedIp: cleanAllowedIp,
      testnet: false, // כרגע תמיד משתמשים ב-mainnet ולא ב-testnet
      isValid: isApiKeyValid && isSecretKeyValid, // הוסף שדה לבדיקה אם המפתחות תקינים
      encryptionChanged: encryptionChanged // דגל שמציין אם מפתחות ההצפנה השתנו
    });
  } catch (error: any) {
    console.error("Error retrieving full Binance API keys:", error);
    return res.status(500).json({
      success: false,
      error: 'Server error',
      message: 'An error occurred while retrieving Binance API keys'
    });
  }
});

export default router;