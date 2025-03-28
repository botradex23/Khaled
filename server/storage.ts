import { 
  users, 
  type User, 
  type InsertUser, 
  type Bot,
  type InsertBot,
  type PricingPlan,
  type Payment,
  type InsertPayment,
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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bots: Map<number, Bot>;
  private pricingPlans: Map<number, PricingPlan>;
  private payments: Map<number, Payment>;
  currentId: number;
  botId: number;
  pricingPlanId: number;
  paymentId: number;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.pricingPlans = new Map();
    this.payments = new Map();
    this.currentId = 1;
    this.botId = 1;
    this.pricingPlanId = 1;
    this.paymentId = 1;
    
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
      
      // Default broker settings
      defaultBroker: "okx",
      useTestnet: true,
      
      // Stripe related fields
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: false,
      premiumExpiresAt: null
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
      
      // Always use testnet for safety
      defaultBroker: "okx",
      useTestnet: true,
      
      // Admin should have premium
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: true,
      premiumExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
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
      
      // Default broker settings
      defaultBroker: insertUser.defaultBroker || "okx",
      useTestnet: insertUser.useTestnet !== undefined ? !!insertUser.useTestnet : true,
      
      // Stripe related fields
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      hasPremium: false,
      premiumExpiresAt: null
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
      currency: payment.currency || "USD",
      status: payment.status || "pending",
      stripePaymentId: payment.stripePaymentId || null,
      pricingPlanId: payment.pricingPlanId,
      createdAt: new Date(),
      completedAt: payment.completedAt || null
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
}

export const storage = new MemStorage();
