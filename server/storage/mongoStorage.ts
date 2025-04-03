import { IStorage } from '../storage';
import {
  User, InsertUser, Bot, InsertBot, PricingPlan, InsertPricingPlan,
  Payment, InsertPayment, PaperTradingAccount, InsertPaperTradingAccount,
  PaperTradingPosition, InsertPaperTradingPosition, PaperTradingTrade, InsertPaperTradingTrade
} from '@shared/schema';
import { encrypt, decrypt, isEncrypted } from '../utils/encryption';
import {
  connectToMongoDB, UserModel, BotModel, PricingPlanModel, PaymentModel,
  PaperTradingAccountModel, PaperTradingPositionModel, PaperTradingTradeModel,
  getNextSequence, initializeCounters, convertToUserModel, convertToBotModel
} from '../utils/mongodb';
import MongoStore from 'connect-mongo';
import session from 'express-session';

export class MongoDBStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    // Initialize MongoDB connection
    connectToMongoDB()
      .then(() => {
        console.log('MongoDB connected in Storage class');
        // Initialize counters for auto-increment IDs
        return initializeCounters();
      })
      .then(() => {
        console.log('MongoDB counters initialized');
        // Initialize default data if needed
        return this.initializeData();
      })
      .catch(err => {
        console.error('Error initializing MongoDB storage:', err);
      });

    // Create session store
    this.sessionStore = MongoStore.create({
      mongoUrl: process.env.MONGO_URI || 'mongodb://localhost:27017/crypto-trading-platform',
      collectionName: 'sessions',
      ttl: 14 * 24 * 60 * 60 // 14 days
    });
  }

  /**
   * Check MongoDB database connection status
   * @returns Connection status object
   */
  async checkDatabaseStatus(): Promise<{
    connected: boolean;
    isSimulated?: boolean;
    description?: string;
    error?: string | null;
  }> {
    try {
      // Use the testMongoDBConnection function to check MongoDB connection
      const mongoStatus = await testMongoDBConnection();
      
      // Return the MongoDB connection status
      return {
        connected: mongoStatus.connected,
        isSimulated: false,
        description: mongoStatus.description,
        error: mongoStatus.error
      };
    } catch (error) {
      console.error('Error checking MongoDB connection status:', error);
      return {
        connected: false,
        isSimulated: false,
        description: 'Error checking MongoDB connection status',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async initializeData() {
    // Check if we need to initialize with default users and data
    const usersCount = await UserModel.countDocuments();
    
    if (usersCount === 0) {
      console.log('Initializing default data in MongoDB...');
      
      // Create default user without API keys
      const defaultUser = new UserModel({
        _id: 1,
        username: "default_user",
        email: "kaity.abu.hanna@gmail.com",
        firstName: "Default",
        lastName: "User",
        password: "", // No password needed as we use OAuth
        createdAt: new Date(),
        defaultBroker: "okx",
        useTestnet: true,
        hasPremium: false,
        isAdmin: false
      });
      
      // Create admin user with API keys
      const adminUser = new UserModel({
        _id: 2,
        username: "admin",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        password: "admin123", // Simple password for testing
        createdAt: new Date(),
        okxApiKey: process.env.OKX_API_KEY ? encrypt(process.env.OKX_API_KEY) : null,
        okxSecretKey: process.env.OKX_SECRET_KEY ? encrypt(process.env.OKX_SECRET_KEY) : null,
        okxPassphrase: process.env.OKX_PASSPHRASE ? encrypt(process.env.OKX_PASSPHRASE) : null,
        binanceApiKey: process.env.BINANCE_API_KEY ? encrypt(process.env.BINANCE_API_KEY) : null,
        binanceSecretKey: process.env.BINANCE_SECRET_KEY ? encrypt(process.env.BINANCE_SECRET_KEY) : null,
        defaultBroker: "okx",
        useTestnet: true,
        hasPremium: true,
        premiumExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
        isAdmin: true
      });
      
      console.log('Created admin user with API keys:', {
        username: adminUser.username,
        hasApiKey: !!adminUser.okxApiKey,
        hasSecretKey: !!adminUser.okxSecretKey,
        hasPassphrase: !!adminUser.okxPassphrase
      });
      
      // Save default users
      await defaultUser.save();
      await adminUser.save();
      
      // Sample bots
      const sampleBots = [
        {
          _id: 1,
          name: "Grid Trading Bot",
          strategy: "grid",
          description: "Automatically buys low and sells high within a price range.",
          minInvestment: "500",
          monthlyReturn: "5.2",
          riskLevel: 2,
          rating: "4.5",
          isPopular: true,
          userId: 1,
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
          createdAt: new Date()
        },
        {
          _id: 2,
          name: "DCA Crypto Bot",
          strategy: "dca",
          description: "Dollar-cost averaging strategy for long-term crypto investments.",
          minInvestment: "250",
          monthlyReturn: "3.8",
          riskLevel: 1,
          rating: "4.8",
          isPopular: false,
          userId: 1,
          isRunning: false,
          tradingPair: "ETH-USDT",
          totalInvestment: "500",
          parameters: JSON.stringify({
            symbol: "ETH-USDT",
            initialInvestment: 500,
            interval: "1d",
            investmentAmount: 50
          }),
          createdAt: new Date()
        },
        {
          _id: 3,
          name: "MACD Trend Follower",
          strategy: "macd",
          description: "Technical analysis bot using MACD indicators for optimal entry and exit.",
          minInvestment: "1000",
          monthlyReturn: "7.5",
          riskLevel: 3,
          rating: "4.2",
          isPopular: true,
          userId: 1,
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
          createdAt: new Date()
        }
      ];
      
      // Sample pricing plans
      const samplePlans = [
        {
          _id: 1,
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
          _id: 2,
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
          _id: 3,
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
      
      // Save sample data
      await BotModel.insertMany(sampleBots);
      await PricingPlanModel.insertMany(samplePlans);
      
      console.log('Default data initialized in MongoDB');
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ _id: id });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in getUser:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ username });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in getUserByUsername:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ email });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in getUserByEmail:', error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ googleId });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in getUserByGoogleId:', error);
      return undefined;
    }
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ appleId });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in getUserByAppleId:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      // Get next user ID
      const id = await getNextSequence('userId');
      
      // Create base user object
      const userData: any = {
        _id: id,
        username: insertUser.username,
        email: insertUser.email,
        firstName: insertUser.firstName || '',
        lastName: insertUser.lastName || '',
        password: insertUser.password || '',
        createdAt: new Date(),
        defaultBroker: insertUser.defaultBroker || 'okx',
        useTestnet: insertUser.useTestnet !== undefined ? !!insertUser.useTestnet : true,
        isAdmin: false
      };
      
      // Add optional OAuth fields if provided
      if (insertUser.googleId) {
        userData.googleId = insertUser.googleId;
      }
      
      if (insertUser.appleId) {
        userData.appleId = insertUser.appleId;
      }
      
      if (insertUser.profilePicture) {
        userData.profilePicture = insertUser.profilePicture;
      }
      
      // Add API keys if provided - with encryption
      if (insertUser.okxApiKey) {
        const cleanedApiKey = insertUser.okxApiKey.trim();
        userData.okxApiKey = encrypt(cleanedApiKey);
      }
      
      if (insertUser.okxSecretKey) {
        const cleanedSecretKey = insertUser.okxSecretKey.trim();
        userData.okxSecretKey = encrypt(cleanedSecretKey);
      }
      
      if (insertUser.okxPassphrase) {
        const cleanedPassphrase = insertUser.okxPassphrase.trim();
        userData.okxPassphrase = encrypt(cleanedPassphrase);
      }
      
      if (insertUser.binanceApiKey) {
        const cleanedApiKey = insertUser.binanceApiKey.trim();
        userData.binanceApiKey = encrypt(cleanedApiKey);
      }
      
      if (insertUser.binanceSecretKey) {
        const cleanedSecretKey = insertUser.binanceSecretKey.trim();
        userData.binanceSecretKey = encrypt(cleanedSecretKey);
      }
      
      if (insertUser.binanceAllowedIp) {
        userData.binanceAllowedIp = insertUser.binanceAllowedIp.trim();
      }
      
      // Create and save the user
      const user = new UserModel(userData);
      await user.save();
      
      return convertToUserModel(user);
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      // Process API keys for encryption
      const updatesToApply: any = { ...updates };
      
      if (updates.okxApiKey && typeof updates.okxApiKey === 'string' && !isEncrypted(updates.okxApiKey)) {
        updatesToApply.okxApiKey = encrypt(updates.okxApiKey.trim());
      }
      
      if (updates.okxSecretKey && typeof updates.okxSecretKey === 'string' && !isEncrypted(updates.okxSecretKey)) {
        updatesToApply.okxSecretKey = encrypt(updates.okxSecretKey.trim());
      }
      
      if (updates.okxPassphrase && typeof updates.okxPassphrase === 'string' && !isEncrypted(updates.okxPassphrase)) {
        updatesToApply.okxPassphrase = encrypt(updates.okxPassphrase.trim());
      }
      
      if (updates.binanceApiKey && typeof updates.binanceApiKey === 'string' && !isEncrypted(updates.binanceApiKey)) {
        updatesToApply.binanceApiKey = encrypt(updates.binanceApiKey.trim());
      }
      
      if (updates.binanceSecretKey && typeof updates.binanceSecretKey === 'string' && !isEncrypted(updates.binanceSecretKey)) {
        updatesToApply.binanceSecretKey = encrypt(updates.binanceSecretKey.trim());
      }
      
      // Update the user
      const user = await UserModel.findByIdAndUpdate(id, updatesToApply, { new: true });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in updateUser:', error);
      return undefined;
    }
  }

  // OKX API key methods
  async updateUserApiKeys(userId: number, apiKeys: { okxApiKey?: string; okxSecretKey?: string; okxPassphrase?: string; defaultBroker?: string; useTestnet?: boolean; }): Promise<User | undefined> {
    try {
      const updates: any = {};
      
      if (apiKeys.okxApiKey) {
        updates.okxApiKey = encrypt(apiKeys.okxApiKey.trim());
      }
      
      if (apiKeys.okxSecretKey) {
        updates.okxSecretKey = encrypt(apiKeys.okxSecretKey.trim());
      }
      
      if (apiKeys.okxPassphrase) {
        updates.okxPassphrase = encrypt(apiKeys.okxPassphrase.trim());
      }
      
      if (apiKeys.defaultBroker) {
        updates.defaultBroker = apiKeys.defaultBroker;
      }
      
      if (apiKeys.useTestnet !== undefined) {
        updates.useTestnet = apiKeys.useTestnet;
      }
      
      const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in updateUserApiKeys:', error);
      return undefined;
    }
  }

  async getUserApiKeys(userId: number): Promise<{ okxApiKey?: string | null; okxSecretKey?: string | null; okxPassphrase?: string | null; defaultBroker: string; useTestnet: boolean; } | undefined> {
    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return undefined;
      }
      
      // Decrypt API keys
      const okxApiKey = user.okxApiKey ? decrypt(user.okxApiKey) : null;
      const okxSecretKey = user.okxSecretKey ? decrypt(user.okxSecretKey) : null;
      const okxPassphrase = user.okxPassphrase ? decrypt(user.okxPassphrase) : null;
      
      return {
        okxApiKey,
        okxSecretKey,
        okxPassphrase,
        defaultBroker: user.defaultBroker,
        useTestnet: user.useTestnet
      };
    } catch (error) {
      console.error('Error in getUserApiKeys:', error);
      return undefined;
    }
  }

  // Binance API key methods
  async updateUserBinanceApiKeys(userId: number, apiKeys: { binanceApiKey?: string; binanceSecretKey?: string; binanceAllowedIp?: string; }): Promise<User | undefined> {
    try {
      const updates: any = {};
      
      if (apiKeys.binanceApiKey) {
        updates.binanceApiKey = encrypt(apiKeys.binanceApiKey.trim());
      }
      
      if (apiKeys.binanceSecretKey) {
        updates.binanceSecretKey = encrypt(apiKeys.binanceSecretKey.trim());
      }
      
      if (apiKeys.binanceAllowedIp) {
        updates.binanceAllowedIp = apiKeys.binanceAllowedIp.trim();
      }
      
      const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in updateUserBinanceApiKeys:', error);
      return undefined;
    }
  }

  async getUserBinanceApiKeys(userId: number): Promise<{ binanceApiKey?: string | null; binanceSecretKey?: string | null; binanceAllowedIp?: string | null; } | undefined> {
    try {
      const user = await UserModel.findById(userId);
      
      if (!user) {
        return undefined;
      }
      
      // Decrypt API keys
      const binanceApiKey = user.binanceApiKey ? decrypt(user.binanceApiKey) : null;
      const binanceSecretKey = user.binanceSecretKey ? decrypt(user.binanceSecretKey) : null;
      
      return {
        binanceApiKey,
        binanceSecretKey,
        binanceAllowedIp: user.binanceAllowedIp
      };
    } catch (error) {
      console.error('Error in getUserBinanceApiKeys:', error);
      return undefined;
    }
  }

  async clearUserApiKeys(userId: number): Promise<boolean> {
    try {
      const updates = {
        okxApiKey: null,
        okxSecretKey: null,
        okxPassphrase: null,
        binanceApiKey: null,
        binanceSecretKey: null,
        binanceAllowedIp: null
      };
      
      const user = await UserModel.findByIdAndUpdate(userId, updates);
      return !!user;
    } catch (error) {
      console.error('Error in clearUserApiKeys:', error);
      return false;
    }
  }

  // Bot methods
  async getAllBots(): Promise<Bot[]> {
    try {
      const bots = await BotModel.find();
      return bots.map(bot => convertToBotModel(bot));
    } catch (error) {
      console.error('Error in getAllBots:', error);
      return [];
    }
  }

  async getBotById(id: number): Promise<Bot | undefined> {
    try {
      const bot = await BotModel.findById(id);
      return bot ? convertToBotModel(bot) : undefined;
    } catch (error) {
      console.error('Error in getBotById:', error);
      return undefined;
    }
  }

  async createBot(bot: InsertBot): Promise<Bot> {
    try {
      const id = await getNextSequence('botId');
      
      const newBot = new BotModel({
        _id: id,
        ...bot,
        createdAt: new Date()
      });
      
      await newBot.save();
      return convertToBotModel(newBot);
    } catch (error) {
      console.error('Error in createBot:', error);
      throw error;
    }
  }

  async updateBot(id: number, updates: Partial<Bot>): Promise<Bot | undefined> {
    try {
      const bot = await BotModel.findByIdAndUpdate(id, updates, { new: true });
      return bot ? convertToBotModel(bot) : undefined;
    } catch (error) {
      console.error('Error in updateBot:', error);
      return undefined;
    }
  }

  async deleteBot(id: number): Promise<boolean> {
    try {
      const result = await BotModel.findByIdAndDelete(id);
      return !!result;
    } catch (error) {
      console.error('Error in deleteBot:', error);
      return false;
    }
  }

  async getUserBots(userId: number): Promise<Bot[]> {
    try {
      const bots = await BotModel.find({ userId });
      return bots.map(bot => convertToBotModel(bot));
    } catch (error) {
      console.error('Error in getUserBots:', error);
      return [];
    }
  }

  async startBot(id: number): Promise<Bot | undefined> {
    try {
      const updates = {
        isRunning: true,
        lastStartedAt: new Date()
      };
      
      const bot = await BotModel.findByIdAndUpdate(id, updates, { new: true });
      return bot ? convertToBotModel(bot) : undefined;
    } catch (error) {
      console.error('Error in startBot:', error);
      return undefined;
    }
  }

  async stopBot(id: number): Promise<Bot | undefined> {
    try {
      const updates = {
        isRunning: false,
        lastStoppedAt: new Date()
      };
      
      const bot = await BotModel.findByIdAndUpdate(id, updates, { new: true });
      return bot ? convertToBotModel(bot) : undefined;
    } catch (error) {
      console.error('Error in stopBot:', error);
      return undefined;
    }
  }

  async updateBotStatus(id: number, isRunning: boolean, stats?: { profitLoss?: string; profitLossPercent?: string; totalTrades?: number; }): Promise<Bot | undefined> {
    try {
      const updates: any = { isRunning };
      
      if (isRunning) {
        updates.lastStartedAt = new Date();
      } else {
        updates.lastStoppedAt = new Date();
      }
      
      if (stats) {
        if (stats.profitLoss !== undefined) {
          updates.profitLoss = stats.profitLoss;
        }
        
        if (stats.profitLossPercent !== undefined) {
          updates.profitLossPercent = stats.profitLossPercent;
        }
        
        if (stats.totalTrades !== undefined) {
          updates.totalTrades = stats.totalTrades;
        }
      }
      
      const bot = await BotModel.findByIdAndUpdate(id, updates, { new: true });
      return bot ? convertToBotModel(bot) : undefined;
    } catch (error) {
      console.error('Error in updateBotStatus:', error);
      return undefined;
    }
  }

  // Pricing plan methods
  async getAllPricingPlans(): Promise<PricingPlan[]> {
    try {
      const plans = await PricingPlanModel.find();
      return plans.map(plan => ({
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        isPopular: plan.isPopular
      }));
    } catch (error) {
      console.error('Error in getAllPricingPlans:', error);
      return [];
    }
  }

  async getPricingPlanById(id: number): Promise<PricingPlan | undefined> {
    try {
      const plan = await PricingPlanModel.findById(id);
      
      if (!plan) {
        return undefined;
      }
      
      return {
        id: plan._id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        features: plan.features,
        isPopular: plan.isPopular
      };
    } catch (error) {
      console.error('Error in getPricingPlanById:', error);
      return undefined;
    }
  }

  // Payment methods
  async createPayment(payment: InsertPayment): Promise<Payment> {
    try {
      const id = await getNextSequence('paymentId');
      
      const newPayment = new PaymentModel({
        _id: id,
        ...payment,
        createdAt: new Date()
      });
      
      await newPayment.save();
      
      return {
        id: newPayment._id,
        userId: newPayment.userId,
        planId: newPayment.planId,
        amount: newPayment.amount,
        status: newPayment.status,
        paymentMethod: newPayment.paymentMethod,
        stripePaymentId: newPayment.stripePaymentId,
        createdAt: newPayment.createdAt
      };
    } catch (error) {
      console.error('Error in createPayment:', error);
      throw error;
    }
  }

  async getPaymentById(id: number): Promise<Payment | undefined> {
    try {
      const payment = await PaymentModel.findById(id);
      
      if (!payment) {
        return undefined;
      }
      
      return {
        id: payment._id,
        userId: payment.userId,
        planId: payment.planId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        stripePaymentId: payment.stripePaymentId,
        createdAt: payment.createdAt
      };
    } catch (error) {
      console.error('Error in getPaymentById:', error);
      return undefined;
    }
  }

  async getUserPayments(userId: number): Promise<Payment[]> {
    try {
      const payments = await PaymentModel.find({ userId });
      
      return payments.map(payment => ({
        id: payment._id,
        userId: payment.userId,
        planId: payment.planId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        stripePaymentId: payment.stripePaymentId,
        createdAt: payment.createdAt
      }));
    } catch (error) {
      console.error('Error in getUserPayments:', error);
      return [];
    }
  }

  async updatePayment(id: number, updates: Partial<Payment>): Promise<Payment | undefined> {
    try {
      const payment = await PaymentModel.findByIdAndUpdate(id, updates, { new: true });
      
      if (!payment) {
        return undefined;
      }
      
      return {
        id: payment._id,
        userId: payment.userId,
        planId: payment.planId,
        amount: payment.amount,
        status: payment.status,
        paymentMethod: payment.paymentMethod,
        stripePaymentId: payment.stripePaymentId,
        createdAt: payment.createdAt
      };
    } catch (error) {
      console.error('Error in updatePayment:', error);
      return undefined;
    }
  }

  // Stripe methods
  async updateUserStripeInfo(userId: number, stripeInfo: { stripeCustomerId: string; stripeSubscriptionId?: string; }): Promise<User | undefined> {
    try {
      const updates = {
        stripeCustomerId: stripeInfo.stripeCustomerId,
        stripeSubscriptionId: stripeInfo.stripeSubscriptionId
      };
      
      const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in updateUserStripeInfo:', error);
      return undefined;
    }
  }

  async updateUserPremiumStatus(userId: number, hasPremium: boolean, expiresAt?: Date): Promise<User | undefined> {
    try {
      const updates: any = {
        hasPremium
      };
      
      if (expiresAt) {
        updates.premiumExpiresAt = expiresAt;
      }
      
      const user = await UserModel.findByIdAndUpdate(userId, updates, { new: true });
      return user ? convertToUserModel(user) : undefined;
    } catch (error) {
      console.error('Error in updateUserPremiumStatus:', error);
      return undefined;
    }
  }

  // Paper Trading Account methods
  async getPaperTradingAccount(id: number): Promise<PaperTradingAccount | undefined> {
    try {
      const account = await PaperTradingAccountModel.findById(id);
      
      if (!account) {
        return undefined;
      }
      
      return {
        id: account._id,
        userId: account.userId,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        totalProfitLoss: account.totalProfitLoss,
        totalProfitLossPercent: account.totalProfitLossPercent,
        totalTrades: account.totalTrades,
        winningTrades: account.winningTrades,
        losingTrades: account.losingTrades,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    } catch (error) {
      console.error('Error in getPaperTradingAccount:', error);
      return undefined;
    }
  }

  async getUserPaperTradingAccount(userId: number): Promise<PaperTradingAccount | undefined> {
    try {
      const account = await PaperTradingAccountModel.findOne({ userId });
      
      if (!account) {
        return undefined;
      }
      
      return {
        id: account._id,
        userId: account.userId,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        totalProfitLoss: account.totalProfitLoss,
        totalProfitLossPercent: account.totalProfitLossPercent,
        totalTrades: account.totalTrades,
        winningTrades: account.winningTrades,
        losingTrades: account.losingTrades,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    } catch (error) {
      console.error('Error in getUserPaperTradingAccount:', error);
      return undefined;
    }
  }

  async createPaperTradingAccount(account: InsertPaperTradingAccount): Promise<PaperTradingAccount> {
    try {
      const id = await getNextSequence('paperAccountId');
      
      const newAccount = new PaperTradingAccountModel({
        _id: id,
        ...account,
        currentBalance: account.initialBalance,
        totalProfitLoss: '0',
        totalProfitLossPercent: '0',
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      await newAccount.save();
      
      return {
        id: newAccount._id,
        userId: newAccount.userId,
        initialBalance: newAccount.initialBalance,
        currentBalance: newAccount.currentBalance,
        totalProfitLoss: newAccount.totalProfitLoss,
        totalProfitLossPercent: newAccount.totalProfitLossPercent,
        totalTrades: newAccount.totalTrades,
        winningTrades: newAccount.winningTrades,
        losingTrades: newAccount.losingTrades,
        createdAt: newAccount.createdAt,
        updatedAt: newAccount.updatedAt
      };
    } catch (error) {
      console.error('Error in createPaperTradingAccount:', error);
      throw error;
    }
  }

  async updatePaperTradingAccount(id: number, updates: Partial<PaperTradingAccount>): Promise<PaperTradingAccount | undefined> {
    try {
      const updatesToApply = {
        ...updates,
        updatedAt: new Date()
      };
      
      const account = await PaperTradingAccountModel.findByIdAndUpdate(id, updatesToApply, { new: true });
      
      if (!account) {
        return undefined;
      }
      
      return {
        id: account._id,
        userId: account.userId,
        initialBalance: account.initialBalance,
        currentBalance: account.currentBalance,
        totalProfitLoss: account.totalProfitLoss,
        totalProfitLossPercent: account.totalProfitLossPercent,
        totalTrades: account.totalTrades,
        winningTrades: account.winningTrades,
        losingTrades: account.losingTrades,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      };
    } catch (error) {
      console.error('Error in updatePaperTradingAccount:', error);
      return undefined;
    }
  }

  async resetPaperTradingAccount(id: number, initialBalance?: number): Promise<PaperTradingAccount | undefined> {
    try {
      const account = await PaperTradingAccountModel.findById(id);
      
      if (!account) {
        return undefined;
      }
      
      const newBalance = initialBalance ? initialBalance.toString() : account.initialBalance;
      
      const updates = {
        currentBalance: newBalance,
        totalProfitLoss: '0',
        totalProfitLossPercent: '0',
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        updatedAt: new Date()
      };
      
      if (initialBalance) {
        updates['initialBalance'] = newBalance;
      }
      
      // Reset the account
      const updatedAccount = await PaperTradingAccountModel.findByIdAndUpdate(id, updates, { new: true });
      
      // Delete all positions and trades
      await PaperTradingPositionModel.deleteMany({ accountId: id });
      await PaperTradingTradeModel.deleteMany({ accountId: id });
      
      if (!updatedAccount) {
        return undefined;
      }
      
      return {
        id: updatedAccount._id,
        userId: updatedAccount.userId,
        initialBalance: updatedAccount.initialBalance,
        currentBalance: updatedAccount.currentBalance,
        totalProfitLoss: updatedAccount.totalProfitLoss,
        totalProfitLossPercent: updatedAccount.totalProfitLossPercent,
        totalTrades: updatedAccount.totalTrades,
        winningTrades: updatedAccount.winningTrades,
        losingTrades: updatedAccount.losingTrades,
        createdAt: updatedAccount.createdAt,
        updatedAt: updatedAccount.updatedAt
      };
    } catch (error) {
      console.error('Error in resetPaperTradingAccount:', error);
      return undefined;
    }
  }

  // Paper Trading Position methods
  async getPaperTradingPosition(id: number): Promise<PaperTradingPosition | undefined> {
    try {
      const position = await PaperTradingPositionModel.findById(id);
      
      if (!position) {
        return undefined;
      }
      
      return {
        id: position._id,
        accountId: position.accountId,
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        quantity: position.quantity,
        direction: position.direction as 'LONG' | 'SHORT',
        openedAt: position.openedAt
      };
    } catch (error) {
      console.error('Error in getPaperTradingPosition:', error);
      return undefined;
    }
  }

  async getAccountPaperTradingPositions(accountId: number): Promise<PaperTradingPosition[]> {
    try {
      const positions = await PaperTradingPositionModel.find({ accountId });
      
      return positions.map(position => ({
        id: position._id,
        accountId: position.accountId,
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        quantity: position.quantity,
        direction: position.direction as 'LONG' | 'SHORT',
        openedAt: position.openedAt
      }));
    } catch (error) {
      console.error('Error in getAccountPaperTradingPositions:', error);
      return [];
    }
  }

  async createPaperTradingPosition(position: InsertPaperTradingPosition): Promise<PaperTradingPosition> {
    try {
      const id = await getNextSequence('paperPositionId');
      
      const newPosition = new PaperTradingPositionModel({
        _id: id,
        ...position,
        openedAt: new Date()
      });
      
      await newPosition.save();
      
      return {
        id: newPosition._id,
        accountId: newPosition.accountId,
        symbol: newPosition.symbol,
        entryPrice: newPosition.entryPrice,
        quantity: newPosition.quantity,
        direction: newPosition.direction as 'LONG' | 'SHORT',
        openedAt: newPosition.openedAt
      };
    } catch (error) {
      console.error('Error in createPaperTradingPosition:', error);
      throw error;
    }
  }

  async updatePaperTradingPosition(id: number, updates: Partial<PaperTradingPosition>): Promise<PaperTradingPosition | undefined> {
    try {
      const position = await PaperTradingPositionModel.findByIdAndUpdate(id, updates, { new: true });
      
      if (!position) {
        return undefined;
      }
      
      return {
        id: position._id,
        accountId: position.accountId,
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        quantity: position.quantity,
        direction: position.direction as 'LONG' | 'SHORT',
        openedAt: position.openedAt
      };
    } catch (error) {
      console.error('Error in updatePaperTradingPosition:', error);
      return undefined;
    }
  }

  async closePaperTradingPosition(id: number, exitPrice: number): Promise<PaperTradingTrade | undefined> {
    try {
      // Get the position
      const position = await PaperTradingPositionModel.findById(id);
      
      if (!position) {
        return undefined;
      }
      
      // Calculate profit/loss
      const entryPriceNum = parseFloat(position.entryPrice);
      const quantityNum = parseFloat(position.quantity);
      
      let profitLoss: number;
      
      if (position.direction === 'LONG') {
        profitLoss = (exitPrice - entryPriceNum) * quantityNum;
      } else {
        profitLoss = (entryPriceNum - exitPrice) * quantityNum;
      }
      
      const profitLossStr = profitLoss.toFixed(8);
      const profitLossPercent = ((profitLoss / (entryPriceNum * quantityNum)) * 100).toFixed(2);
      
      // Create a trade record
      const tradeId = await getNextSequence('paperTradeId');
      
      const trade = new PaperTradingTradeModel({
        _id: tradeId,
        accountId: position.accountId,
        positionId: position._id,
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        exitPrice: exitPrice.toString(),
        quantity: position.quantity,
        direction: position.direction,
        status: 'CLOSED',
        profitLoss: profitLossStr,
        profitLossPercent: profitLossPercent,
        fee: (0.001 * (exitPrice * quantityNum)).toFixed(8), // 0.1% fee
        openedAt: position.openedAt,
        closedAt: new Date(),
        type: 'MANUAL',
        isAiGenerated: false
      });
      
      await trade.save();
      
      // Update account balance
      const account = await PaperTradingAccountModel.findById(position.accountId);
      
      if (account) {
        const currentBalanceNum = parseFloat(account.currentBalance);
        const newBalance = (currentBalanceNum + profitLoss).toFixed(8);
        
        const totalProfitLossNum = parseFloat(account.totalProfitLoss);
        const newTotalProfitLoss = (totalProfitLossNum + profitLoss).toFixed(8);
        
        const initialBalanceNum = parseFloat(account.initialBalance);
        const newTotalProfitLossPercent = ((newTotalProfitLoss / initialBalanceNum) * 100).toFixed(2);
        
        const isWinningTrade = profitLoss > 0;
        
        const accountUpdates = {
          currentBalance: newBalance,
          totalProfitLoss: newTotalProfitLoss,
          totalProfitLossPercent: newTotalProfitLossPercent,
          totalTrades: account.totalTrades + 1,
          winningTrades: isWinningTrade ? account.winningTrades + 1 : account.winningTrades,
          losingTrades: !isWinningTrade ? account.losingTrades + 1 : account.losingTrades,
          updatedAt: new Date()
        };
        
        await PaperTradingAccountModel.findByIdAndUpdate(position.accountId, accountUpdates);
      }
      
      // Delete the position
      await PaperTradingPositionModel.findByIdAndDelete(id);
      
      return {
        id: trade._id,
        accountId: trade.accountId,
        positionId: trade.positionId,
        symbol: trade.symbol,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        direction: trade.direction as 'LONG' | 'SHORT',
        status: trade.status as 'OPEN' | 'CLOSED',
        profitLoss: trade.profitLoss,
        profitLossPercent: trade.profitLossPercent,
        fee: trade.fee,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        type: trade.type,
        isAiGenerated: trade.isAiGenerated,
        aiConfidence: trade.aiConfidence
      };
    } catch (error) {
      console.error('Error in closePaperTradingPosition:', error);
      return undefined;
    }
  }

  // Paper Trading Trade methods
  async getPaperTradingTrade(id: number): Promise<PaperTradingTrade | undefined> {
    try {
      const trade = await PaperTradingTradeModel.findById(id);
      
      if (!trade) {
        return undefined;
      }
      
      return {
        id: trade._id,
        accountId: trade.accountId,
        positionId: trade.positionId,
        symbol: trade.symbol,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        direction: trade.direction as 'LONG' | 'SHORT',
        status: trade.status as 'OPEN' | 'CLOSED',
        profitLoss: trade.profitLoss,
        profitLossPercent: trade.profitLossPercent,
        fee: trade.fee,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        type: trade.type,
        isAiGenerated: trade.isAiGenerated,
        aiConfidence: trade.aiConfidence
      };
    } catch (error) {
      console.error('Error in getPaperTradingTrade:', error);
      return undefined;
    }
  }

  async getAccountPaperTradingTrades(accountId: number, limit?: number, offset?: number): Promise<PaperTradingTrade[]> {
    try {
      let query = PaperTradingTradeModel.find({ accountId }).sort({ openedAt: -1 });
      
      if (offset !== undefined) {
        query = query.skip(offset);
      }
      
      if (limit !== undefined) {
        query = query.limit(limit);
      }
      
      const trades = await query;
      
      return trades.map(trade => ({
        id: trade._id,
        accountId: trade.accountId,
        positionId: trade.positionId,
        symbol: trade.symbol,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        direction: trade.direction as 'LONG' | 'SHORT',
        status: trade.status as 'OPEN' | 'CLOSED',
        profitLoss: trade.profitLoss,
        profitLossPercent: trade.profitLossPercent,
        fee: trade.fee,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        type: trade.type,
        isAiGenerated: trade.isAiGenerated,
        aiConfidence: trade.aiConfidence
      }));
    } catch (error) {
      console.error('Error in getAccountPaperTradingTrades:', error);
      return [];
    }
  }

  async createPaperTradingTrade(trade: InsertPaperTradingTrade): Promise<PaperTradingTrade> {
    try {
      const id = await getNextSequence('paperTradeId');
      
      const newTrade = new PaperTradingTradeModel({
        _id: id,
        ...trade,
        openedAt: new Date()
      });
      
      await newTrade.save();
      
      return {
        id: newTrade._id,
        accountId: newTrade.accountId,
        positionId: newTrade.positionId,
        symbol: newTrade.symbol,
        entryPrice: newTrade.entryPrice,
        exitPrice: newTrade.exitPrice,
        quantity: newTrade.quantity,
        direction: newTrade.direction as 'LONG' | 'SHORT',
        status: newTrade.status as 'OPEN' | 'CLOSED',
        profitLoss: newTrade.profitLoss,
        profitLossPercent: newTrade.profitLossPercent,
        fee: newTrade.fee,
        openedAt: newTrade.openedAt,
        closedAt: newTrade.closedAt,
        type: newTrade.type,
        isAiGenerated: newTrade.isAiGenerated,
        aiConfidence: newTrade.aiConfidence
      };
    } catch (error) {
      console.error('Error in createPaperTradingTrade:', error);
      throw error;
    }
  }

  async updatePaperTradingTrade(id: number, updates: Partial<PaperTradingTrade>): Promise<PaperTradingTrade | undefined> {
    try {
      const trade = await PaperTradingTradeModel.findByIdAndUpdate(id, updates, { new: true });
      
      if (!trade) {
        return undefined;
      }
      
      return {
        id: trade._id,
        accountId: trade.accountId,
        positionId: trade.positionId,
        symbol: trade.symbol,
        entryPrice: trade.entryPrice,
        exitPrice: trade.exitPrice,
        quantity: trade.quantity,
        direction: trade.direction as 'LONG' | 'SHORT',
        status: trade.status as 'OPEN' | 'CLOSED',
        profitLoss: trade.profitLoss,
        profitLossPercent: trade.profitLossPercent,
        fee: trade.fee,
        openedAt: trade.openedAt,
        closedAt: trade.closedAt,
        type: trade.type,
        isAiGenerated: trade.isAiGenerated,
        aiConfidence: trade.aiConfidence
      };
    } catch (error) {
      console.error('Error in updatePaperTradingTrade:', error);
      return undefined;
    }
  }

  // Paper Trading Stats
  async getPaperTradingStats(accountId: number): Promise<{ totalTrades: number; winningTrades: number; losingTrades: number; winRate: number; totalProfitLoss: string; totalProfitLossPercent: string; averageProfitLoss: string; averageProfitLossPercent: string; }> {
    try {
      const account = await PaperTradingAccountModel.findById(accountId);
      
      if (!account) {
        return {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalProfitLoss: '0',
          totalProfitLossPercent: '0',
          averageProfitLoss: '0',
          averageProfitLossPercent: '0'
        };
      }
      
      const trades = await PaperTradingTradeModel.find({ 
        accountId, 
        status: 'CLOSED'
      });
      
      const totalTrades = trades.length;
      let winningTrades = 0;
      let totalProfitLoss = 0;
      
      trades.forEach(trade => {
        const profitLoss = parseFloat(trade.profitLoss || '0');
        if (profitLoss > 0) {
          winningTrades++;
        }
        totalProfitLoss += profitLoss;
      });
      
      const losingTrades = totalTrades - winningTrades;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      const initialBalance = parseFloat(account.initialBalance);
      const totalProfitLossPercent = initialBalance > 0 ? (totalProfitLoss / initialBalance) * 100 : 0;
      
      const averageProfitLoss = totalTrades > 0 ? totalProfitLoss / totalTrades : 0;
      const averageProfitLossPercent = totalTrades > 0 ? totalProfitLossPercent / totalTrades : 0;
      
      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfitLoss: totalProfitLoss.toFixed(8),
        totalProfitLossPercent: totalProfitLossPercent.toFixed(2),
        averageProfitLoss: averageProfitLoss.toFixed(8),
        averageProfitLossPercent: averageProfitLossPercent.toFixed(2)
      };
    } catch (error) {
      console.error('Error in getPaperTradingStats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfitLoss: '0',
        totalProfitLossPercent: '0',
        averageProfitLoss: '0',
        averageProfitLossPercent: '0'
      };
    }
  }
}