import { Router, Request, Response } from 'express';
import { ensureAuthenticated } from '../auth';
import { storage } from '../storage';
import { z } from 'zod';
import { createBinanceServiceWithCustomCredentials } from '../api/binance/binanceService';
import { User } from '@shared/schema';

const router = Router();

// Utility function to hide parts of sensitive strings
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

/**
 * Get the current user's API keys (masked for security)
 */
router.get('/api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    
    // Get the user's API keys
    const apiKeys = await storage.getUserApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Mask API keys for security
    const maskedApiKeys = {
      binanceApiKey: apiKeys.binanceApiKey ? maskSecret(apiKeys.binanceApiKey) : null,
      binanceSecretKey: apiKeys.binanceSecretKey ? maskSecret(apiKeys.binanceSecretKey) : null,
      defaultBroker: 'binance', // Always binance now
      useTestnet: apiKeys.useTestnet
    };
    
    res.status(200).json({
      message: "API keys retrieved successfully",
      apiKeys: maskedApiKeys
    });
  } catch (error: any) {
    console.error("API keys retrieval error:", error);
    res.status(500).json({ message: "Failed to retrieve API keys" });
  }
});

/**
 * Update a user's API keys
 */
router.put('/api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  console.log("API Keys Update - Request received");
  
  const apiKeysSchema = z.object({
    binanceApiKey: z.string().min(1, "API key is required"),
    binanceSecretKey: z.string().min(1, "Secret key is required"),
    useTestnet: z.boolean().default(true)
  });
  
  try {
    if (!req.user || !req.user.id) {
      console.log("API Keys Update - Unauthorized: user not found in session");
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    console.log(`API Keys Update - Processing request for user ID: ${userId}`);
    
    // Validate input
    console.log("API Keys Update - Validating input data", {
      hasApiKey: !!req.body.binanceApiKey,
      hasSecretKey: !!req.body.binanceSecretKey,
    });
    
    const data = apiKeysSchema.parse(req.body);
    
    // Test the API keys to make sure they're valid before saving
    try {
      console.log("Testing API keys against Binance API");
      const testService = createBinanceServiceWithCustomCredentials(
        data.binanceApiKey,
        data.binanceSecretKey,
        data.useTestnet
      );
      
      // Try a simple request to make sure the keys work
      await testService.getAccountInfo();
      console.log("API key validation successful");
    } catch (validationError: any) {
      console.error("API key validation failed:", validationError.message);
      return res.status(400).json({
        success: false,
        message: `Invalid API keys: ${validationError.message}`
      });
    }
    
    // Update the API keys
    console.log("API Keys Update - Updating API keys in storage");
    const updatedUser = await storage.updateUserApiKeys(userId, {
      binanceApiKey: data.binanceApiKey,
      binanceSecretKey: data.binanceSecretKey,
      defaultBroker: 'binance', // Always use Binance
      useTestnet: data.useTestnet
    });
    
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      message: "API keys updated successfully",
      success: true
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("API keys update error:", error);
    res.status(500).json({ message: "Failed to update API keys" });
  }
});

/**
 * Delete a user's API keys
 */
router.delete('/api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    
    // Clear the API keys
    const success = await storage.clearUserApiKeys(userId);
    
    if (!success) {
      return res.status(404).json({ message: "User not found" });
    }
    
    res.status(200).json({
      message: "API keys deleted successfully",
      success: true
    });
  } catch (error: any) {
    console.error("API keys deletion error:", error);
    res.status(500).json({ message: "Failed to delete API keys" });
  }
});

/**
 * Validate API keys before saving them
 * No authentication required for this endpoint to allow testing before login
 */
