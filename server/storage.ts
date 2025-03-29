import { 
  users, 
  type User, 
  type InsertUser, 
  type Bot,
  type InsertBot,
  type PricingPlan,
  type InsertPricingPlan,
  type Payment,
  type InsertPayment,
  type PaperTradingAccount,
  type InsertPaperTradingAccount,
  type PaperTradingPosition,
  type InsertPaperTradingPosition,
  type PaperTradingTrade,
  type InsertPaperTradingTrade,
  payments
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
  
  // OKX API key related methods
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
  
  // Binance API key related methods
  updateUserBinanceApiKeys(
    userId: number,
    apiKeys: {
      binanceApiKey?: string;
      binanceSecretKey?: string;
      binanceAllowedIp?: string;
    }
  ): Promise<User | undefined>;
  
  getUserBinanceApiKeys(userId: number): Promise<{
    binanceApiKey?: string | null;
    binanceSecretKey?: string | null;
    binanceAllowedIp?: string | null;
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
  getPricingPlanById(id: number): Promise<PricingPlan | undefined>;
  
  // Payment related methods
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPaymentById(id: number): Promise<Payment | undefined>;
  getUserPayments(userId: number): Promise<Payment[]>;
  updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined>;
  
  // Stripe related methods
  updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId: string;
    stripeSubscriptionId?: string; 
  }): Promise<User | undefined>;
  updateUserPremiumStatus(userId: number, hasPremium: boolean, expiresAt?: Date): Promise<User | undefined>;
  
  // Paper Trading Account methods
  getPaperTradingAccount(id: number): Promise<PaperTradingAccount | undefined>;
  getUserPaperTradingAccount(userId: number): Promise<PaperTradingAccount | undefined>;
  createPaperTradingAccount(account: InsertPaperTradingAccount): Promise<PaperTradingAccount>;
  updatePaperTradingAccount(id: number, updates: Partial<PaperTradingAccount>): Promise<PaperTradingAccount | undefined>;
  resetPaperTradingAccount(id: number, initialBalance?: number): Promise<PaperTradingAccount | undefined>;
  
  // Paper Trading Position methods
  getPaperTradingPosition(id: number): Promise<PaperTradingPosition | undefined>;
  getAccountPaperTradingPositions(accountId: number): Promise<PaperTradingPosition[]>;
  createPaperTradingPosition(position: InsertPaperTradingPosition): Promise<PaperTradingPosition>;
  updatePaperTradingPosition(id: number, updates: Partial<PaperTradingPosition>): Promise<PaperTradingPosition | undefined>;
  closePaperTradingPosition(id: number, exitPrice: number): Promise<PaperTradingTrade | undefined>;
  
  // Paper Trading Trade methods
  getPaperTradingTrade(id: number): Promise<PaperTradingTrade | undefined>;
  getAccountPaperTradingTrades(accountId: number, limit?: number, offset?: number): Promise<PaperTradingTrade[]>;
  createPaperTradingTrade(trade: InsertPaperTradingTrade): Promise<PaperTradingTrade>;
  updatePaperTradingTrade(id: number, updates: Partial<PaperTradingTrade>): Promise<PaperTradingTrade | undefined>;
  
  // Paper Trading Stats
  getPaperTradingStats(accountId: number): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: string;
    totalProfitLossPercent: string;
    averageProfitLoss: string;
    averageProfitLossPercent: string;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bots: Map<number, Bot>;
  private pricingPlans: Map<number, PricingPlan>;
  private payments: Map<number, Payment>;
  private paperTradingAccounts: Map<number, PaperTradingAccount>;
  private paperTradingPositions: Map<number, PaperTradingPosition>;
  private paperTradingTrades: Map<number, PaperTradingTrade>;
  
  currentId: number;
  botId: number;
  pricingPlanId: number;
  paymentId: number;
  paperAccountId: number;
  paperPositionId: number;
  paperTradeId: number;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.pricingPlans = new Map();
    this.payments = new Map();
    this.paperTradingAccounts = new Map();
    this.paperTradingPositions = new Map();
    this.paperTradingTrades = new Map();
    
    this.currentId = 1;
    this.botId = 1;
    this.pricingPlanId = 1;
    this.paymentId = 1;
    this.paperAccountId = 1;
    this.paperPositionId = 1;
    this.paperTradeId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Create default user without API keys
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
      
      // No default API keys - user must set their own
      okxApiKey: null,
      okxSecretKey: null,
      okxPassphrase: null,
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null,
      
      // Default broker settings
      defaultBroker: "okx",
      useTestnet: true,
      
      // Stripe related fields
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: false,
      premiumExpiresAt: null,
      isAdmin: false
    };
    
    // Create an admin user with test API keys
    const adminUser: User = {
      id: this.currentId++,
      username: "admin",
      email: "admin@example.com",
      firstName: "Admin",
      lastName: "User",
      password: "admin123", // Simple password for testing purposes
      googleId: null,
      appleId: null,
      profilePicture: null,
      createdAt: new Date(),
      
      // Add your OKX API keys here
      okxApiKey: process.env.OKX_API_KEY || "",
      okxSecretKey: process.env.OKX_SECRET_KEY || "",
      okxPassphrase: process.env.OKX_PASSPHRASE || "",
      
      // Add Binance API keys
      binanceApiKey: process.env.BYBIT_API_KEY || "", // Using Bybit for testing as users will provide their own in production
      binanceSecretKey: process.env.BYBIT_SECRET_KEY || "",
      binanceAllowedIp: null,
      
      // Always use testnet for safety
      defaultBroker: "okx",
      useTestnet: true,
      
      // Admin should have premium
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: true,
      premiumExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
      isAdmin: true
    };
    
    console.log('Created admin user with API keys:', {
      username: adminUser.username,
      hasApiKey: !!adminUser.okxApiKey,
      hasSecretKey: !!adminUser.okxSecretKey,
      hasPassphrase: !!adminUser.okxPassphrase
    });
    
    // Save default user
    this.users.set(defaultUser.id, defaultUser);
    
    // Save admin user
    this.users.set(adminUser.id, adminUser);
    
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
      
      // No default API keys - user must set their own
      okxApiKey: null,
      okxSecretKey: null,
      okxPassphrase: null,
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null,
      
      // Default broker settings
      defaultBroker: insertUser.defaultBroker || "okx",
      useTestnet: insertUser.useTestnet !== undefined ? !!insertUser.useTestnet : true,
      
      // Stripe related fields
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: false,
      premiumExpiresAt: null,
      
      // Default role
      isAdmin: false
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
    
    if (insertUser.binanceApiKey) {
      user.binanceApiKey = insertUser.binanceApiKey;
    }
    
    if (insertUser.binanceSecretKey) {
      user.binanceSecretKey = insertUser.binanceSecretKey;
    }
    
    if (insertUser.binanceAllowedIp) {
      user.binanceAllowedIp = insertUser.binanceAllowedIp;
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

    // Handle the special cases for empty strings or strings with only whitespace to convert them to null
    // This makes the API behavior more consistent across the app
    const sanitizedOkxApiKey = !apiKeys.okxApiKey || apiKeys.okxApiKey.trim() === "" ? null : apiKeys.okxApiKey;
    const sanitizedOkxSecretKey = !apiKeys.okxSecretKey || apiKeys.okxSecretKey.trim() === "" ? null : apiKeys.okxSecretKey;
    const sanitizedOkxPassphrase = !apiKeys.okxPassphrase || apiKeys.okxPassphrase.trim() === "" ? null : apiKeys.okxPassphrase;
    
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
      okxApiKey: !user.okxApiKey || user.okxApiKey.trim() === '' ? null : user.okxApiKey,
      okxSecretKey: !user.okxSecretKey || user.okxSecretKey.trim() === '' ? null : user.okxSecretKey, 
      okxPassphrase: !user.okxPassphrase || user.okxPassphrase.trim() === '' ? null : user.okxPassphrase,
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
  
  // Binance API key methods
  async updateUserBinanceApiKeys(
    userId: number,
    apiKeys: {
      binanceApiKey?: string;
      binanceSecretKey?: string;
      binanceAllowedIp?: string;
    }
  ): Promise<User | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      console.log(`updateUserBinanceApiKeys: User with ID ${userId} not found`);
      return undefined;
    }
    
    console.log(`updateUserBinanceApiKeys for user ${userId} (${user.email}):`);
    console.log("  Received Binance API key type:", typeof apiKeys.binanceApiKey);
    console.log("  Received Binance API key undefined check:", apiKeys.binanceApiKey === undefined);
    console.log("  Received Binance API key empty string check:", apiKeys.binanceApiKey === "");
    console.log("  Received Binance API key length:", apiKeys.binanceApiKey ? apiKeys.binanceApiKey.length : "N/A");
    
    // Additional cleaning - completely remove all whitespace (inside and outside)
    let cleanedApiKey = apiKeys.binanceApiKey;
    let cleanedSecretKey = apiKeys.binanceSecretKey;
    let cleanedAllowedIp = apiKeys.binanceAllowedIp;
    
    // Clean up the API key by removing all whitespace
    if (cleanedApiKey) {
      cleanedApiKey = cleanedApiKey.replace(/\s+/g, '').trim();
      console.log(`  Cleaned API key length: ${cleanedApiKey.length}`);
    }
    
    // Clean up the Secret key by removing all whitespace
    if (cleanedSecretKey) {
      cleanedSecretKey = cleanedSecretKey.replace(/\s+/g, '').trim();
      console.log(`  Cleaned Secret key length: ${cleanedSecretKey.length}`);
    }
    
    // Clean up the Allowed IP by removing all whitespace
    if (cleanedAllowedIp) {
      cleanedAllowedIp = cleanedAllowedIp.replace(/\s+/g, '').trim();
      console.log(`  Cleaned Allowed IP: ${cleanedAllowedIp}`);
    }

    // ניהול תקין של מקרי קצה:
    // 1. המרת מחרוזות ריקות או מחרוזות עם רווחים בלבד ל-null לעקביות
    // 2. תמיד נשמור את המחרוזת המנוקה במלואה, ללא קיצורים או שינויים
    const sanitizedBinanceApiKey = !cleanedApiKey || cleanedApiKey === "" ? null : cleanedApiKey;
    const sanitizedBinanceSecretKey = !cleanedSecretKey || cleanedSecretKey === "" ? null : cleanedSecretKey;
    const sanitizedBinanceAllowedIp = !cleanedAllowedIp || cleanedAllowedIp === "" ? null : cleanedAllowedIp;
    
    console.log(`Final sanitized API key: ${sanitizedBinanceApiKey ? (typeof sanitizedBinanceApiKey) : 'null'}, length: ${sanitizedBinanceApiKey ? sanitizedBinanceApiKey.length : 0}`);
    console.log(`Final sanitized Secret key: ${sanitizedBinanceSecretKey ? (typeof sanitizedBinanceSecretKey) : 'null'}, length: ${sanitizedBinanceSecretKey ? sanitizedBinanceSecretKey.length : 0}`);
    
    // Update the API keys
    const updatedUser: User = {
      ...user,
      // Only update if value is not undefined (explicitly provided)
      // This preserves previous values if a field wasn't specified
      binanceApiKey: sanitizedBinanceApiKey !== undefined ? sanitizedBinanceApiKey : user.binanceApiKey,
      binanceSecretKey: sanitizedBinanceSecretKey !== undefined ? sanitizedBinanceSecretKey : user.binanceSecretKey,
      binanceAllowedIp: sanitizedBinanceAllowedIp !== undefined ? sanitizedBinanceAllowedIp : user.binanceAllowedIp
    };
    
    console.log("updateUserBinanceApiKeys - User values after update:", {
      hasBinanceApiKey: !!updatedUser.binanceApiKey,
      hasBinanceSecretKey: !!updatedUser.binanceSecretKey
    });
    
    // Save the updated user
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async getUserBinanceApiKeys(userId: number): Promise<{
    binanceApiKey: string | null;
    binanceSecretKey: string | null;
    binanceAllowedIp: string | null;
  } | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      console.log(`getUserBinanceApiKeys: User with ID ${userId} not found`);
      return undefined;
    }
    
    // Log the user properties and API key info for debugging
    console.log(`getUserBinanceApiKeys for user ${userId} (${user.email}):`);
    console.log("  Binance API key type:", typeof user.binanceApiKey);
    console.log("  Binance API key null check:", user.binanceApiKey === null);
    console.log("  Binance API key undefined check:", user.binanceApiKey === undefined);
    console.log("  Binance API key empty string check:", user.binanceApiKey === "");
    console.log("  Binance API key length:", user.binanceApiKey ? user.binanceApiKey.length : "N/A");
    
    // Additional cleaning on retrieval too - completely remove all whitespace (inside and outside)
    let cleanedApiKey = user.binanceApiKey;
    let cleanedSecretKey = user.binanceSecretKey;
    let cleanedAllowedIp = user.binanceAllowedIp;
    
    // Clean up the API key by removing all whitespace
    if (cleanedApiKey) {
      cleanedApiKey = cleanedApiKey.replace(/\s+/g, '').trim();
      console.log(`  Cleaned API key length on get: ${cleanedApiKey.length}`);
    }
    
    // Clean up the Secret key by removing all whitespace
    if (cleanedSecretKey) {
      cleanedSecretKey = cleanedSecretKey.replace(/\s+/g, '').trim();
      console.log(`  Cleaned Secret key length on get: ${cleanedSecretKey.length}`);
    }
    
    // Clean up the Allowed IP by removing all whitespace
    if (cleanedAllowedIp) {
      cleanedAllowedIp = cleanedAllowedIp.replace(/\s+/g, '').trim();
      console.log(`  Cleaned Allowed IP on get: ${cleanedAllowedIp}`);
    }

    // Prepare for response ensuring type consistency
    const apiKeyResponse = {
      // Always return null if there's no meaningful value (null, undefined, or empty string)
      // This ensures consistent return types and makes client-side checks more reliable
      binanceApiKey: !cleanedApiKey || cleanedApiKey === '' ? null : cleanedApiKey,
      binanceSecretKey: !cleanedSecretKey || cleanedSecretKey === '' ? null : cleanedSecretKey,
      binanceAllowedIp: !cleanedAllowedIp || cleanedAllowedIp === '' ? null : cleanedAllowedIp
    };
    
    // Log what we're returning (excluding secret values) for debugging
    console.log("getUserBinanceApiKeys return value:", {
      hasBinanceApiKey: !!apiKeyResponse.binanceApiKey,
      hasBinanceSecretKey: !!apiKeyResponse.binanceSecretKey
    });
    
    return apiKeyResponse;
  }

  async clearUserApiKeys(userId: number): Promise<boolean> {
    const user = this.users.get(userId);
    
    if (!user) {
      return false;
    }
    
    console.log(`Clearing API keys for user ID ${userId} (${user.email || 'unknown email'})`);
    
    // Clear all API keys - both OKX and Binance
    const updatedUser: User = {
      ...user,
      okxApiKey: null,
      okxSecretKey: null,
      okxPassphrase: null,
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null
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
  
  async getPricingPlanById(id: number): Promise<PricingPlan | undefined> {
    return this.pricingPlans.get(id);
  }
  
  // Payment related methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const id = this.paymentId++;
    
    const newPayment: Payment = {
      id,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency || "usd",
      status: payment.status,
      stripePaymentIntentId: payment.stripePaymentIntentId,
      planId: payment.planId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: payment.metadata || null
    };
    
    this.payments.set(id, newPayment);
    return newPayment;
  }
  
  async getPaymentById(id: number): Promise<Payment | undefined> {
    return this.payments.get(id);
  }
  
  async getUserPayments(userId: number): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(payment => payment.userId === userId);
  }
  
  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    const existingPayment = this.payments.get(id);
    
    if (!existingPayment) {
      return undefined;
    }
    
    const updatedPayment: Payment = {
      ...existingPayment,
      ...updates
    };
    
    this.payments.set(id, updatedPayment);
    return updatedPayment;
  }
  
  // Stripe related methods
  async updateUserStripeInfo(userId: number, stripeInfo: { 
    stripeCustomerId: string;
    stripeSubscriptionId?: string; 
  }): Promise<User | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      stripeCustomerId: stripeInfo.stripeCustomerId,
      stripeSubscriptionId: stripeInfo.stripeSubscriptionId || null
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }
  
  async updateUserPremiumStatus(userId: number, hasPremium: boolean, expiresAt?: Date): Promise<User | undefined> {
    const user = this.users.get(userId);
    
    if (!user) {
      return undefined;
    }
    
    const updatedUser: User = {
      ...user,
      hasPremium,
      premiumExpiresAt: expiresAt || null
    };
    
    this.users.set(userId, updatedUser);
    return updatedUser;
  }



  // Paper Trading Account methods
  async getPaperTradingAccount(id: number): Promise<PaperTradingAccount | undefined> {
    return this.paperTradingAccounts.get(id);
  }

  async getUserPaperTradingAccount(userId: number): Promise<PaperTradingAccount | undefined> {
    return Array.from(this.paperTradingAccounts.values()).find(
      (account) => account.userId === userId
    );
  }

  async createPaperTradingAccount(account: InsertPaperTradingAccount): Promise<PaperTradingAccount> {
    const id = this.paperAccountId++;
    
    const paperAccount: PaperTradingAccount = {
      id,
      userId: account.userId,
      initialBalance: account.initialBalance || "1000",
      currentBalance: account.currentBalance || account.initialBalance || "1000",
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: account.isActive !== undefined ? account.isActive : true,
      lastResetAt: null,
      totalProfitLoss: "0",
      totalProfitLossPercent: "0",
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      metadata: account.metadata || null
    };
    
    this.paperTradingAccounts.set(id, paperAccount);
    return paperAccount;
  }

  async updatePaperTradingAccount(id: number, updates: Partial<PaperTradingAccount>): Promise<PaperTradingAccount | undefined> {
    const account = this.paperTradingAccounts.get(id);
    
    if (!account) {
      return undefined;
    }
    
    const updatedAccount: PaperTradingAccount = {
      ...account,
      ...updates,
      updatedAt: new Date()
    };
    
    this.paperTradingAccounts.set(id, updatedAccount);
    return updatedAccount;
  }

  async resetPaperTradingAccount(id: number, initialBalance?: number): Promise<PaperTradingAccount | undefined> {
    const account = this.paperTradingAccounts.get(id);
    
    if (!account) {
      return undefined;
    }
    
    // Close all open positions
    const positions = Array.from(this.paperTradingPositions.values())
      .filter(pos => pos.accountId === id);
      
    for (const position of positions) {
      await this.closePaperTradingPosition(position.id, parseFloat(position.currentPrice || position.entryPrice));
    }
    
    // Update account with reset values
    const updatedAccount: PaperTradingAccount = {
      ...account,
      initialBalance: initialBalance ? initialBalance.toString() : account.initialBalance,
      currentBalance: initialBalance ? initialBalance.toString() : account.initialBalance,
      lastResetAt: new Date(),
      updatedAt: new Date(),
      totalProfitLoss: "0",
      totalProfitLossPercent: "0",
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0
    };
    
    this.paperTradingAccounts.set(id, updatedAccount);
    return updatedAccount;
  }

  // Paper Trading Position methods
  async getPaperTradingPosition(id: number): Promise<PaperTradingPosition | undefined> {
    return this.paperTradingPositions.get(id);
  }

  async getAccountPaperTradingPositions(accountId: number): Promise<PaperTradingPosition[]> {
    return Array.from(this.paperTradingPositions.values())
      .filter(position => position.accountId === accountId);
  }

  async createPaperTradingPosition(position: InsertPaperTradingPosition): Promise<PaperTradingPosition> {
    const id = this.paperPositionId++;
    
    const newPosition: PaperTradingPosition = {
      id,
      accountId: position.accountId,
      symbol: position.symbol,
      entryPrice: position.entryPrice,
      quantity: position.quantity,
      direction: position.direction,
      openedAt: new Date(),
      updatedAt: new Date(),
      currentPrice: position.entryPrice,
      currentProfitLoss: "0",
      currentProfitLossPercent: "0",
      stopLoss: position.stopLoss || null,
      takeProfit: position.takeProfit || null,
      metadata: position.metadata || null
    };
    
    this.paperTradingPositions.set(id, newPosition);
    
    // Also create a trade record for this position
    const tradeId = this.paperTradeId++;
    const newTrade: PaperTradingTrade = {
      id: tradeId,
      accountId: position.accountId,
      positionId: id,
      symbol: position.symbol,
      entryPrice: position.entryPrice,
      exitPrice: null,
      quantity: position.quantity,
      direction: position.direction,
      status: "OPEN",
      profitLoss: null,
      profitLossPercent: null,
      fee: "0",
      openedAt: new Date(),
      closedAt: null,
      type: "MARKET",
      isAiGenerated: false,
      aiConfidence: null,
      signalData: null,
      metadata: position.metadata || null
    };
    
    this.paperTradingTrades.set(tradeId, newTrade);
    
    // Update account balance
    const account = this.paperTradingAccounts.get(position.accountId);
    if (account) {
      const positionValue = parseFloat(position.entryPrice) * parseFloat(position.quantity);
      const fee = positionValue * 0.001; // Simulate 0.1% fee
      const newBalance = parseFloat(account.currentBalance) - fee;
      
      await this.updatePaperTradingAccount(account.id, {
        currentBalance: newBalance.toString()
      });
    }
    
    return newPosition;
  }

  async updatePaperTradingPosition(id: number, updates: Partial<PaperTradingPosition>): Promise<PaperTradingPosition | undefined> {
    const position = this.paperTradingPositions.get(id);
    
    if (!position) {
      return undefined;
    }
    
    // Calculate profit/loss if currentPrice is being updated
    let currentProfitLoss = position.currentProfitLoss;
    let currentProfitLossPercent = position.currentProfitLossPercent;
    
    if (updates.currentPrice && updates.currentPrice !== position.currentPrice) {
      const entryValue = parseFloat(position.entryPrice) * parseFloat(position.quantity);
      const currentValue = parseFloat(updates.currentPrice) * parseFloat(position.quantity);
      
      // Adjust calculation based on position direction
      if (position.direction === "LONG") {
        currentProfitLoss = (currentValue - entryValue).toString();
        currentProfitLossPercent = ((currentValue - entryValue) / entryValue * 100).toString();
      } else {
        currentProfitLoss = (entryValue - currentValue).toString();
        currentProfitLossPercent = ((entryValue - currentValue) / entryValue * 100).toString();
      }
    }
    
    const updatedPosition: PaperTradingPosition = {
      ...position,
      ...updates,
      currentProfitLoss,
      currentProfitLossPercent,
      updatedAt: new Date()
    };
    
    this.paperTradingPositions.set(id, updatedPosition);
    return updatedPosition;
  }

  async closePaperTradingPosition(id: number, exitPrice: number): Promise<PaperTradingTrade | undefined> {
    const position = this.paperTradingPositions.get(id);
    
    if (!position) {
      return undefined;
    }
    
    // Find the associated trade
    const trade = Array.from(this.paperTradingTrades.values())
      .find(t => t.positionId === id && t.status === "OPEN");
    
    if (!trade) {
      return undefined;
    }
    
    // Calculate profit/loss
    const entryValue = parseFloat(position.entryPrice) * parseFloat(position.quantity);
    const exitValue = exitPrice * parseFloat(position.quantity);
    const fee = exitValue * 0.001; // Simulate 0.1% fee
    
    let profitLoss: number;
    let profitLossPercent: number;
    
    // Adjust calculation based on position direction
    if (position.direction === "LONG") {
      profitLoss = exitValue - entryValue - fee;
      profitLossPercent = (profitLoss / entryValue) * 100;
    } else {
      profitLoss = entryValue - exitValue - fee;
      profitLossPercent = (profitLoss / entryValue) * 100;
    }
    
    // Update the trade
    const updatedTrade: PaperTradingTrade = {
      ...trade,
      exitPrice: exitPrice.toString(),
      status: "CLOSED",
      profitLoss: profitLoss.toString(),
      profitLossPercent: profitLossPercent.toString(),
      fee: fee.toString(),
      closedAt: new Date()
    };
    
    this.paperTradingTrades.set(trade.id, updatedTrade);
    
    // Remove the position
    this.paperTradingPositions.delete(id);
    
    // Update account balance and stats
    const account = this.paperTradingAccounts.get(position.accountId);
    if (account) {
      const newBalance = parseFloat(account.currentBalance) + exitValue + profitLoss;
      const totalProfitLoss = parseFloat(account.totalProfitLoss || "0") + profitLoss;
      const totalTrades = (account.totalTrades || 0) + 1;
      const winningTrades = profitLoss > 0 ? (account.winningTrades || 0) + 1 : (account.winningTrades || 0);
      const losingTrades = profitLoss <= 0 ? (account.losingTrades || 0) + 1 : (account.losingTrades || 0);
      
      const totalProfitLossPercent = (totalProfitLoss / parseFloat(account.initialBalance)) * 100;
      
      await this.updatePaperTradingAccount(account.id, {
        currentBalance: newBalance.toString(),
        totalProfitLoss: totalProfitLoss.toString(),
        totalProfitLossPercent: totalProfitLossPercent.toString(),
        totalTrades,
        winningTrades,
        losingTrades
      });
    }
    
    return updatedTrade;
  }

  // Paper Trading Trade methods
  async getPaperTradingTrade(id: number): Promise<PaperTradingTrade | undefined> {
    return this.paperTradingTrades.get(id);
  }

  async getAccountPaperTradingTrades(accountId: number, limit?: number, offset?: number): Promise<PaperTradingTrade[]> {
    let trades = Array.from(this.paperTradingTrades.values())
      .filter(trade => trade.accountId === accountId)
      .sort((a, b) => {
        const aTime = a.openedAt ? a.openedAt.getTime() : 0;
        const bTime = b.openedAt ? b.openedAt.getTime() : 0;
        return bTime - aTime; // Newest first
      });
    
    if (offset !== undefined) {
      trades = trades.slice(offset);
    }
    
    if (limit !== undefined) {
      trades = trades.slice(0, limit);
    }
    
    return trades;
  }

  async createPaperTradingTrade(trade: InsertPaperTradingTrade): Promise<PaperTradingTrade> {
    const id = this.paperTradeId++;
    
    // Need to cast the trade to handle potentially missing profitLoss and profitLossPercent
    const completeTradeData = trade as any;
    
    const newTrade: PaperTradingTrade = {
      id,
      accountId: trade.accountId,
      positionId: trade.positionId || null,
      symbol: trade.symbol,
      entryPrice: trade.entryPrice,
      exitPrice: trade.exitPrice || null,
      quantity: trade.quantity,
      direction: trade.direction,
      status: trade.status,
      profitLoss: completeTradeData.profitLoss || null,
      profitLossPercent: completeTradeData.profitLossPercent || null,
      fee: trade.fee || "0",
      openedAt: new Date(),
      closedAt: trade.status === "CLOSED" ? new Date() : null,
      type: trade.type,
      isAiGenerated: trade.isAiGenerated || false,
      aiConfidence: trade.aiConfidence || null,
      signalData: trade.signalData || null,
      metadata: trade.metadata || null
    };
    
    this.paperTradingTrades.set(id, newTrade);
    return newTrade;
  }

  async updatePaperTradingTrade(id: number, updates: Partial<PaperTradingTrade>): Promise<PaperTradingTrade | undefined> {
    const trade = this.paperTradingTrades.get(id);
    
    if (!trade) {
      return undefined;
    }
    
    // If status is changing to CLOSED, set closedAt
    const closedAt = updates.status === "CLOSED" && trade.status !== "CLOSED" 
      ? new Date() 
      : trade.closedAt;
    
    const updatedTrade: PaperTradingTrade = {
      ...trade,
      ...updates,
      closedAt
    };
    
    this.paperTradingTrades.set(id, updatedTrade);
    return updatedTrade;
  }

  // Paper Trading Stats
  async getPaperTradingStats(accountId: number): Promise<{
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    totalProfitLoss: string;
    totalProfitLossPercent: string;
    averageProfitLoss: string;
    averageProfitLossPercent: string;
  }> {
    const account = await this.getPaperTradingAccount(accountId);
    
    if (!account) {
      throw new Error(`Paper trading account with ID ${accountId} not found`);
    }
    
    const closedTrades = Array.from(this.paperTradingTrades.values())
      .filter(trade => trade.accountId === accountId && trade.status === "CLOSED");
    
    const totalTrades = closedTrades.length;
    const winningTrades = closedTrades.filter(trade => parseFloat(trade.profitLoss || "0") > 0).length;
    const losingTrades = closedTrades.filter(trade => parseFloat(trade.profitLoss || "0") <= 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalProfitLoss = account.totalProfitLoss;
    const totalProfitLossPercent = account.totalProfitLossPercent;
    
    // Calculate average profit/loss
    let avgProfitLoss = "0";
    let avgProfitLossPercent = "0";
    
    if (totalTrades > 0) {
      const sumProfitLoss = closedTrades.reduce((sum, trade) => 
        sum + parseFloat(trade.profitLoss || "0"), 0);
      
      const sumProfitLossPercent = closedTrades.reduce((sum, trade) => 
        sum + parseFloat(trade.profitLossPercent || "0"), 0);
      
      avgProfitLoss = (sumProfitLoss / totalTrades).toString();
      avgProfitLossPercent = (sumProfitLossPercent / totalTrades).toString();
    }
    
    return {
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      totalProfitLoss: totalProfitLoss || "0",
      totalProfitLossPercent: totalProfitLossPercent || "0",
      averageProfitLoss: avgProfitLoss,
      averageProfitLossPercent: avgProfitLossPercent
    };
  }
}

export const storage = new MemStorage();
