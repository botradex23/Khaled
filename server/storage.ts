import { 
  users, 
  type User, 
  type InsertUser, 
  type Bot,
  type InsertBot,
  type PricingPlan 
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // New API key related methods
  updateUserApiKeys(
    userId: number, 
    apiKeys: { 
      okxApiKey?: string; 
      okxSecretKey?: string; 
      okxPassphrase?: string; 
      defaultBroker?: string;
      useTestnet?: boolean;
    }
  ): Promise<User | undefined>;
  
  getUserApiKeys(userId: number): Promise<{ 
    okxApiKey?: string | null; 
    okxSecretKey?: string | null; 
    okxPassphrase?: string | null;
    defaultBroker: string;
    useTestnet: boolean;
  } | undefined>;
  
  clearUserApiKeys(userId: number): Promise<boolean>;
  
  // Bot related methods
  getAllBots(): Promise<Bot[]>;
  getBotById(id: number): Promise<Bot | undefined>;
  createBot(bot: InsertBot): Promise<Bot>;
  updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined>;
  deleteBot(id: number): Promise<boolean>;
  getUserBots(userId: number): Promise<Bot[]>;
  startBot(id: number): Promise<Bot | undefined>;
  stopBot(id: number): Promise<Bot | undefined>;
  updateBotStatus(id: number, isRunning: boolean, stats?: {
    profitLoss?: string;
    profitLossPercent?: string;
    totalTrades?: number;
  }): Promise<Bot | undefined>;
  
  // Pricing plan related methods
  getAllPricingPlans(): Promise<PricingPlan[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bots: Map<number, Bot>;
  private pricingPlans: Map<number, PricingPlan>;
  currentId: number;
  botId: number;
  pricingPlanId: number;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.pricingPlans = new Map();
    this.currentId = 1;
    this.botId = 1;
    this.pricingPlanId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create default user with API keys
    const defaultUser: User = {
      id: this.currentId++,
      username: "default_user",
      email: "kaity.abu.hanna@gmail.com",
      firstName: "Default",
      lastName: "User",
      password: "", // No password needed as we use OAuth
      googleId: null,
      appleId: null,
      profilePicture: null,
      createdAt: new Date(),
      
      // Default API keys for OKX taken from environment variables
      okxApiKey: process.env.OKX_API_KEY || null,
      okxSecretKey: process.env.OKX_SECRET_KEY || null,
      okxPassphrase: process.env.OKX_PASSPHRASE || null,
      
      // Default broker settings
      defaultBroker: "okx",
      useTestnet: true
    };
    
    // Save default user
    this.users.set(defaultUser.id, defaultUser);
    
    // Sample bots
    const sampleBots: Bot[] = [
      {
        id: this.botId++,
        name: "Grid Trading Bot",
        strategy: "grid",
        description: "Automatically buys low and sells high within a price range.",
        minInvestment: "500",
        monthlyReturn: "5.2",
        riskLevel: 2,
        rating: "4.5",
        isPopular: true,
        userId: 1, // Default user
        isRunning: false,
        tradingPair: "BTC-USDT",
        totalInvestment: "1000",
        parameters: JSON.stringify({
          symbol: "BTC-USDT",
          upperPrice: 85000,
          lowerPrice: 80000,
          gridCount: 5,
          totalInvestment: 1000
        }),
        createdAt: new Date(),
        lastStartedAt: null,
        lastStoppedAt: null,
        profitLoss: "0",
        profitLossPercent: "0",
        totalTrades: 0
      },
      {
        id: this.botId++,
        name: "DCA Crypto Bot",
        strategy: "dca",
        description: "Dollar-cost averaging strategy for long-term crypto investments.",
        minInvestment: "250",
        monthlyReturn: "3.8",
        riskLevel: 1,
        rating: "4.8",
        isPopular: false,
        userId: 1, // Default user
        isRunning: false,
        tradingPair: "ETH-USDT",
        totalInvestment: "500",
        parameters: JSON.stringify({
          symbol: "ETH-USDT",
          initialInvestment: 500,
          interval: "1d",
          investmentAmount: 50
        }),
        createdAt: new Date(),
        lastStartedAt: null,
        lastStoppedAt: null,
        profitLoss: "0",
        profitLossPercent: "0",
        totalTrades: 0
      },
      {
        id: this.botId++,
        name: "MACD Trend Follower",
        strategy: "macd",
        description: "Technical analysis bot using MACD indicators for optimal entry and exit.",
        minInvestment: "1000",
        monthlyReturn: "7.5",
        riskLevel: 3,
        rating: "4.2",
        isPopular: true,
        userId: 1, // Default user
        isRunning: false,
        tradingPair: "SOL-USDT",
        totalInvestment: "2000",
        parameters: JSON.stringify({
          symbol: "SOL-USDT",
          fastPeriod: 12,
          slowPeriod: 26,
          signalPeriod: 9,
          investmentAmount: 2000
        }),
        createdAt: new Date(),
        lastStartedAt: null,
        lastStoppedAt: null,
        profitLoss: "0",
        profitLossPercent: "0",
        totalTrades: 0
      }
    ];
    
    // Sample pricing plans
    const samplePlans: PricingPlan[] = [
      {
        id: this.pricingPlanId++,
        name: "Starter",
        description: "Perfect for beginners testing the waters",
        price: "0",
        features: [
          "1 active bot", 
          "Basic strategies", 
          "Standard support",
          "Manual trading"
        ],
        isPopular: false
      },
      {
        id: this.pricingPlanId++,
        name: "Advanced",
        description: "For serious crypto investors",
        price: "29.99",
        features: [
          "5 active bots", 
          "All strategies", 
          "Priority support",
          "Advanced analytics",
          "API access"
        ],
        isPopular: true
      },
      {
        id: this.pricingPlanId++,
        name: "Professional",
        description: "For professional traders and institutions",
        price: "99.99",
        features: [
          "Unlimited bots", 
          "Custom strategies", 
          "24/7 dedicated support",
          "Advanced risk management",
          "White-label solution",
          "Team access"
        ],
        isPopular: false
      }
    ];
    
    // Save to storage
    sampleBots.forEach(bot => this.bots.set(bot.id, bot));
    samplePlans.forEach(plan => this.pricingPlans.set(plan.id, plan));
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }
  
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.googleId === googleId,
    );
  }
  
  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.appleId === appleId,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    
    // Create base user object with required fields and null defaults for optional fields
    const user: User = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      firstName: insertUser.firstName || "",
      lastName: insertUser.lastName || "",
      password: insertUser.password || "",
      googleId: null,
      appleId: null,
      profilePicture: null,
      createdAt: new Date(),
      
      // API key fields with defaults from environment or null
      // Any new registered user gets the API keys by default for easy demo
      okxApiKey: process.env.OKX_API_KEY || null, 
      okxSecretKey: process.env.OKX_SECRET_KEY || null,
      okxPassphrase: process.env.OKX_PASSPHRASE || null,
      
      // Default broker settings
      defaultBroker: insertUser.defaultBroker || "okx",
      useTestnet: insertUser.useTestnet !== undefined ? !!insertUser.useTestnet : true
    };
    
    // Add optional OAuth fields if provided
    if (insertUser.googleId) {
      user.googleId = insertUser.googleId;
    }
    
    if (insertUser.appleId) {
      user.appleId = insertUser.appleId;
    }
    
    if (insertUser.profilePicture) {
      user.profilePicture = insertUser.profilePicture;
    }
    
    // Add API keys if provided
    if (insertUser.okxApiKey) {
      user.okxApiKey = insertUser.okxApiKey;
    }
    
    if (insertUser.okxSecretKey) {
      user.okxSecretKey = insertUser.okxSecretKey;
    }
    
    if (insertUser.okxPassphrase) {
      user.okxPassphrase = insertUser.okxPassphrase;
    }
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    // Create updated user by merging existing user with updates
    const updatedUser: User = {
      ...existingUser,
      ...updates
    };
    
    // Save the updated user
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  // New API key related methods
  async updateUserApiKeys(
    userId: number,
    apiKeys: {
      okxApiKey?: string;
      okxSecretKey?: string;
      okxPassphrase?: string;
      defaultBroker?: string;
      useTestnet?: boolean;
    }
  ): Promise<User | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      console.log(`updateUserApiKeys: User with ID ${userId} not found`);
      return undefined;
    }
    
    console.log(`updateUserApiKeys for user ${userId} (${user.email}):`);
    console.log("  Received API key type:", typeof apiKeys.okxApiKey);
    console.log("  Received API key undefined check:", apiKeys.okxApiKey === undefined);
    console.log("  Received API key empty string check:", apiKeys.okxApiKey === "");
    console.log("  Received API key length:", apiKeys.okxApiKey ? apiKeys.okxApiKey.length : "N/A");

    // Handle the special case for empty strings to convert them to null
    // This makes the API behavior more consistent across the app
    const sanitizedOkxApiKey = apiKeys.okxApiKey === "" ? null : apiKeys.okxApiKey;
    const sanitizedOkxSecretKey = apiKeys.okxSecretKey === "" ? null : apiKeys.okxSecretKey;
    const sanitizedOkxPassphrase = apiKeys.okxPassphrase === "" ? null : apiKeys.okxPassphrase;
    
    // Update the API keys
    const updatedUser: User = {
      ...user,
      // Only update if value is not undefined (explicitly provided)
      // This preserves previous values if a field wasn't specified
      okxApiKey: sanitizedOkxApiKey !== undefined ? sanitizedOkxApiKey : user.okxApiKey,
      okxSecretKey: sanitizedOkxSecretKey !== undefined ? sanitizedOkxSecretKey : user.okxSecretKey,
      okxPassphrase: sanitizedOkxPassphrase !== undefined ? sanitizedOkxPassphrase : user.okxPassphrase,
      defaultBroker: apiKeys.defaultBroker || user.defaultBroker || "okx",
      useTestnet: apiKeys.useTestnet !== undefined ? !!apiKeys.useTestnet : (user.useTestnet === null || user.useTestnet === undefined ? true : !!user.useTestnet)
    };
    
    console.log("updateUserApiKeys - User values after update:", {
      hasApiKey: !!updatedUser.okxApiKey,
      hasSecretKey: !!updatedUser.okxSecretKey,
      hasPassphrase: !!updatedUser.okxPassphrase,
      defaultBroker: updatedUser.defaultBroker,
      useTestnet: updatedUser.useTestnet
    });
    
    // Save the updated user
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async getUserApiKeys(userId: number): Promise<{
    okxApiKey: string | null;
    okxSecretKey: string | null;
    okxPassphrase: string | null;
    defaultBroker: string;
    useTestnet: boolean;
  } | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      console.log(`getUserApiKeys: User with ID ${userId} not found`);
      return undefined;
    }
    
    // Log the user properties and API key info for debugging
    console.log(`getUserApiKeys for user ${userId} (${user.email}):`);
    console.log("  API key type:", typeof user.okxApiKey);
    console.log("  API key null check:", user.okxApiKey === null);
    console.log("  API key undefined check:", user.okxApiKey === undefined);
    console.log("  API key empty string check:", user.okxApiKey === "");
    console.log("  API key length:", user.okxApiKey ? user.okxApiKey.length : "N/A");
    
    // Prepare for response ensuring type consistency
    const apiKeyResponse = {
      // Always return null if there's no meaningful value (null, undefined, or empty string)
      // This ensures consistent return types and makes client-side checks more reliable
      okxApiKey: !user.okxApiKey ? null : user.okxApiKey,
      okxSecretKey: !user.okxSecretKey ? null : user.okxSecretKey, 
      okxPassphrase: !user.okxPassphrase ? null : user.okxPassphrase,
      defaultBroker: user.defaultBroker || "okx",
      // Make sure we always return a boolean, never null or undefined
      useTestnet: user.useTestnet === null || user.useTestnet === undefined ? true : !!user.useTestnet
    };
    
    // Log what we're returning (excluding secret values) for debugging
    console.log("getUserApiKeys return value:", {
      hasApiKey: !!apiKeyResponse.okxApiKey,
      hasSecretKey: !!apiKeyResponse.okxSecretKey,
      hasPassphrase: !!apiKeyResponse.okxPassphrase,
      defaultBroker: apiKeyResponse.defaultBroker,
      useTestnet: apiKeyResponse.useTestnet
    });
    
    return apiKeyResponse;
  }
  
  async clearUserApiKeys(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }
    
    console.log(`Clearing API keys for user ID ${userId} (${user.email || 'unknown email'})`);
    
    // Clear all API keys
    const updatedUser: User = {
      ...user,
      okxApiKey: null,
      okxSecretKey: null,
      okxPassphrase: null
    };
    
    // Save the updated user
    this.users.set(userId, updatedUser);
    console.log(`API keys cleared successfully for user ID ${userId}`);
    
    return true;
  }
  
  // Bot related methods
  async getAllBots(): Promise<Bot[]> {
    return Array.from(this.bots.values());
  }
  
  async getBotById(id: number): Promise<Bot | undefined> {
    return this.bots.get(id);
  }
  
  async createBot(bot: InsertBot): Promise<Bot> {
    const id = this.botId++;
    
    const newBot: Bot = {
      id,
      name: bot.name,
      strategy: bot.strategy,
      description: bot.description,
      minInvestment: bot.minInvestment,
      monthlyReturn: bot.monthlyReturn,
      riskLevel: bot.riskLevel,
      rating: bot.rating,
      isPopular: bot.isPopular || false,
      userId: bot.userId,
      isRunning: false,
      tradingPair: bot.tradingPair || "BTC-USDT",
      totalInvestment: bot.totalInvestment || "1000",
      parameters: bot.parameters || null,
      createdAt: new Date(),
      lastStartedAt: null,
      lastStoppedAt: null,
      profitLoss: "0",
      profitLossPercent: "0",
      totalTrades: 0
    };
    
    this.bots.set(id, newBot);
    return newBot;
  }
  
  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    const existingBot = this.bots.get(id);
    
    if (!existingBot) {
      return undefined;
    }
    
    const updatedBot: Bot = {
      ...existingBot,
      ...updates
    };
    
    this.bots.set(id, updatedBot);
    return updatedBot;
  }
  
  async deleteBot(id: number): Promise<boolean> {
    const deleted = this.bots.delete(id);
    return deleted;
  }
  
  async getUserBots(userId: number): Promise<Bot[]> {
    return Array.from(this.bots.values()).filter(bot => bot.userId === userId);
  }
  
  async startBot(id: number): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) {
      return undefined;
    }
    
    const updatedBot: Bot = {
      ...bot,
      isRunning: true,
      lastStartedAt: new Date()
    };
    
    this.bots.set(id, updatedBot);
    return updatedBot;
  }
  
  async stopBot(id: number): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) {
      return undefined;
    }
    
    const updatedBot: Bot = {
      ...bot,
      isRunning: false,
      lastStoppedAt: new Date()
    };
    
    this.bots.set(id, updatedBot);
    return updatedBot;
  }
  
  async updateBotStatus(id: number, isRunning: boolean, stats?: {
    profitLoss?: string;
    profitLossPercent?: string;
    totalTrades?: number;
  }): Promise<Bot | undefined> {
    const bot = this.bots.get(id);
    if (!bot) {
      return undefined;
    }
    
    const updatedBot: Bot = {
      ...bot,
      isRunning,
      ...(isRunning ? { lastStartedAt: new Date() } : { lastStoppedAt: new Date() }),
      ...(stats?.profitLoss !== undefined && { profitLoss: stats.profitLoss }),
      ...(stats?.profitLossPercent !== undefined && { profitLossPercent: stats.profitLossPercent }),
      ...(stats?.totalTrades !== undefined && { totalTrades: stats.totalTrades })
    };
    
    this.bots.set(id, updatedBot);
    return updatedBot;
  }
  
  // Pricing plan related methods
  async getAllPricingPlans(): Promise<PricingPlan[]> {
    return Array.from(this.pricingPlans.values());
  }
}

export const storage = new MemStorage();
