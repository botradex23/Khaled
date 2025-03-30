import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema } from "@shared/schema";
import { z } from "zod";
import axios from "axios";
import okxRouter from "./api/okx";
import bitgetRouter from "./api/bitget";
import aiRouter from "./api/ai";
import testAuthRouter from "./routes/test-auth";
import userApiKeysRouter from './routes/user-api-keys';
import adminApiRouter from './routes/admin-api';
import marketsRouter from './routes/markets';
import marketsV2Router from './routes/markets.test';
import marketsV3Router from './routes/markets-v3';
import { setupAuth, ensureAuthenticated } from "./auth";
import { createOkxServiceWithCustomCredentials, okxService } from "./api/okx/okxService";
import updateApiKeysRouter from "./routes/update-api-keys";
import binanceRouter from "./routes/binance";
import binanceApiKeysRouter from "./routes/binance-api-keys";
import paperTradingRouter from "./routes/paper-trading";
import databaseStatusRoutes from "./routes/database-status";
import { binanceWebSocketService } from "./api/binance/websocketService";

// Helper function to mask sensitive data (like API keys)
function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) {
    return "****" + secret.substring(secret.length - 2);
  }
  return secret.substring(0, 4) + "****" + secret.substring(secret.length - 4);
}

// Test endpoint to create users with API keys (for testing only)
const createTestUserWithKeys = async (req: Request, res: Response) => {
  try {
    const { username, email, okxApiKey, okxSecretKey, okxPassphrase } = req.body;
    
    // Validate input
    if (!username || !email) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Username and email are required'
      });
    }
    
    // Create user
    const user = await storage.createUser({
      username,
      email,
      firstName: username,
      lastName: 'Test',
      defaultBroker: "okx",
      useTestnet: true,
      okxApiKey: okxApiKey || null,
      okxSecretKey: okxSecretKey || null,
      okxPassphrase: okxPassphrase || null
    });
    
    // If API keys provided, explicitly update them
    if (okxApiKey && okxSecretKey && okxPassphrase) {
      await storage.updateUserApiKeys(user.id, {
        okxApiKey,
        okxSecretKey,
        okxPassphrase
      });
    }
    
    // Return user without sensitive data
    const safeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      hasApiKeys: !!(okxApiKey && okxSecretKey && okxPassphrase)
    };
    
    res.json({ success: true, user: safeUser });
  } catch (err: any) {
    console.error('Error creating test user:', err);
    res.status(500).json({ error: 'Server error', message: err.message });
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Register database status routes
  import('./routes/database-status').then(databaseStatusRouter => {
    app.use('/api/database', databaseStatusRouter.default);
    console.log('Database status routes registered');
  }).catch(err => {
    console.error('Failed to register database status routes:', err);
  });
  
  // Register Binance market prices routes
  import('./routes/binance-market-prices').then(binanceMarketsRouter => {
    app.use('/api/binance', binanceMarketsRouter.default);
    console.log('Binance market prices routes registered to /api/binance');
  }).catch(err => {
    console.error('Failed to register Binance market prices routes:', err);
  });
  
  // Register market prices routes (in Binance format)
  import('./routes/market-prices').then(marketPricesRouter => {
    app.use('/api/market', marketPricesRouter.default);
    console.log('Market prices routes registered to /api/market');
  }).catch(err => {
    console.error('Failed to register market prices routes:', err);
  });
  // Add a test endpoint to check API keys for a user
  app.get('/api/test/user-api-keys', async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const userId = req.user.id;
      console.log(`Test endpoint: Looking up API keys for user ID ${userId}`);
      
      // Get user-specific API keys
      const apiKeys = await storage.getUserApiKeys(userId);
      
      // Return masked versions of the keys for security
      const maskedKeys = {
        okxApiKey: apiKeys?.okxApiKey ? maskSecret(apiKeys.okxApiKey) : null,
        okxSecretKey: apiKeys?.okxSecretKey ? maskSecret(apiKeys.okxSecretKey) : null,
        okxPassphrase: apiKeys?.okxPassphrase ? maskSecret(apiKeys.okxPassphrase) : null,
        defaultBroker: apiKeys?.defaultBroker || null,
        useTestnet: apiKeys?.useTestnet || null
      };
      
      return res.json({
        userId,
        userEmail: req.user.email,
        apiKeys: maskedKeys
      });
    } catch (error: any) {
      console.error('Error in test endpoint:', error);
      return res.status(500).json({ error: 'Server error', message: error.message });
    }
  });
  
  // Test endpoint to reset all API keys
  app.post('/api/admin/reset-all-api-keys', async (req: Request, res: Response) => {
    try {
      console.log('Attempting to reset all user API keys');
      
      // Get all users (since we're using MemStorage, this is an internal method)
      const memStorage = storage as any;
      const users = Array.from(memStorage.users.values());
      
      console.log(`Found ${users.length} users to reset`);
      
      // Track successes and failures
      const results = {
        total: users.length,
        successful: 0,
        failed: 0,
        details: [] as Array<{userId: number, email: string, success: boolean, error?: string}>
      };
      
      // Process each user
      for (const user of users) {
        try {
          const success = await storage.clearUserApiKeys((user as any).id);
          results.details.push({
            userId: (user as any).id,
            email: (user as any).email || 'unknown',
            success
          });
          
          if (success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error: any) {
          results.failed++;
          results.details.push({
            userId: (user as any).id,
            email: (user as any).email || 'unknown',
            success: false,
            error: error.message
          });
        }
      }
      
      return res.json({
        message: `Reset API keys for ${results.successful} out of ${results.total} users`,
        results
      });
    } catch (error: any) {
      console.error('Error resetting API keys:', error);
      return res.status(500).json({ error: 'Server error', message: error.message });
    }
  });
  // Add test endpoint for creating users with API keys
  app.post('/api/users/test/create-with-keys', createTestUserWithKeys);
  
  // Add test endpoint for making API calls with a specific user's API keys (for testing only)
  // This doesn't actually log the user in, but provides the API keys to directly
  // test with that user's credentials
  app.post('/api/test/login', async (req, res) => {
    try {
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ 
          message: "Missing userId parameter"
        });
      }
      
      // Find the user by ID
      const user = await storage.getUser(parseInt(userId));
      
      if (!user) {
        return res.status(404).json({ 
          message: "User not found" 
        });
      }
      
      // Get user's API keys
      const apiKeys = await storage.getUserApiKeys(user.id);
      
      // Return success with user data but mask API keys
      res.status(200).json({
        message: "Test user retrieved successfully",
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || user.username,
          lastName: user.lastName || 'Test',
          hasApiKeys: !!(apiKeys?.okxApiKey && apiKeys?.okxSecretKey && apiKeys?.okxPassphrase)
        }
      });
    } catch (error) {
      console.error("Test login error:", error);
      res.status(500).json({ message: "Failed to login for test" });
    }
  });
  // Set up authentication system
  setupAuth(app);
  
  // Test auth routes
  app.use("/api/auth", testAuthRouter);
  
  // User API Keys routes
  app.use("/api/users", userApiKeysRouter);
  
  // API Key update and testing routes
  app.use("/api/keys", updateApiKeysRouter);
  
  // Binance API keys endpoints are moved to binance router
  // Keeping a note here to prevent accidental reimplementation
  
  // Admin API routes
  app.use("/api/admin", adminApiRouter);
  
  // Market data and prices routes
  app.use("/api/markets", marketsRouter);
  app.use("/api/markets", marketsV2Router);
  
  // Use the markets v3 router with better price endpoints
  app.use("/api/markets", marketsV3Router);
  
  // Register Binance markets routes 
  import('./routes/markets-binance').then(binanceMarketsRouter => {
    app.use("/api/markets/binance", binanceMarketsRouter.default);
    console.log('Binance markets routes registered to /api/markets/binance');
  }).catch(err => {
    console.error('Failed to register Binance markets routes:', err);
  });
  
  // OKX API routes
  app.use("/api/okx", okxRouter);
  
  // Bitget API routes
  app.use("/api/bitget", bitgetRouter);
  
  // Binance API routes
  app.use("/api/binance", binanceRouter);
  
  // Binance API keys specific routes
  app.use("/api/binance/api-keys", binanceApiKeysRouter);
  
  // Compatibility endpoints for old Binance API keys path
  app.use("/api/users/binance-api-keys", binanceApiKeysRouter);
  
  // AI API routes
  app.use("/api/ai", aiRouter);
  
  // Paper Trading routes
  app.use("/api/paper-trading", paperTradingRouter);
  
  // Database status routes are already registered above via dynamic import
  
  // Direct API Key validation endpoint - No authentication required for validating API keys
  app.post("/api/validate-api-keys", async (req, res) => {
    console.log("Received API validation request at /api/validate-api-keys");
    
    try {
      // API key validation can be performed without authentication
      // to allow users to test their API keys before login
      
      const validationSchema = z.object({
        okxApiKey: z.string().min(1, "API key is required"),
        okxSecretKey: z.string().min(1, "Secret key is required"),
        okxPassphrase: z.string().min(1, "Passphrase is required"),
        useTestnet: z.boolean().default(true)
      });
      
      // Validate input
      const data = validationSchema.parse(req.body);
      
      try {
        console.log("Testing OKX API connection...");
        const testService = createOkxServiceWithCustomCredentials(
          data.okxApiKey,
          data.okxSecretKey, 
          data.okxPassphrase,
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
          console.log("Testing OKX API authentication...");
          const accountInfo = await testService.getAccountInfo();
          
          if (!accountInfo || !(accountInfo as any).data) {
            throw new Error("Invalid response from OKX API");
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
  
  // API routes
  
  // Get all bots (admin route that should be protected in production)
  app.get("/api/bots", async (req, res) => {
    const bots = await storage.getAllBots();
    res.json(bots);
  });
  
  // Get all bots for the current user
  app.get("/api/user/bots", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const bots = await storage.getUserBots(userId);
    res.json(bots);
  });

  // Get a specific bot by ID - protected to ensure only bot owners can access them
  app.get("/api/bots/:id", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }
    
    const bot = await storage.getBotById(id);
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }
    
    // Check if this bot belongs to the requesting user
    if (bot.userId !== userId) {
      return res.status(403).json({ message: "Access denied: You do not own this bot" });
    }
    
    res.json(bot);
  });
  
  // Update a bot's parameters - protected to ensure only bot owners can modify them
  app.put("/api/bots/:id/parameters", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }
    
    const { upperPrice, lowerPrice, gridCount } = req.body;
    
    // Get the current bot
    const bot = await storage.getBotById(id);
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }
    
    // Check if this bot belongs to the requesting user
    if (bot.userId !== userId) {
      return res.status(403).json({ message: "Access denied: You do not own this bot" });
    }
    
    // Parse the current parameters
    let currentParameters = {};
    try {
      currentParameters = JSON.parse(bot.parameters || '{}');
    } catch (e) {
      console.error("Error parsing bot parameters:", e);
      return res.status(500).json({ message: "Error parsing bot parameters" });
    }
    
    // Update the parameters
    const updatedParameters = {
      ...currentParameters,
      upperPrice: upperPrice || (currentParameters as any).upperPrice,
      lowerPrice: lowerPrice || (currentParameters as any).lowerPrice,
      gridCount: gridCount || (currentParameters as any).gridCount
    };
    
    // Save the updated parameters
    const updatedBot = await storage.updateBot(id, {
      parameters: JSON.stringify(updatedParameters)
    });
    
    // If the bot is running, restart it to apply new parameters
    if (bot.isRunning) {
      await storage.stopBot(id);
      await storage.startBot(id);
    }
    
    res.json(updatedBot);
  });

  // Start bot - protected to ensure only bot owners can start them
  app.post("/api/bots/:id/start", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }
    
    // Get the current bot to check ownership
    const bot = await storage.getBotById(id);
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }
    
    // Check if this bot belongs to the requesting user
    if (bot.userId !== userId) {
      return res.status(403).json({ message: "Access denied: You do not own this bot" });
    }
    
    const updatedBot = await storage.startBot(id);
    res.json(updatedBot);
  });
  
  // Stop bot - protected to ensure only bot owners can stop them
  app.post("/api/bots/:id/stop", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid bot ID" });
    }
    
    // Get the current bot to check ownership
    const bot = await storage.getBotById(id);
    if (!bot) {
      return res.status(404).json({ message: "Bot not found" });
    }
    
    // Check if this bot belongs to the requesting user
    if (bot.userId !== userId) {
      return res.status(403).json({ message: "Access denied: You do not own this bot" });
    }
    
    const updatedBot = await storage.stopBot(id);
    res.json(updatedBot);
  });
  
  // Create a new bot for the current user
  app.post("/api/user/bots", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const userId = req.user.id;
    
    try {
      // Validate the input data
      const botDataSchema = z.object({
        name: z.string().min(1, "Bot name is required"),
        description: z.string().optional(),
        type: z.string().min(1, "Bot type is required"),
        status: z.string().default("inactive"),
        parameters: z.string().optional(),
        isRunning: z.boolean().default(false),
        userId: z.number()
      });
      
      const botData = botDataSchema.parse({
        ...req.body,
        userId // Ensure the bot is assigned to the current user
      });
      
      const newBot = await storage.createBot(botData);
      res.status(201).json(newBot);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Bot creation error:", error);
      res.status(500).json({ message: "Failed to create bot" });
    }
  });
  
  // Get all pricing plans
  app.get("/api/pricing", async (req, res) => {
    const plans = await storage.getAllPricingPlans();
    res.json(plans);
  });

  // Register user
  app.post("/api/register", async (req, res) => {
    // Create schema with additional validations
    const registerSchema = z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
      email: z.string().email("Invalid email address"),
      password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
    });

    try {
      // Validate input with our schema
      const data = registerSchema.parse(req.body);
      
      // Check if user with this email already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(409).json({ 
          message: "User with this email already exists"
        });
      }
      
      // Create the user
      const user = await storage.createUser({
        username: data.email, // Use email as username
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password, // In a real app, this would be hashed
        defaultBroker: "okx",
        useTestnet: true
      });
      
      // Send success response
      res.status(201).json({ 
        message: "Registration successful",
        user: {
          id: user.id, 
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Registration error:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });
  
  // Login user
  app.post("/api/login", async (req, res) => {
    const loginSchema = z.object({
      email: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password is required")
    });

    try {
      // Validate input
      const data = loginSchema.parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(data.email);
      
      // Check if user exists and password matches
      if (!user || user.password !== data.password) {
        return res.status(401).json({ 
          message: "Invalid email or password" 
        });
      }
      
      // Set up session for user login
      req.login(user, (err) => {
        if (err) {
          console.error('Error during login:', err);
          return res.status(500).json({ 
            message: "Error during login process" 
          });
        }
        
        // Return success with user data after session setup
        res.status(200).json({
          message: "Login successful",
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName
          }
        });
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Login error:", error);
      res.status(500).json({ message: "Failed to login" });
    }
  });
  
  // Update user profile
  app.patch("/api/users/profile", ensureAuthenticated, async (req, res) => {
    const profileSchema = z.object({
      firstName: z.string().min(2, "First name must be at least 2 characters"),
      lastName: z.string().min(2, "Last name must be at least 2 characters"),
    });

    try {
      // Get authenticated user ID from session
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      
      // Validate input
      const data = profileSchema.parse(req.body);
      
      // Update user profile
      const updatedUser = await storage.updateUser(userId, {
        firstName: data.firstName,
        lastName: data.lastName
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return success with updated user data
      res.status(200).json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      
      console.error("Profile update error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });
  
  // API Keys Management
  
  // Binance API Keys are now handled in binance router - keeping comment to avoid reimplementation
  
  // This endpoint is implemented above
  /*app.post("/api/admin/reset-all-api-keys", async (req, res) => {
    // Implementation moved above
  })*/
  
  // Get user API keys (masked)
  app.get("/api/users/api-keys", ensureAuthenticated, async (req, res) => {
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
        okxApiKey: apiKeys.okxApiKey ? maskSecret(apiKeys.okxApiKey) : null,
        okxSecretKey: apiKeys.okxSecretKey ? maskSecret(apiKeys.okxSecretKey) : null,
        okxPassphrase: apiKeys.okxPassphrase ? maskSecret(apiKeys.okxPassphrase) : null,
        defaultBroker: apiKeys.defaultBroker,
        useTestnet: apiKeys.useTestnet
      };
      
      res.status(200).json({
        message: "API keys retrieved successfully",
        apiKeys: maskedApiKeys
      });
    } catch (error) {
      console.error("API keys retrieval error:", error);
      res.status(500).json({ message: "Failed to retrieve API keys" });
    }
  });
  
  // Update user API keys
  app.put("/api/users/api-keys", ensureAuthenticated, async (req, res) => {
    console.log("API Keys Update - Request received");
    
    const apiKeysSchema = z.object({
      okxApiKey: z.string().min(1, "API key is required"),
      okxSecretKey: z.string().min(1, "Secret key is required"),
      okxPassphrase: z.string().min(1, "Passphrase is required"),
      defaultBroker: z.string().default("okx"),
      useTestnet: z.boolean().default(true)
    });
    
    try {
      if (!req.user || !req.user.id) {
        console.log("API Keys Update - Unauthorized: user not found in session");
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userId = req.user.id;
      console.log(`API Keys Update - Processing request for user ID: ${userId}`);
      
      // No special handling for any email account - every user must provide their own keys
      
      // Validate input
      console.log("API Keys Update - Validating input data", {
        hasApiKey: !!req.body.okxApiKey,
        hasSecretKey: !!req.body.okxSecretKey,
        hasPassphrase: !!req.body.okxPassphrase,
      });
      
      const data = apiKeysSchema.parse(req.body);
      
      // Update the API keys
      console.log("API Keys Update - Updating API keys in storage");
      const updatedUser = await storage.updateUserApiKeys(userId, {
        okxApiKey: data.okxApiKey,
        okxSecretKey: data.okxSecretKey,
        okxPassphrase: data.okxPassphrase,
        defaultBroker: data.defaultBroker,
        useTestnet: data.useTestnet
      });
      
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.status(200).json({
        message: "API keys updated successfully",
        success: true
      });
    } catch (error) {
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
  
  // Delete user API keys
  app.delete("/api/users/api-keys", ensureAuthenticated, async (req, res) => {
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
    } catch (error) {
      console.error("API keys deletion error:", error);
      res.status(500).json({ message: "Failed to delete API keys" });
    }
  });
  
  // API keys status is now handled by userApiKeysRouter in '/api/users/api-keys/status'

  // Add a test endpoint to check admin API keys
  app.get('/api/test-admin-keys', async (req: Request, res: Response) => {
    try {
      // Try to get the admin user
      const adminUser = await storage.getUserByUsername('admin');
      
      if (!adminUser) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'Admin user not found'
        });
      }
      
      // Log API key status
      console.log('Checking admin user API key status');
      
      // Check if we have API keys in environment
      const envApiKey = process.env.OKX_API_KEY;
      const envSecretKey = process.env.OKX_SECRET_KEY;
      const envPassphrase = process.env.OKX_PASSPHRASE;
      const binanceApiKey = process.env.BINANCE_API_KEY;
      const binanceSecretKey = process.env.BINANCE_SECRET_KEY;
      
      console.log('Environment API keys:', {
        // OKX keys
        hasOkxApiKey: !!envApiKey,
        hasOkxSecretKey: !!envSecretKey,
        hasOkxPassphrase: !!envPassphrase,
        okxApiKeyLength: envApiKey ? envApiKey.length : 'N/A',
        okxSecretKeyLength: envSecretKey ? envSecretKey.length : 'N/A',
        okxPassphraseLength: envPassphrase ? envPassphrase.length : 'N/A',
        
        // Binance keys
        hasBinanceApiKey: !!binanceApiKey,
        hasBinanceSecretKey: !!binanceSecretKey,
        binanceApiKeyLength: binanceApiKey ? binanceApiKey.length : 'N/A',
        binanceSecretKeyLength: binanceSecretKey ? binanceSecretKey.length : 'N/A'
      });
      
      // Check if admin has API keys
      console.log('Admin user API keys:', {
        hasApiKey: !!adminUser.okxApiKey,
        hasSecretKey: !!adminUser.okxSecretKey,
        hasPassphrase: !!adminUser.okxPassphrase,
        apiKeyLength: adminUser.okxApiKey ? adminUser.okxApiKey.length : 'N/A',
        secretKeyLength: adminUser.okxSecretKey ? adminUser.okxSecretKey.length : 'N/A',
        passphraseLength: adminUser.okxPassphrase ? adminUser.okxPassphrase.length : 'N/A'
      });
      
      // DEBUG: Log passphrase details for troubleshooting, but keep it secure
      if (adminUser.okxPassphrase) {
        const passFirst = adminUser.okxPassphrase.substring(0, 1);
        const passLast = adminUser.okxPassphrase.substring(adminUser.okxPassphrase.length - 1);
        console.log(`Admin passphrase format: ${passFirst}...${passLast} (length: ${adminUser.okxPassphrase.length})`);
        
        // Check if passphrase contains any special characters
        const hasSpecialChars = adminUser.okxPassphrase !== encodeURIComponent(adminUser.okxPassphrase);
        console.log(`Passphrase contains special characters: ${hasSpecialChars}`);
        
        // Check if passphrase ends with a dot/period - there's a known issue with this
        const endsWithDot = adminUser.okxPassphrase.endsWith('.');
        console.log(`Passphrase ends with dot: ${endsWithDot}`);
        
        // Show the base64 encoded version that will be used
        const base64Passphrase = Buffer.from(adminUser.okxPassphrase).toString('base64');
        console.log(`Base64 encoded passphrase (first/last 2 chars): ${base64Passphrase.substring(0, 2)}...${base64Passphrase.substring(base64Passphrase.length - 2)}`);
      }
      
      // Try to ping OKX API with admin keys
      const okxService = createOkxServiceWithCustomCredentials(
        adminUser.okxApiKey || '',
        adminUser.okxSecretKey || '',
        adminUser.okxPassphrase || '',
        true, // Always use testnet
        adminUser.id
      );
      
      // Try to get account info
      try {
        const accountInfo = await okxService.getAccountInfo();
        console.log('OKX API account info test successful');
        return res.json({
          success: true,
          message: 'OKX API connection successful with admin keys',
          adminUser: {
            id: adminUser.id,
            username: adminUser.username,
            hasApiKeys: !!adminUser.okxApiKey && !!adminUser.okxSecretKey && !!adminUser.okxPassphrase
          },
          accountInfo
        });
      } catch (apiError: any) {
        console.error('OKX API account info test failed:', apiError.message);
        return res.status(400).json({
          success: false,
          message: 'OKX API connection failed with admin keys',
          error: apiError.message,
          errorCode: apiError.code || 'unknown',
          passphrase: {
            hasPassphrase: !!adminUser.okxPassphrase,
            endsWithDot: adminUser.okxPassphrase?.endsWith('.') || false,
            hasSpecialChars: adminUser.okxPassphrase !== encodeURIComponent(adminUser.okxPassphrase || '')
          },
          encodedPassphrase: {
            method: 'buffer.toString("base64")',
            firstChars: adminUser.okxPassphrase ? 
              Buffer.from(adminUser.okxPassphrase).toString('base64').substring(0, 4) : 'none'
          },
          adminUser: {
            id: adminUser.id,
            username: adminUser.username,
            hasApiKeys: !!adminUser.okxApiKey && !!adminUser.okxSecretKey && !!adminUser.okxPassphrase
          }
        });
      }
    } catch (error: any) {
      console.error('Admin key test error:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message
      });
    }
  });

  // Create HTTP server
  // Add direct cryptocurrency prices endpoint
  app.get('/api/market/prices', async (req, res) => {
    // Make sure this is treated as a JSON API endpoint
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Optional filter by symbols if provided in the query params
      const symbolsParam = req.query.symbols;
      const requestedSymbols = symbolsParam 
        ? (typeof symbolsParam === 'string' ? symbolsParam.split(',') : [])
        : [];
      
      // Get data using the okxService.getMarketTickers method 
      const marketData = await okxService.getMarketTickers();
      
      if (!marketData || !marketData.length) {
        // Don't return any approximate data if the API fails
        return res.status(503).json({
          success: false,
          timestamp: new Date().toISOString(),
          message: 'Unable to fetch real-time market data',
          error: 'Market data service unavailable'
        });
      }
      
      // Process all pairs and extract price data
      const pricesMap: Record<string, number> = {};
      
      marketData.forEach((ticker: any) => {
        // Handle both USDT pairs (most common) and USD pairs
        if (ticker.instId && (ticker.instId.includes('-USDT') || ticker.instId.includes('-USD'))) {
          const parts = ticker.instId.split('-');
          const currency = parts[0];
          
          if (currency && ticker.last) {
            const price = parseFloat(ticker.last);
            pricesMap[currency] = price;
          }
        }
      });
      
      // Always ensure USDT and USDC are 1.0 (these are stablecoins pegged to USD)
      pricesMap['USDT'] = 1.0;
      pricesMap['USDC'] = 1.0;
      
      // Filter by requested symbols if provided
      let filteredPrices = Object.entries(pricesMap);
      if (requestedSymbols.length > 0) {
        const upperCaseSymbols = requestedSymbols.map(s => s.toUpperCase());
        filteredPrices = filteredPrices.filter(([currency]) => 
          upperCaseSymbols.includes(currency.toUpperCase())
        );
      }
      
      // Convert to array format matching the Market type expected by the frontend
      const prices = filteredPrices.map(([currency, price]) => ({
        symbol: currency,
        price,
        found: true,
        source: 'OKX',
        timestamp: Date.now()
      }));
      
      // Return the prices data in the format expected by MarketPricesResponse
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalRequested: requestedSymbols.length,
        totalFound: prices.length,
        prices: prices
      });
    } catch (err: any) {
      console.error('Error fetching prices:', err);
      res.status(500).json({ 
        success: false,
        timestamp: new Date().toISOString(),
        totalRequested: 0,
        totalFound: 0,
        prices: [],
        error: err.message
      });
    }
  });

  const httpServer = createServer(app);
  
  // התחלת שירות WebSocket לעדכוני מחירים בזמן אמת
  try {
    console.log('Starting Binance WebSocket price service...');
    binanceWebSocketService.connect();
    
    console.log('Adding event listeners for price updates...');
    binanceWebSocketService.on('connected', () => {
      console.log('Binance WebSocket connection established successfully');
    });
    
    binanceWebSocketService.on('simulation-started', () => {
      console.log('Binance WebSocket switched to simulation mode due to connection issues (possibly geo-restricted)');
      
      // עדכון כל ה-routers הרלוונטיים
      import('./routes/binance-market-prices').then(binanceMarketsRouter => {
        console.log('Informed binance-market-prices router about simulation mode');
      }).catch(err => {
        console.error('Failed to inform binance-market-prices router:', err);
      });
      
      import('./routes/market-prices').then(marketPricesRouter => {
        console.log('Informed market-prices router about simulation mode');
      }).catch(err => {
        console.error('Failed to inform market-prices router:', err);
      });
    });
    
    // הגבלת לוגים של עדכוני מחירים לאחת לדקה כדי למנוע הצפה
    let lastPriceUpdateLog = 0;
    binanceWebSocketService.on('price-update', (update) => {
      const now = Date.now();
      // רק אם עברה לפחות דקה מאז העדכון האחרון
      if (now - lastPriceUpdateLog > 60000) {
        console.log(`[WebSocket] Price update for ${update.symbol}: ${update.price} (${update.source})`);
        lastPriceUpdateLog = now;
      }
    });
    
    binanceWebSocketService.on('significant-price-change', (update) => {
      // תמיד מציג שינויים משמעותיים
      console.log(`[WebSocket] Significant price change for ${update.symbol}: ${update.previousPrice} -> ${update.price} (${update.changePercent.toFixed(2)}%)`);
    });
    
    binanceWebSocketService.on('error', (error) => {
      // זיהוי שגיאת גאוגרפית ספציפית
      if (error && error.message && error.message.includes('451')) {
        console.warn('[WebSocket] Binance WebSocket geo-restriction detected (451). Switching to simulation mode.');
      } else {
        console.error('[WebSocket] Binance WebSocket error:', error);
      }
    });
    
    binanceWebSocketService.on('disconnected', ({ code, reason }) => {
      console.log(`[WebSocket] Binance WebSocket disconnected with code ${code}: ${reason}`);
    });
  } catch (error) {
    console.error('Failed to start Binance WebSocket service:', error);
  }
  
  return httpServer;
}