router.post('/validate-api-keys', async (req: Request, res: Response) => {
  const validationSchema = z.object({
    binanceApiKey: z.string().min(1, "API key is required"),
    binanceSecretKey: z.string().min(1, "Secret key is required"),
    useTestnet: z.boolean().default(true)
  });
  
  try {
    // API key validation can be performed without authentication
    // to allow users to test their keys before login
    
    // Validate input
    const data = validationSchema.parse(req.body);
    
    try {
      console.log("Testing Binance API connection...");
      const testService = createBinanceServiceWithCustomCredentials(
        data.binanceApiKey,
        data.binanceSecretKey,
        data.useTestnet
      );
      
      // Test a simple request first to make sure the connection works
      const connectionTest = await testService.ping();
      
      if (!connectionTest.success) {
        console.error("API connection test failed:", connectionTest.message);
        return res.status(400).json({
          success: false,
          message: "API connection test failed. Please check your credentials."
        });
      }
      
      // Try an authenticated request
      try {
        console.log("Testing Binance API authentication...");
        const accountInfo = await testService.getAccountInfo();
        
        if (!accountInfo) {
          throw new Error("Invalid response from Binance API");
        }
        
        console.log("API authentication successful");
        return res.json({
          success: true,
          message: "API keys validated successfully",
          demo: data.useTestnet !== false
        });
      } catch (authError: any) {
        console.error("API authentication failed:", authError.message);
        return res.status(400).json({
          success: false,
          message: `API authentication failed: ${authError.message}`
        });
      }
    } catch (error: any) {
      console.error("API key validation error:", error.message);
      return res.status(500).json({
        success: false,
        message: `API key validation failed: ${error.message}`
      });
    }
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Validation error", 
        errors: error.errors 
      });
    }
    
    console.error("API key validation error:", error);
    res.status(500).json({ message: "Failed to validate API keys" });
  }
});

/**
 * Get API keys status for authenticated user, including validation status
 */
router.get('/api-keys/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    
    // Get the user's API keys
    const apiKeys = await storage.getUserApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if the user has Binance API keys configured - ensure none are empty strings
    const hasApiKeys = !!(
      apiKeys.binanceApiKey && apiKeys.binanceApiKey.trim() !== '' &&
      apiKeys.binanceSecretKey && apiKeys.binanceSecretKey.trim() !== ''
    );
    
    // By default, if the API keys exist and are not empty, we'll consider them valid
    // until proven otherwise by the validation check
    let hasValidApiKeys = hasApiKeys;
    let validationStatus = null;
    
    if (hasApiKeys) {
      try {
        // Create a service with the user's Binance API keys
        const service = createBinanceServiceWithCustomCredentials(
          apiKeys.binanceApiKey || '',
          apiKeys.binanceSecretKey || '',
          apiKeys.useTestnet
        );
        
        // Try to make a simple authenticated request
        const accountInfo = await service.getAccountInfo();
        
        // If we get here, the API keys are valid
        validationStatus = {
          valid: true,
          message: "API keys are valid and working",
          lastChecked: new Date().toISOString()
        };
        
        // Set the API keys validity flag to true since the validation succeeded
        hasValidApiKeys = true;
      } catch (validationError: any) {
        // The API keys exist but validation failed
        validationStatus = {
          valid: false,
          message: `API keys validation failed: ${validationError.message}`,
          lastChecked: new Date().toISOString()
        };
        
        // Since validation failed, mark the API keys as invalid
        hasValidApiKeys = false;
        
        console.log(`API keys validation failed for user ${userId}: ${validationError.message}`);
      }
    } else {
      // No API keys configured or they are empty strings
      hasValidApiKeys = false;
    }
    
    // Log the final validation status
    console.log(`API keys status for user ${userId}: ${hasValidApiKeys ? 'Valid' : 'Not valid'}`);
    
    res.status(200).json({
      configured: hasApiKeys,
      hasValidApiKeys: hasValidApiKeys,
      broker: 'binance', // Always binance
      useTestnet: apiKeys.useTestnet,
      validation: validationStatus
    });
  } catch (error: any) {
    console.error("API keys status check error:", error);
    res.status(500).json({ message: "Failed to check API keys status" });
  }
});

export default router;