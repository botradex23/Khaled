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
  type TradeLog,
  type InsertTradeLog,
  type RiskSettings,
  type InsertRiskSettings,
  type XgboostTuningRun,
  type InsertXgboostTuningRun,
  type MarketCondition,
  type InsertMarketCondition,
  type MlModelPerformance,
  type InsertMlModelPerformance,
  type MlAdminFeedback,
  type InsertMlAdminFeedback,
  type StrategySimulation,
  type InsertStrategySimulation,
  payments,
  tradeLogs,
  riskSettings
} from "@shared/schema";
import { encrypt, decrypt, isEncrypted } from './utils/encryption';

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // Connect to the database
  connect(): Promise<boolean>;
  
  // Get database instance
  getDb(): any;
  
  // Database status check
  checkDatabaseStatus(): Promise<{
    connected: boolean;
    isSimulated?: boolean;
    description?: string;
    error?: string | null;
  }>;
  
  // User related methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  getUserByAppleId(appleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;
  
  // API key related methods (Binance only)
  updateUserApiKeys(
    userId: number, 
    apiKeys: { 
      binanceApiKey?: string; 
      binanceSecretKey?: string; 
      binanceAllowedIp?: string; 
      defaultBroker?: string;
      useTestnet?: boolean;
    }
  ): Promise<User | undefined>;
  
  getUserApiKeys(userId: number): Promise<{ 
    binanceApiKey?: string | null; 
    binanceSecretKey?: string | null; 
    binanceAllowedIp?: string | null;
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
  getActiveBots(): Promise<Bot[]>;
  
  // Bot trade related methods
  createBotTrade(trade: InsertBotTrade): Promise<number>;
  getBotTrades(botId: number): Promise<BotTrade[]>;
  getBotTrade(id: number): Promise<BotTrade | undefined>;
  getUserBotTrades(userId: number): Promise<BotTrade[]>;
  updateBotTrade(id: number, updates: Partial<BotTrade>): Promise<BotTrade | undefined>;
  
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
  
  // Trade Logging methods
  createTradeLog(tradeLog: InsertTradeLog): Promise<TradeLog>;
  getTradeLog(id: number): Promise<TradeLog | undefined>;
  getAllTradeLogs(limit?: number): Promise<TradeLog[]>;
  getTradeLogsBySymbol(symbol: string, limit?: number): Promise<TradeLog[]>;
  getTradeLogsByUserId(userId: number, limit?: number): Promise<TradeLog[]>;
  getTradeLogsBySource(source: string, limit?: number): Promise<TradeLog[]>;
  updateTradeLog(id: number, updates: Partial<TradeLog>): Promise<TradeLog | undefined>;
  searchTradeLogs(filter: {
    symbol?: string;
    action?: string;
    source?: string;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    userId?: number;
  }, limit?: number): Promise<TradeLog[]>;
  
  // Risk Settings methods
  getRiskSettings(id: number): Promise<RiskSettings | undefined>;
  getRiskSettingsByUserId(userId: number): Promise<RiskSettings | undefined>;
  createRiskSettings(settings: InsertRiskSettings): Promise<RiskSettings>;
  updateRiskSettings(id: number, updates: Partial<RiskSettings>): Promise<RiskSettings | undefined>;
  
  // XGBoost Tuning Run methods
  createXgboostTuningRun(data: InsertXgboostTuningRun): Promise<XgboostTuningRun>;
  getXgboostTuningRun(id: number): Promise<XgboostTuningRun | undefined>;
  getAllXgboostTuningRuns(limit?: number): Promise<XgboostTuningRun[]>;
  getXgboostTuningRunsBySymbol(symbol: string): Promise<XgboostTuningRun[]>;
  updateXgboostTuningRun(id: number, updates: Partial<XgboostTuningRun>): Promise<XgboostTuningRun | undefined>;
  
  // Market Condition methods
  createMarketCondition(data: InsertMarketCondition): Promise<MarketCondition>;
  getMarketCondition(id: number): Promise<MarketCondition | undefined>;
  getMarketConditionsBySymbol(symbol: string, timeframe: string, limit?: number): Promise<MarketCondition[]>;
  getLatestMarketCondition(symbol: string, timeframe: string): Promise<MarketCondition | undefined>;
  
  // ML Model Performance methods
  createMlModelPerformance(data: InsertMlModelPerformance): Promise<MlModelPerformance>;
  getMlModelPerformance(id: number): Promise<MlModelPerformance | undefined>;
  getMlModelPerformanceByModelId(modelId: string): Promise<MlModelPerformance | undefined>;
  getMlModelPerformanceBySymbol(symbol: string): Promise<MlModelPerformance[]>;
  getAllMlModelPerformance(limit?: number): Promise<MlModelPerformance[]>;
  getTopPerformingModels(limit?: number): Promise<MlModelPerformance[]>;
  updateMlModelPerformance(id: number, updates: Partial<MlModelPerformance>): Promise<MlModelPerformance | undefined>;
  
  // ML Admin Feedback methods
  createMlAdminFeedback(data: InsertMlAdminFeedback): Promise<MlAdminFeedback>;
  getMlAdminFeedback(id: number): Promise<MlAdminFeedback | undefined>;
  getMlAdminFeedbackByUserId(userId: number): Promise<MlAdminFeedback[]>;
  getMlAdminFeedbackByModelId(modelId: string): Promise<MlAdminFeedback[]>;
  updateMlAdminFeedback(id: number, updates: Partial<MlAdminFeedback>): Promise<MlAdminFeedback | undefined>;
  
  // Strategy Simulation methods
  createStrategySimulation(data: InsertStrategySimulation): Promise<StrategySimulation>;
  getStrategySimulation(id: number): Promise<StrategySimulation | undefined>;
  getAllStrategySimulations(limit?: number): Promise<StrategySimulation[]>;
  getStrategySimulationsBySymbol(symbol: string, timeframe?: string): Promise<StrategySimulation[]>;
  updateStrategySimulation(id: number, updates: Partial<StrategySimulation>): Promise<StrategySimulation | undefined>;
  
  // Market Condition Monitoring and Retraining methods
  createRetrainingEvent(data: InsertRetrainingEvent): Promise<RetrainingEvent>;
  getRetrainingEvents(symbol: string, timeframe: string, limit?: number): Promise<RetrainingEvent[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private bots: Map<number, Bot>;
  private pricingPlans: Map<number, PricingPlan>;
  private payments: Map<number, Payment>;
  private paperTradingAccounts: Map<number, PaperTradingAccount>;
  private paperTradingPositions: Map<number, PaperTradingPosition>;
  private paperTradingTrades: Map<number, PaperTradingTrade>;
  private tradeLogs: Map<number, TradeLog>;
  private riskSettings: Map<number, RiskSettings>;
  private xgboostTuningRuns: Map<number, XgboostTuningRun>;
  private marketConditions: Map<number, MarketCondition>;
  private mlModelPerformance: Map<number, MlModelPerformance>;
  private mlAdminFeedback: Map<number, MlAdminFeedback>;
  private strategySimulations: Map<number, StrategySimulation>;
  
  currentId: number;
  botId: number;
  pricingPlanId: number;
  paymentId: number;
  paperAccountId: number;
  paperPositionId: number;
  riskSettingsId: number;
  paperTradeId: number;
  tradeLogId: number;
  xgboostTuningRunId: number;
  marketConditionId: number;
  mlModelPerformanceId: number;
  mlAdminFeedbackId: number;
  strategySimulationId: number;
  
  // Database status flag (always true for memory storage)
  private isConnected: boolean = true;

  constructor() {
    this.users = new Map();
    this.bots = new Map();
    this.pricingPlans = new Map();
    this.payments = new Map();
    this.paperTradingAccounts = new Map();
    this.paperTradingPositions = new Map();
    this.paperTradingTrades = new Map();
    this.tradeLogs = new Map();
    this.riskSettings = new Map();
    this.xgboostTuningRuns = new Map();
    this.marketConditions = new Map();
    this.mlModelPerformance = new Map();
    this.mlAdminFeedback = new Map();
    this.strategySimulations = new Map();
    
    this.currentId = 1;
    this.botId = 1;
    this.pricingPlanId = 1;
    this.paymentId = 1;
    this.paperAccountId = 1;
    this.paperPositionId = 1;
    this.paperTradeId = 1;
    this.tradeLogId = 1;
    this.riskSettingsId = 1;
    this.xgboostTuningRunId = 1;
    this.marketConditionId = 1;
    this.mlModelPerformanceId = 1;
    this.mlAdminFeedbackId = 1;
    this.strategySimulationId = 1;
    
    // Initialize with sample data
    this.initializeData();
  }

  /**
   * Connect to the database
   * For memory storage, this is a no-op that always succeeds
   */
  async connect(): Promise<boolean> {
    // Memory storage is always connected
    this.isConnected = true;
    return true;
  }
  
  /**
   * Get the database instance
   * For memory storage, this returns null since there's no actual database
   */
  getDb(): any {
    return null;
  }

  /**
   * Check database status
   * For memory storage, this always returns connected as true
   */
  async checkDatabaseStatus(): Promise<{
    connected: boolean;
    isSimulated?: boolean;
    description?: string;
    error?: string | null;
  }> {
    return {
      connected: this.isConnected,
      isSimulated: true,
      description: 'Using in-memory storage (simulation mode)',
      error: null
    };
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
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null,
      
      // Default broker settings
      defaultBroker: "binance",
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
      password: process.env.PASSWORD || "", // Simple password for testing purposes
      googleId: null,
      appleId: null,
      profilePicture: null,
      createdAt: new Date(),
      
      // Add Binance API keys
      binanceApiKey: process.env.BINANCE_API_KEY || "binance-test-api-key", 
      binanceSecretKey: process.env.BINANCE_SECRET_KEY || "binance-test-secret-key",
      binanceAllowedIp: null,
      
      // Always use testnet for safety
      defaultBroker: "binance",
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
      email: adminUser.email,
      hasApiKey: !!adminUser.binanceApiKey,
      hasSecretKey: !!adminUser.binanceSecretKey
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
    
    // Create default risk settings for users
    const defaultUserRiskSettings: RiskSettings = {
      id: this.riskSettingsId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 1, // Default user ID
      
      // Default user - balanced risk profile
      globalStopLoss: "0",
      globalTakeProfit: "0",
      maxPositionSize: "10", // 10% position size
      maxPortfolioRisk: "20", // 20% portfolio risk
      riskMode: "balanced",
      defaultStopLossPercent: "2.0", // 2% stop loss
      defaultTakeProfitPercent: "4.0", // 4% take profit
      autoAdjustRisk: true,
      riskAdjustmentFactor: "1.0",
      enableRiskAutoClose: true
    };
    
    const adminUserRiskSettings: RiskSettings = {
      id: this.riskSettingsId++,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: 2, // Admin user ID
      
      // Admin user - aggressive risk profile for testing
      globalStopLoss: "0",
      globalTakeProfit: "0",
      maxPositionSize: "15", // 15% position size
      maxPortfolioRisk: "30", // 30% portfolio risk
      riskMode: "aggressive",
      defaultStopLossPercent: "3.0", // 3% stop loss
      defaultTakeProfitPercent: "9.0", // 9% take profit
      autoAdjustRisk: true,
      riskAdjustmentFactor: "1.25", // Higher adjustment factor
      enableRiskAutoClose: true
    };
    
    // Save risk settings
    this.riskSettings.set(defaultUserRiskSettings.id, defaultUserRiskSettings);
    this.riskSettings.set(adminUserRiskSettings.id, adminUserRiskSettings);
    
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
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null,
      
      // Default broker settings
      defaultBroker: insertUser.defaultBroker || "binance",
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
    
    // Add API keys if provided - with encryption
    
    if (insertUser.binanceApiKey) {
      const cleanedApiKey = insertUser.binanceApiKey.trim();
      // Encrypt API key before storing
      user.binanceApiKey = encrypt(cleanedApiKey);
      console.log(`Encrypted Binance API key during user creation, length: ${user.binanceApiKey.length}`);
    }
    
    if (insertUser.binanceSecretKey) {
      const cleanedSecretKey = insertUser.binanceSecretKey.trim();
      // Encrypt Secret key before storing
      user.binanceSecretKey = encrypt(cleanedSecretKey);
      console.log(`Encrypted Binance Secret key during user creation, length: ${user.binanceSecretKey.length}`);
    }
    
    if (insertUser.binanceAllowedIp) {
      // No need to encrypt IP address
      user.binanceAllowedIp = insertUser.binanceAllowedIp.trim();
    }
    
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    
    if (!existingUser) {
      return undefined;
    }
    
    // Check if any API keys are being updated, and encrypt them if needed
    const processedUpdates = { ...updates };
    

    
    // Encrypt Binance API keys if provided
    if (updates.binanceApiKey !== undefined && updates.binanceApiKey !== null) {
      const cleanedApiKey = updates.binanceApiKey.trim();
      if (cleanedApiKey) {
        processedUpdates.binanceApiKey = encrypt(cleanedApiKey);
        console.log(`Encrypted Binance API key in updateUser, length: ${processedUpdates.binanceApiKey.length}`);
      }
    }
    
    if (updates.binanceSecretKey !== undefined && updates.binanceSecretKey !== null) {
      const cleanedSecretKey = updates.binanceSecretKey.trim();
      if (cleanedSecretKey) {
        processedUpdates.binanceSecretKey = encrypt(cleanedSecretKey);
        console.log(`Encrypted Binance Secret key in updateUser, length: ${processedUpdates.binanceSecretKey.length}`);
      }
    }
    
    // Create updated user by merging existing user with processed updates
    const updatedUser: User = {
      ...existingUser,
      ...processedUpdates
    };
    
    // Save the updated user
    this.users.set(id, updatedUser);
    
    return updatedUser;
  }
  
  // New API key related methods
  async updateUserApiKeys(
    userId: number,
    apiKeys: {
      binanceApiKey?: string;
      binanceSecretKey?: string;
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
    console.log("  Received API key type:", typeof apiKeys.binanceApiKey);
    console.log("  Received API key undefined check:", apiKeys.binanceApiKey === undefined);
    console.log("  Received API key empty string check:", apiKeys.binanceApiKey === "");
    console.log("  Received API key length:", apiKeys.binanceApiKey ? apiKeys.binanceApiKey.length : "N/A");

    // Handle the special cases for empty strings or strings with only whitespace to convert them to null
    // This makes the API behavior more consistent across the app
    const sanitizedBinanceApiKey = !apiKeys.binanceApiKey || apiKeys.binanceApiKey.trim() === "" ? null : apiKeys.binanceApiKey.trim();
    const sanitizedBinanceSecretKey = !apiKeys.binanceSecretKey || apiKeys.binanceSecretKey.trim() === "" ? null : apiKeys.binanceSecretKey.trim();
    
    // Encrypt API keys if they exist
    const encryptedApiKey = sanitizedBinanceApiKey ? encrypt(sanitizedBinanceApiKey) : null;
    const encryptedSecretKey = sanitizedBinanceSecretKey ? encrypt(sanitizedBinanceSecretKey) : null;
    
    if (encryptedApiKey) {
      console.log(`  Encrypted Binance API key, original length: ${sanitizedBinanceApiKey!.length}, encrypted length: ${encryptedApiKey.length}`);
    }
    
    if (encryptedSecretKey) {
      console.log(`  Encrypted Binance Secret key, original length: ${sanitizedBinanceSecretKey!.length}, encrypted length: ${encryptedSecretKey.length}`);
    }
    
    // Update the API keys
    const updatedUser: User = {
      ...user,
      // Only update if value is not undefined (explicitly provided)
      // This preserves previous values if a field wasn't specified
      binanceApiKey: sanitizedBinanceApiKey !== undefined ? encryptedApiKey : user.binanceApiKey,
      binanceSecretKey: sanitizedBinanceSecretKey !== undefined ? encryptedSecretKey : user.binanceSecretKey,
      defaultBroker: 'binance', // Always use Binance
      useTestnet: apiKeys.useTestnet !== undefined ? !!apiKeys.useTestnet : (user.useTestnet === null || user.useTestnet === undefined ? true : !!user.useTestnet)
    };
    
    console.log("updateUserApiKeys - User values after update:", {
      hasApiKey: !!updatedUser.binanceApiKey,
      hasSecretKey: !!updatedUser.binanceSecretKey,
      defaultBroker: updatedUser.defaultBroker,
      useTestnet: updatedUser.useTestnet
    });
    
    // Save the updated user
    this.users.set(userId, updatedUser);
    
    return updatedUser;
  }
  
  async getUserApiKeys(userId: number): Promise<{
    binanceApiKey: string | null;
    binanceSecretKey: string | null;
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
    console.log("  API key type:", typeof user.binanceApiKey);
    console.log("  API key null check:", user.binanceApiKey === null);
    console.log("  API key undefined check:", user.binanceApiKey === undefined);
    console.log("  API key empty string check:", user.binanceApiKey === "");
    console.log("  API key length:", user.binanceApiKey ? user.binanceApiKey.length : "N/A");
    
    // Check if the values are encrypted and decrypt if necessary
    let apiKey = user.binanceApiKey;
    let secretKey = user.binanceSecretKey;
    
    // Decrypt API key if it's encrypted
    if (apiKey && isEncrypted(apiKey)) {
      try {
        apiKey = decrypt(apiKey);
        console.log(`  Decrypted Binance API key, new length: ${apiKey.length}`);
      } catch (error) {
        console.error("Error decrypting Binance API key:", error);
      }
    }
    if (secretKey && isEncrypted(secretKey)) {
      try {
        secretKey = decrypt(secretKey);
        console.log(`  Decrypted Binance Secret key, new length: ${secretKey.length}`);
      } catch (error) {
        console.error("Error decrypting Binance Secret key:", error);
      }
    }
    
    // Create response object
    const apiKeyResponse = {
      // This ensures consistent return types and makes client-side checks more reliable
      binanceApiKey: !apiKey || (typeof apiKey === 'string' && apiKey.trim() === '') ? null : apiKey,
      binanceSecretKey: !secretKey || (typeof secretKey === 'string' && secretKey.trim() === '') ? null : secretKey,
      defaultBroker: 'binance', // Always binance
      // Make sure we always return a boolean, never null or undefined
      useTestnet: user.useTestnet === null || user.useTestnet === undefined ? true : !!user.useTestnet
    };
    
    // Log what we're returning (excluding secret values) for debugging
    console.log("getUserApiKeys return value:", {
      hasApiKey: !!apiKeyResponse.binanceApiKey,
      hasSecretKey: !!apiKeyResponse.binanceSecretKey,
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
    const sanitizedBinanceApiKey = (!cleanedApiKey || cleanedApiKey === "") ? null : cleanedApiKey;
    const sanitizedBinanceSecretKey = (!cleanedSecretKey || cleanedSecretKey === "") ? null : cleanedSecretKey;
    const sanitizedBinanceAllowedIp = (!cleanedAllowedIp || cleanedAllowedIp === "") ? null : cleanedAllowedIp;
    
    console.log(`Final sanitized API key: ${sanitizedBinanceApiKey ? (typeof sanitizedBinanceApiKey) : 'null'}, length: ${sanitizedBinanceApiKey ? sanitizedBinanceApiKey.length : 0}`);
    console.log(`Final sanitized Secret key: ${sanitizedBinanceSecretKey ? (typeof sanitizedBinanceSecretKey) : 'null'}, length: ${sanitizedBinanceSecretKey ? sanitizedBinanceSecretKey.length : 0}`);
    
    // Encrypt API keys before storing them
    const encryptedApiKey = sanitizedBinanceApiKey ? encrypt(sanitizedBinanceApiKey) : null;
    const encryptedSecretKey = sanitizedBinanceSecretKey ? encrypt(sanitizedBinanceSecretKey) : null;
    
    // Update the API keys - Fix for the bug where keys are not properly saved
    const updatedUser: User = {
      ...user
    };
    
    // Only update the keys if they are provided and not undefined
    if (encryptedApiKey !== undefined) {
      updatedUser.binanceApiKey = encryptedApiKey;
      console.log(`Stored encrypted API key, length: ${encryptedApiKey ? encryptedApiKey.length : 0}`);
    }
    
    if (encryptedSecretKey !== undefined) {
      updatedUser.binanceSecretKey = encryptedSecretKey;
      console.log(`Stored encrypted Secret key, length: ${encryptedSecretKey ? encryptedSecretKey.length : 0}`);
    }
    
    if (sanitizedBinanceAllowedIp !== undefined) {
      updatedUser.binanceAllowedIp = sanitizedBinanceAllowedIp; // No need to encrypt IPs
    }
    
    console.log("updateUserBinanceApiKeys - User values after update:", {
      hasBinanceApiKey: !!updatedUser.binanceApiKey,
      binanceApiKeyLength: updatedUser.binanceApiKey ? updatedUser.binanceApiKey.length : 0,
      hasBinanceSecretKey: !!updatedUser.binanceSecretKey,
      binanceSecretKeyLength: updatedUser.binanceSecretKey ? updatedUser.binanceSecretKey.length : 0
    });
    
    // Save the updated user to in-memory storage first
    this.users.set(userId, updatedUser);
    
    // OPTIONALLY: Try to save the API keys to MongoDB for better persistence
    // But do it in a way that won't affect the primary in-memory storage
    // We're using a separate try/catch block with setTimeout to make sure any errors
    // don't affect the main API key saving flow
    if (sanitizedBinanceApiKey && sanitizedBinanceSecretKey) {
      setTimeout(() => {
        try {
          console.log(`Attempting to save Binance API keys to MongoDB for user ${userId} (background process)`);
          
          // Use dynamic import with explicit error handling
          import('./storage/mongodb')
            .then(({ saveBinanceApiKeysToMongoDB }) => {
              return saveBinanceApiKeysToMongoDB(userId, sanitizedBinanceApiKey, sanitizedBinanceSecretKey);
            })
            .then(() => {
              console.log(`Successfully saved Binance API keys to MongoDB for user ${userId}`);
            })
            .catch(error => {
              console.log(`MongoDB saving skipped for user ${userId} - this is normal and won't affect functionality`);
              // Don't log the full error as this is an optional feature
            });
        } catch (error) {
          // Completely suppress any errors here - MongoDB is optional
          console.log('MongoDB integration skipped - using in-memory storage only');
        }
      }, 100); // Small delay to ensure primary save completes first
      
      console.log(`Scheduled background MongoDB save for Binance API keys (optional)`);
    }
    
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
    
    // Check if the values are encrypted and decrypt if necessary
    let apiKey = user.binanceApiKey;
    let secretKey = user.binanceSecretKey;
    let decryptionFailed = false;
    
    // Decrypt API key if it's encrypted
    if (apiKey && isEncrypted(apiKey)) {
      try {
        const decryptedApiKey = decrypt(apiKey);
        console.log(`  Decrypted API key, new length: ${decryptedApiKey.length}`);
        
        // Verify basic format validity for a Binance API key (alphanumeric and typical length)
        // Binance API keys are typically 64 characters long
        if (/^[a-zA-Z0-9]{10,}$/.test(decryptedApiKey) && decryptedApiKey.length >= 10) {
          apiKey = decryptedApiKey;
        } else {
          console.warn(`  WARNING: Decrypted API key appears to be invalid (length=${decryptedApiKey.length})`);
          console.warn(`  This may indicate encryption keys have changed between server restarts`);
          decryptionFailed = true;
          apiKey = null;
        }
      } catch (error) {
        console.error("Error decrypting API key:", error);
      }
    }
    if (secretKey && isEncrypted(secretKey)) {
      try {
        const decryptedSecretKey = decrypt(secretKey);
        console.log(`  Decrypted Secret key, new length: ${decryptedSecretKey.length}`);
        
        // Verify basic format validity for a Binance Secret key (alphanumeric and typical length)
        // Binance Secret keys are typically 64 characters long
        if (/^[a-zA-Z0-9]{10,}$/.test(decryptedSecretKey) && decryptedSecretKey.length >= 10) {
          secretKey = decryptedSecretKey;
        } else {
          console.warn(`  WARNING: Decrypted Secret key appears to be invalid (length=${decryptedSecretKey.length})`);
          console.warn(`  This may indicate encryption keys have changed between server restarts`);
          decryptionFailed = true;
          secretKey = null;
        }
      } catch (error) {
        console.error("Error decrypting Secret key:", error);
        console.warn("=== ENCRYPTION KEY MISMATCH DETECTED ===");
        console.warn("The server's encryption keys have changed since the API keys were stored.");
        console.warn("To fix this:");
        console.warn("1. Set ENCRYPTION_KEY and ENCRYPTION_IV as permanent environment variables");
        console.warn("2. Users will need to re-enter their API keys");
        console.warn("===========================================");
      
      }
      
      // If decryption failed, try to get the keys from MongoDB
      console.log("Attempting to get Binance API keys from MongoDB after failed decryption...");
      try {
        // Import the MongoDB integration dynamically
        const { getBinanceApiKeysFromMongoDB } = await import('./storage/mongodb');
        
        // Try to get keys from MongoDB
        const mongoDBKeys = await getBinanceApiKeysFromMongoDB(userId);
        
        if (mongoDBKeys && mongoDBKeys.apiKey && mongoDBKeys.secretKey) {
          console.log("Successfully retrieved Binance API keys from MongoDB backup");
          apiKey = mongoDBKeys.apiKey;
          secretKey = mongoDBKeys.secretKey;
          decryptionFailed = false;
        } else {
          console.log("Could not find Binance API keys in MongoDB backup");
        }
      } catch (error) {
        console.error("Error trying to get Binance API keys from MongoDB:", error);
      }
    }
    
    // If the primary storage doesn't have keys but MongoDB might, try to get them
    if ((!apiKey || !secretKey) && (!decryptionFailed)) {
      console.log("Primary storage missing Binance API keys, trying MongoDB backup...");
      try {
        // Import the MongoDB integration dynamically
        const { getBinanceApiKeysFromMongoDB } = await import('./storage/mongodb');
        
        // Try to get keys from MongoDB
        const mongoDBKeys = await getBinanceApiKeysFromMongoDB(userId);
        
        if (mongoDBKeys && mongoDBKeys.apiKey && mongoDBKeys.secretKey) {
          console.log("Successfully retrieved Binance API keys from MongoDB backup");
          apiKey = mongoDBKeys.apiKey;
          secretKey = mongoDBKeys.secretKey;
          
          // Update primary storage with keys from MongoDB for future use
          this.updateUserBinanceApiKeys(userId, {
            binanceApiKey: apiKey,
            binanceSecretKey: secretKey,
            binanceAllowedIp: user.binanceAllowedIp
          }).then(() => {
            console.log("Updated primary storage with keys from MongoDB backup");
          }).catch(error => {
            console.error("Failed to update primary storage with keys from MongoDB:", error);
          });
        } else {
          console.log("Could not find Binance API keys in MongoDB backup");
        }
      } catch (error) {
        console.error("Error trying to get Binance API keys from MongoDB:", error);
      }
    }
    
    // Additional cleaning on retrieval too - completely remove all whitespace (inside and outside)
    let cleanedApiKey = apiKey;
    let cleanedSecretKey = secretKey;
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
    
    // Clear all Binance API keys
    const updatedUser: User = {
      ...user,
      binanceApiKey: null,
      binanceSecretKey: null,
      binanceAllowedIp: null
    };
    
    // Save the updated user
    this.users.set(userId, updatedUser);
    console.log(`API keys cleared successfully for user ID ${userId}`);
    
    // Also clear the Binance API keys from MongoDB
    try {
      // Import the MongoDB integration dynamically
      const { deleteBinanceApiKeysFromMongoDB } = await import('./storage/mongodb');
      
      // Attempt to delete from MongoDB
      deleteBinanceApiKeysFromMongoDB(userId)
        .then(() => {
          console.log(`Successfully deleted Binance API keys from MongoDB for user ${userId}`);
        })
        .catch(error => {
          console.error(`Error deleting Binance API keys from MongoDB for user ${userId}:`, error);
        });
      
      console.log(`Initiated deletion of Binance API keys from MongoDB for user ${userId}`);
    } catch (error) {
      // Don't let MongoDB errors affect the primary storage mechanism
      console.error(`Error setting up MongoDB delete for Binance API keys:`, error);
    }
    
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
  
  // Additional bot methods for our new trading bot system
  
  /**
   * Get active bots (bots that are enabled)
   */
  async getActiveBots(): Promise<Bot[]> {
    return Array.from(this.bots.values()).filter(bot => bot.isRunning);
  }
  
  /**
   * Trading bot trades
   */
  private botTradeId: number = 1;
  private botTrades: Map<number, BotTrade> = new Map();
  
  /**
   * Create a bot trade record
   */
  async createBotTrade(trade: InsertBotTrade): Promise<number> {
    const id = this.botTradeId++;
    
    const newTrade: BotTrade = {
      id,
      botId: trade.botId,
      userId: trade.userId,
      symbol: trade.symbol,
      side: trade.side,
      type: trade.type,
      price: trade.price,
      amount: trade.amount,
      status: trade.status,
      orderId: trade.orderId || null,
      fee: trade.fee || null,
      feeCurrency: trade.feeCurrency || null,
      isTest: trade.isTest || false,
      metadata: trade.metadata || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Update bot's total trades count
    const bot = this.bots.get(trade.botId);
    if (bot) {
      const updatedBot: Bot = {
        ...bot,
        totalTrades: bot.totalTrades + 1
      };
      this.bots.set(trade.botId, updatedBot);
    }
    
    this.botTrades.set(id, newTrade);
    return id;
  }
  
  /**
   * Get all trades for a bot
   */
  async getBotTrades(botId: number): Promise<BotTrade[]> {
    return Array.from(this.botTrades.values())
      .filter(trade => trade.botId === botId)
      .sort((a, b) => {
        // Sort by createdAt (newest first)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  /**
   * Get a specific trade
   */
  async getBotTrade(id: number): Promise<BotTrade | undefined> {
    return this.botTrades.get(id);
  }
  
  /**
   * Get all trades for a user
   */
  async getUserBotTrades(userId: number): Promise<BotTrade[]> {
    return Array.from(this.botTrades.values())
      .filter(trade => trade.userId === userId)
      .sort((a, b) => {
        // Sort by createdAt (newest first)
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
  }
  
  /**
   * Update a trade
   */
  async updateBotTrade(id: number, updates: Partial<BotTrade>): Promise<BotTrade | undefined> {
    const existingTrade = this.botTrades.get(id);
    
    if (!existingTrade) {
      return undefined;
    }
    
    const updatedTrade: BotTrade = {
      ...existingTrade,
      ...updates,
      updatedAt: new Date()
    };
    
    this.botTrades.set(id, updatedTrade);
    return updatedTrade;
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
    
    // Special handling for metadata to ensure it's properly updated
    let updatedMetadata = position.metadata;
    if (updates.metadata !== undefined) {
      if (typeof updates.metadata === 'string') {
        try {
          // If it's a string, try to parse it as JSON
          const metadataObj = JSON.parse(updates.metadata);
          
          // If original metadata was also JSON, merge them
          if (position.metadata && typeof position.metadata === 'string') {
            try {
              const originalMetadata = JSON.parse(position.metadata);
              updatedMetadata = JSON.stringify({
                ...originalMetadata,
                ...metadataObj
              });
            } catch (e) {
              // If the original metadata wasn't valid JSON, just use the new one
              updatedMetadata = updates.metadata;
            }
          } else {
            // If the original metadata wasn't a string, use the new one
            updatedMetadata = updates.metadata;
          }
        } catch (e) {
          // If parsing fails, just use the string as is
          updatedMetadata = updates.metadata;
        }
      } else {
        // If the new metadata isn't a string, convert it to JSON
        updatedMetadata = typeof updates.metadata === 'object' ? 
          JSON.stringify(updates.metadata) : 
          updates.metadata;
      }
    }
    
    const updatedPosition: PaperTradingPosition = {
      ...position,
      ...updates,
      metadata: updatedMetadata,
      currentProfitLoss,
      currentProfitLossPercent,
      updatedAt: new Date()
    };
    
    // Log update details for debugging
    console.log(`Updating position ${id}:`, {
      originalMetadata: position.metadata,
      updatesMetadata: updates.metadata,
      finalMetadata: updatedPosition.metadata
    });
    
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

  //
  // Trade Logging methods implementation
  //
  
  /**
   * Creates a new trade log entry
   */
  async createTradeLog(tradeLog: InsertTradeLog): Promise<TradeLog> {
    const id = this.tradeLogId++;
    
    const newTradeLog: TradeLog = {
      id,
      timestamp: tradeLog.timestamp || new Date(),
      symbol: tradeLog.symbol,
      action: tradeLog.action,
      entry_price: tradeLog.entry_price,
      quantity: tradeLog.quantity,
      predicted_confidence: tradeLog.predicted_confidence || null,
      trade_source: tradeLog.trade_source,
      status: tradeLog.status,
      reason: tradeLog.reason || null,
      user_id: tradeLog.user_id || null,
      exit_price: tradeLog.exit_price || null,
      target_price: tradeLog.target_price || null,
      stop_loss: tradeLog.stop_loss || null,
      take_profit: tradeLog.take_profit || null,
      profit_loss: tradeLog.profit_loss || null,
      profit_loss_percent: tradeLog.profit_loss_percent || null,
      execution_time: tradeLog.execution_time || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    // Store the trade log
    this.tradeLogs.set(id, newTradeLog);
    
    return newTradeLog;
  }
  
  /**
   * Get a specific trade log by ID
   */
  async getTradeLog(id: number): Promise<TradeLog | undefined> {
    return this.tradeLogs.get(id);
  }
  
  async getAllTradeLogs(limit: number = 100): Promise<TradeLog[]> {
    const tradeLogs = Array.from(this.tradeLogs.values());
    // Sort by created date, most recent first
    tradeLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    // Apply limit
    return tradeLogs.slice(0, limit);
  }
  
  /**
   * Get all trade logs for a specific symbol
   */
  async getTradeLogsBySymbol(symbol: string, limit: number = 100): Promise<TradeLog[]> {
    const logs = Array.from(this.tradeLogs.values())
      .filter(log => log.symbol === symbol)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp descending
    
    return logs.slice(0, limit);
  }
  
  /**
   * Get all trade logs for a specific user
   */
  async getTradeLogsByUserId(userId: number, limit: number = 100): Promise<TradeLog[]> {
    const logs = Array.from(this.tradeLogs.values())
      .filter(log => log.user_id === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp descending
    
    return logs.slice(0, limit);
  }
  
  /**
   * Get all trade logs from a specific source
   */
  async getTradeLogsBySource(source: string, limit: number = 100): Promise<TradeLog[]> {
    const logs = Array.from(this.tradeLogs.values())
      .filter(log => log.trade_source === source)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()); // Sort by timestamp descending
    
    return logs.slice(0, limit);
  }
  
  /**
   * Update a trade log
   */
  async updateTradeLog(id: number, updates: Partial<TradeLog>): Promise<TradeLog | undefined> {
    const existingLog = this.tradeLogs.get(id);
    
    if (!existingLog) {
      return undefined;
    }
    
    const updatedLog: TradeLog = {
      ...existingLog,
      ...updates,
      updated_at: new Date() // Always update the timestamp
    };
    
    this.tradeLogs.set(id, updatedLog);
    
    return updatedLog;
  }
  
  /**
   * Search trade logs with filter criteria
   */
  async searchTradeLogs(filter: {
    symbol?: string;
    action?: string;
    source?: string;
    status?: string;
    fromDate?: Date;
    toDate?: Date;
    userId?: number;
  }, limit: number = 100): Promise<TradeLog[]> {
    let logs = Array.from(this.tradeLogs.values());
    
    // Apply filters
    if (filter.symbol) {
      logs = logs.filter(log => log.symbol === filter.symbol);
    }
    
    if (filter.action) {
      logs = logs.filter(log => log.action === filter.action);
    }
    
    if (filter.source) {
      logs = logs.filter(log => log.trade_source === filter.source);
    }
    
    if (filter.status) {
      logs = logs.filter(log => log.status === filter.status);
    }
    
    if (filter.userId) {
      logs = logs.filter(log => log.user_id === filter.userId);
    }
    
    if (filter.fromDate) {
      logs = logs.filter(log => log.timestamp >= filter.fromDate);
    }
    
    if (filter.toDate) {
      logs = logs.filter(log => log.timestamp <= filter.toDate);
    }
    
    // Sort by timestamp descending
    logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    return logs.slice(0, limit);
  }
  
  /**
   * Get risk settings by ID
   */
  async getRiskSettings(id: number): Promise<RiskSettings | undefined> {
    return this.riskSettings.get(id);
  }
  
  /**
   * Get risk settings by user ID
   */
  async getRiskSettingsByUserId(userId: number): Promise<RiskSettings | undefined> {
    return Array.from(this.riskSettings.values()).find(
      (settings) => settings.userId === userId,
    );
  }
  
  /**
   * Create risk settings for a user
   */
  async createRiskSettings(settings: InsertRiskSettings): Promise<RiskSettings> {
    const id = this.riskSettingsId++;
    
    const riskSettings: RiskSettings = {
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: settings.userId,
      
      // Set provided values or defaults
      globalStopLoss: settings.globalStopLoss || "0",
      globalTakeProfit: settings.globalTakeProfit || "0",
      maxPositionSize: settings.maxPositionSize || "10", // Default 10%
      maxPortfolioRisk: settings.maxPortfolioRisk || "20", // Default 20%
      riskMode: settings.riskMode || "balanced",
      defaultStopLossPercent: settings.defaultStopLossPercent || "2.0", // Default 2%
      defaultTakeProfitPercent: settings.defaultTakeProfitPercent || "4.0", // Default 4%
      autoAdjustRisk: settings.autoAdjustRisk !== undefined ? settings.autoAdjustRisk : true,
      riskAdjustmentFactor: settings.riskAdjustmentFactor || "1.0", // Default factor of 1.0
      enableRiskAutoClose: settings.enableRiskAutoClose !== undefined ? settings.enableRiskAutoClose : true,
    };
    
    this.riskSettings.set(id, riskSettings);
    console.log(`Created risk settings for user ${settings.userId} with ID ${id}`);
    return riskSettings;
  }
  
  /**
   * Update risk settings
   */
  async updateRiskSettings(id: number, updates: Partial<RiskSettings>): Promise<RiskSettings | undefined> {
    const existingSettings = this.riskSettings.get(id);
    
    if (!existingSettings) {
      console.log(`Risk settings with ID ${id} not found`);
      return undefined;
    }
    
    const updatedSettings: RiskSettings = {
      ...existingSettings,
      ...updates,
      updatedAt: new Date(),
    };
    
    this.riskSettings.set(id, updatedSettings);
    console.log(`Updated risk settings ID ${id} for user ${existingSettings.userId}`);
    return updatedSettings;
  }
  
  // XGBoost Tuning Run methods
  async createXgboostTuningRun(data: InsertXgboostTuningRun): Promise<XgboostTuningRun> {
    const id = this.xgboostTuningRunId++;
    const now = new Date();
    
    const tuningRun: XgboostTuningRun = {
      id,
      ...data,
      startedAt: data.startedAt || now,
      completedAt: data.completedAt || null,
      createdAt: now,
      updatedAt: now
    };
    
    this.xgboostTuningRuns.set(id, tuningRun);
    console.log(`Created XGBoost tuning run ID ${id} for symbol ${data.symbol}`);
    return tuningRun;
  }
  
  async getXgboostTuningRun(id: number): Promise<XgboostTuningRun | undefined> {
    return this.xgboostTuningRuns.get(id);
  }
  
  async getAllXgboostTuningRuns(limit?: number): Promise<XgboostTuningRun[]> {
    const runs = Array.from(this.xgboostTuningRuns.values())
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    
    return limit ? runs.slice(0, limit) : runs;
  }
  
  async getXgboostTuningRunsBySymbol(symbol: string): Promise<XgboostTuningRun[]> {
    return Array.from(this.xgboostTuningRuns.values())
      .filter(run => run.symbol === symbol)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }
  
  async updateXgboostTuningRun(id: number, updates: Partial<XgboostTuningRun>): Promise<XgboostTuningRun | undefined> {
    const existingRun = this.xgboostTuningRuns.get(id);
    
    if (!existingRun) {
      console.log(`XGBoost tuning run with ID ${id} not found`);
      return undefined;
    }
    
    const updatedRun: XgboostTuningRun = {
      ...existingRun,
      ...updates,
      updatedAt: new Date()
    };
    
    this.xgboostTuningRuns.set(id, updatedRun);
    console.log(`Updated XGBoost tuning run ID ${id}`);
    return updatedRun;
  }
  
  // Market Condition methods
  async createMarketCondition(data: InsertMarketCondition): Promise<MarketCondition> {
    const id = this.marketConditionId++;
    const now = new Date();
    
    const marketCondition: MarketCondition = {
      id,
      ...data,
      timestamp: data.timestamp || now,
      createdAt: now
    };
    
    this.marketConditions.set(id, marketCondition);
    console.log(`Created market condition ID ${id} for ${data.symbol} ${data.timeframe}`);
    return marketCondition;
  }
  
  async getMarketCondition(id: number): Promise<MarketCondition | undefined> {
    return this.marketConditions.get(id);
  }
  
  async getMarketConditionsBySymbol(symbol: string, timeframe: string, limit?: number): Promise<MarketCondition[]> {
    const conditions = Array.from(this.marketConditions.values())
      .filter(condition => condition.symbol === symbol && condition.timeframe === timeframe)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? conditions.slice(0, limit) : conditions;
  }
  
  async getLatestMarketCondition(symbol: string, timeframe: string): Promise<MarketCondition | undefined> {
    const conditions = await this.getMarketConditionsBySymbol(symbol, timeframe, 1);
    return conditions.length > 0 ? conditions[0] : undefined;
  }
  
  // ML Model Performance methods
  async createMlModelPerformance(data: InsertMlModelPerformance): Promise<MlModelPerformance> {
    const id = this.mlModelPerformanceId++;
    const now = new Date();
    
    const modelPerformance: MlModelPerformance = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    this.mlModelPerformance.set(id, modelPerformance);
    console.log(`Created ML model performance record ID ${id} for model ${data.modelId}`);
    return modelPerformance;
  }
  
  async getMlModelPerformance(id: number): Promise<MlModelPerformance | undefined> {
    return this.mlModelPerformance.get(id);
  }
  
  async getMlModelPerformanceByModelId(modelId: string): Promise<MlModelPerformance | undefined> {
    return Array.from(this.mlModelPerformance.values())
      .find(performance => performance.modelId === modelId);
  }
  
  async getMlModelPerformanceBySymbol(symbol: string): Promise<MlModelPerformance[]> {
    const normalizedSymbol = symbol.replace('/', '').toLowerCase();
    return Array.from(this.mlModelPerformance.values())
      .filter(performance => performance.symbol.toLowerCase() === normalizedSymbol)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getAllMlModelPerformance(limit?: number): Promise<MlModelPerformance[]> {
    const performances = Array.from(this.mlModelPerformance.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? performances.slice(0, limit) : performances;
  }
  
  async getTopPerformingModels(limit: number = 5): Promise<MlModelPerformance[]> {
    return Array.from(this.mlModelPerformance.values())
      .sort((a, b) => b.accuracyScore - a.accuracyScore)
      .slice(0, limit);
  }
  
  async updateMlModelPerformance(id: number, updates: Partial<MlModelPerformance>): Promise<MlModelPerformance | undefined> {
    const existingPerformance = this.mlModelPerformance.get(id);
    
    if (!existingPerformance) {
      console.log(`ML model performance record with ID ${id} not found`);
      return undefined;
    }
    
    const updatedPerformance: MlModelPerformance = {
      ...existingPerformance,
      ...updates,
      updatedAt: new Date()
    };
    
    this.mlModelPerformance.set(id, updatedPerformance);
    console.log(`Updated ML model performance record ID ${id}`);
    return updatedPerformance;
  }
  
  // ML Admin Feedback methods
  async createMlAdminFeedback(data: InsertMlAdminFeedback): Promise<MlAdminFeedback> {
    const id = this.mlAdminFeedbackId++;
    const now = new Date();
    
    const feedback: MlAdminFeedback = {
      id,
      ...data,
      createdAt: now,
      implementedAt: data.implementedAt || null
    };
    
    this.mlAdminFeedback.set(id, feedback);
    console.log(`Created ML admin feedback ID ${id} from user ${data.userId}`);
    return feedback;
  }
  
  async getMlAdminFeedback(id: number): Promise<MlAdminFeedback | undefined> {
    return this.mlAdminFeedback.get(id);
  }
  
  async getMlAdminFeedbackByUserId(userId: number): Promise<MlAdminFeedback[]> {
    return Array.from(this.mlAdminFeedback.values())
      .filter(feedback => feedback.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async getMlAdminFeedbackByModelId(modelId: string): Promise<MlAdminFeedback[]> {
    return Array.from(this.mlAdminFeedback.values())
      .filter(feedback => feedback.modelId === modelId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async updateMlAdminFeedback(id: number, updates: Partial<MlAdminFeedback>): Promise<MlAdminFeedback | undefined> {
    const existingFeedback = this.mlAdminFeedback.get(id);
    
    if (!existingFeedback) {
      console.log(`ML admin feedback with ID ${id} not found`);
      return undefined;
    }
    
    const updatedFeedback: MlAdminFeedback = {
      ...existingFeedback,
      ...updates
    };
    
    this.mlAdminFeedback.set(id, updatedFeedback);
    console.log(`Updated ML admin feedback ID ${id}`);
    return updatedFeedback;
  }
  
  // Strategy Simulation methods
  async createStrategySimulation(data: InsertStrategySimulation): Promise<StrategySimulation> {
    const id = this.strategySimulationId++;
    const now = new Date();
    
    const simulation: StrategySimulation = {
      id,
      ...data,
      createdAt: now,
      updatedAt: now
    };
    
    this.strategySimulations.set(id, simulation);
    console.log(`Created strategy simulation ID ${id} for ${data.symbol} with strategy ${data.strategyName}`);
    return simulation;
  }
  
  async getStrategySimulation(id: number): Promise<StrategySimulation | undefined> {
    return this.strategySimulations.get(id);
  }
  
  async getAllStrategySimulations(limit?: number): Promise<StrategySimulation[]> {
    const simulations = Array.from(this.strategySimulations.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? simulations.slice(0, limit) : simulations;
  }
  
  async getStrategySimulationsBySymbol(symbol: string, timeframe?: string): Promise<StrategySimulation[]> {
    let simulations = Array.from(this.strategySimulations.values())
      .filter(simulation => simulation.symbol === symbol);
    
    if (timeframe) {
      simulations = simulations.filter(simulation => simulation.timeframe === timeframe);
    }
    
    return simulations.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  
  async updateStrategySimulation(id: number, updates: Partial<StrategySimulation>): Promise<StrategySimulation | undefined> {
    const existingSimulation = this.strategySimulations.get(id);
    
    if (!existingSimulation) {
      console.log(`Strategy simulation with ID ${id} not found`);
      return undefined;
    }
    
    const updatedSimulation: StrategySimulation = {
      ...existingSimulation,
      ...updates,
      updatedAt: new Date()
    };
    
    this.strategySimulations.set(id, updatedSimulation);
    console.log(`Updated strategy simulation ID ${id}`);
    return updatedSimulation;
  }
  
  // Retraining Events methods
  private retrainingEvents: Map<number, RetrainingEvent> = new Map();
  private retrainingEventId: number = 1;
  
  async createRetrainingEvent(data: InsertRetrainingEvent): Promise<RetrainingEvent> {
    const id = this.retrainingEventId++;
    const now = new Date();
    
    const event: RetrainingEvent = {
      id,
      ...data,
      createdAt: now
    };
    
    this.retrainingEvents.set(id, event);
    console.log(`Created retraining event ID ${id} for ${data.symbol} with method ${data.retrainingMethod}`);
    return event;
  }
  
  async getRetrainingEvents(symbol: string, timeframe: string, limit?: number): Promise<RetrainingEvent[]> {
    let events = Array.from(this.retrainingEvents.values())
      .filter(event => event.symbol === symbol && event.timeframe === timeframe)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? events.slice(0, limit) : events;
  }
}

// Import MongoDB connection test and MongoDB Storage
import { testMongoDBConnection } from './storage/mongodb';
import { MongoDBStorage } from './storage/mongoStorage';

// MongoDB is now the only storage implementation
let mongoConnectionStatus = {
  connected: false,
  isSimulated: false, 
  description: 'Initializing MongoDB connection',
  error: null as string | null
};

// Explicit MongoDB storage - no more fallback to in-memory storage
// Create MongoDB storage as our exclusive storage implementation
const mongoStorage = new MongoDBStorage();
// This is the storage that will be used throughout the application
const selectedStorage: IStorage = mongoStorage;

// Initialize global flag for MongoDB connection state
// This will be used by API endpoints to check connection status
(global as any).mongodbConnected = false;

// Initialize MongoDB connection - the only storage option
(async () => {
  try {
    console.log('Connecting to MongoDB Atlas database...');
    console.log('MongoDB Atlas is required for all data persistence');
    
    // Attempt to connect to MongoDB Atlas
    const connected = await mongoStorage.connect();
    
    if (connected) {
      console.log('✅ Successfully connected to MongoDB Atlas database');
      mongoConnectionStatus = {
        connected: true,
        isSimulated: false,
        description: 'Connected to MongoDB Atlas',
        error: null
      };
      
      // Set global flag to indicate MongoDB is connected - used by status endpoints
      (global as any).mongodbConnected = true;
      
      // Initialize admin user if needed
      try {
        // Check if admin user already exists
        const existingAdmin = await mongoStorage.getUserByUsername('admin');
        if (!existingAdmin) {
          console.log('Admin user not found in MongoDB, creating one...');
          
          // Create admin user
          const adminUser = {
            username: "admin",
            email: "admin@example.com",
            password: process.env.PASSWORD || "", // Simple password for testing
            firstName: "Admin",
            lastName: "User",
            defaultBroker: "binance",
            useTestnet: true,
            binanceApiKey: process.env.BINANCE_API_KEY || "test-api-key", 
            binanceSecretKey: process.env.BINANCE_SECRET_KEY || "test-secret-key",
            okxApiKey: process.env.OKX_API_KEY || "test-api-key",
            okxSecretKey: process.env.OKX_SECRET_KEY || "test-secret-key",
            okxPassphrase: process.env.OKX_PASSPHRASE || "test-passphrase",
            isAdmin: true
          };
          
          const createdAdmin = await mongoStorage.createUser(adminUser);
          console.log('✅ Successfully created admin user in MongoDB:', createdAdmin.id);
        } else {
          console.log('✅ Admin user already exists in MongoDB database');
        }
      } catch (error) {
        console.error('❌ Error initializing admin user in MongoDB:', error);
      }
    } else {
      // Application cannot function without MongoDB connection
      console.error('❌ CRITICAL ERROR: Failed to connect to MongoDB Atlas');
      console.error('The application requires MongoDB Atlas to function');
      console.error('Please check your MongoDB connection settings in .env (MONGO_URI)');
      mongoConnectionStatus = {
        connected: false,
        isSimulated: false,
        description: 'Failed to connect to MongoDB Atlas - application cannot function',
        error: 'Connection failed - check your MongoDB URI'
      };
      
      // Set global flag to indicate MongoDB is NOT connected
      (global as any).mongodbConnected = false;
    }
  } catch (error) {
    // Application cannot function without MongoDB connection
    console.error('❌ CRITICAL ERROR: MongoDB connection error');
    console.error('The application requires MongoDB Atlas to function');
    console.error('Error details:', error);
    mongoConnectionStatus = {
      connected: false,
      isSimulated: false,
      description: 'Error initializing MongoDB connection - application cannot function',
      error: error instanceof Error ? error.message : String(error)
    };
    
    // Set global flag to indicate MongoDB is NOT connected
    (global as any).mongodbConnected = false;
  }
})();

// Export the storage instance - MongoDB is our exclusive storage implementation
export const storage = new Proxy({} as IStorage, {
  get: function(target, prop) {
    // This proxy forwards all method calls to MongoDB storage implementation
    // @ts-ignore
    return selectedStorage[prop];
  }
});
