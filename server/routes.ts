import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { botSchema, pricingPlanSchema, insertUserSchema } from "@shared/schema";
import { z } from "zod";
import okxRouter from "./api/okx";
import bybitRouter from "./api/bybit";
import bitgetRouter from "./api/bitget";
import aiRouter from "./api/ai";
import testAuthRouter from "./routes/test-auth";
import userApiKeysRouter from './routes/user-api-keys';
import adminApiRouter from './routes/admin-api';
import { setupAuth, ensureAuthenticated } from "./auth";
import { createOkxServiceWithCustomCredentials } from "./api/okx/okxService";

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
    } catch (error) {
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
          const success = await storage.clearUserApiKeys(user.id);
          results.details.push({
            userId: user.id,
            email: user.email || 'unknown',
            success
          });
          
          if (success) {
            results.successful++;
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            userId: user.id,
            email: user.email || 'unknown',
            success: false,
            error: error.message
          });
        }
      }
      
      return res.json({
        message: `Reset API keys for ${results.successful} out of ${results.total} users`,
        results
      });
    } catch (error) {
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
  
  // Admin API routes
  app.use("/api/admin", adminApiRouter);
  
  // OKX API routes
  app.use("/api/okx", okxRouter);
  
  // Bybit API routes
  app.use("/api/bybit", bybitRouter);
  
  // Bitget API routes
  app.use("/api/bitget", bitgetRouter);
  
  // AI API routes
  app.use("/api/ai", aiRouter);
  
  // API Key validation endpoint - validates the user-provided API keys
  app.post("/api/validate-api-keys", ensureAuthenticated, async (req, res) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    const { okxApiKey, okxSecretKey, okxPassphrase, useTestnet } = req.body;
    
    if (!okxApiKey || !okxSecretKey || !okxPassphrase) {
      return res.status(400).json({ 
        success: false,
        message: "All API credentials are required"
      });
    }
    
    try {
      console.log(`Validating OKX API keys for user ID ${req.user.id}`);
      
      // Create OKX service instance with provided credentials
      const testService = createOkxServiceWithCustomCredentials(
        okxApiKey,
        okxSecretKey,
        okxPassphrase,
        useTestnet !== false, // Default to testnet if not specified
        req.user.id // Pass user ID for logging
      );
      
      // Test connection by making a simple API call
      console.log("Testing OKX API connection...");
      const pingResult = await testService.ping();
      
      if (!pingResult.success) {
        console.log("API connection test failed:", pingResult.message);
        return res.status(400).json({
          success: false,
          message: "API connection test failed. Please check your credentials."
        });
      }
      
      // Try an authenticated request
      try {
        console.log("Testing OKX API authentication...");
        const accountInfo = await testService.getAccountInfo();
        
        if (!accountInfo || !accountInfo.data) {
          throw new Error("Invalid response from OKX API");
        }
        
        console.log("API authentication successful");
        return res.json({
          success: true,
          message: "API keys validated successfully",
          demo: useTestnet !== false
        });
      } catch (authError) {
        console.error("API authentication failed:", authError.message);
        return res.status(400).json({
          success: false,
          message: `API authentication failed: ${authError.message}`
        });
      }
    } catch (error) {
      console.error("API key validation error:", error.message);
      return res.status(500).json({
        success: false,
        message: `API key validation failed: ${error.message}`
      });
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
      // Parse and validate the input using our schema
      const botData = botSchema.parse({
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
      
      // In a real app, you would set up a session here
      
      // Return success with user data
      res.status(200).json({
        message: "Login successful",
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

  // Create HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
