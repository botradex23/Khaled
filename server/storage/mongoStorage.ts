// Import from storage.ts
import { IStorage } from '../storage';
import {
  User, InsertUser, PaperTradingAccount, InsertPaperTradingAccount,
  PaperTradingPosition, InsertPaperTradingPosition, PaperTradingTrade, InsertPaperTradingTrade,
  RiskSettings, InsertRiskSettings, TradeLog, InsertTradeLog
} from '@shared/schema';
import { mongoClient } from './mongodb';
import { ObjectId } from 'mongodb';

/**
 * MongoDB Storage implementation
 * 
 * This class implements the IStorage interface using MongoDB Atlas as the backend.
 */
export class MongoDBStorage implements IStorage {
  // Collection names in MongoDB
  private collections = {
    users: 'users',
    bots: 'bots',
    botTrades: 'bot_trades',
    pricingPlans: 'pricing_plans',
    payments: 'payments',
    paperTradingAccounts: 'paper_trading_accounts',
    paperTradingPositions: 'paper_trading_positions',
    paperTradingTrades: 'paper_trading_trades',
    tradeLogs: 'trade_logs',
    riskSettings: 'risk_settings'
  };

  // Counter for auto-incrementing IDs (fallback)
  private counters: { [key: string]: number } = {
    users: 1000,
    bots: 1000,
    botTrades: 1000,
    pricingPlans: 100,
    payments: 1000,
    paperTradingAccounts: 1000,
    paperTradingPositions: 1000,
    paperTradingTrades: 1000,
    tradeLogs: 1000,
    riskSettings: 1000
  };

  constructor() {
    console.log('✅ MongoDB Storage initialized');
  }

  // Helper method to get MongoDB database
  private getDb() {
    if (!mongoClient) {
      throw new Error('MongoDB client is not initialized');
    }
    return mongoClient.db();
  }

  // Helper method to get next ID for a collection
  private async getNextId(collectionName: string): Promise<number> {
    try {
      const db = this.getDb();
      const countersCollection = db.collection('counters');
      
      // Try to update the counter document, or insert it if it doesn't exist
      const result = await countersCollection.findOneAndUpdate(
        { _id: collectionName },
        { $inc: { sequence_value: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
      
      if (result && result.sequence_value) {
        return result.sequence_value;
      } else {
        // Fallback to in-memory counter if MongoDB operation fails
        return ++this.counters[collectionName];
      }
    } catch (error) {
      console.error(`Error getting next ID for ${collectionName}:`, error);
      return ++this.counters[collectionName];
    }
  }

  // Check database connection status
  async checkDatabaseStatus() {
    try {
      if (!mongoClient) {
        return {
          connected: false,
          isSimulated: true,
          description: 'MongoDB client is not initialized',
          error: 'MongoDB client is not initialized'
        };
      }
      
      // Ping the database to confirm connection
      await this.getDb().command({ ping: 1 });
      
      return {
        connected: true,
        isSimulated: false,
        description: 'Connected to MongoDB Atlas',
        error: null
      };
    } catch (error: any) {
      return {
        connected: false,
        isSimulated: true,
        description: 'Failed to connect to MongoDB Atlas',
        error: error.message || 'Unknown MongoDB error'
      };
    }
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      const user = await usersCollection.findOne({ id });
      return user as User | undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      const user = await usersCollection.findOne({ username });
      return user as User | undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      const user = await usersCollection.findOne({ email });
      return user as User | undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      const user = await usersCollection.findOne({ googleId });
      return user as User | undefined;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      const user = await usersCollection.findOne({ appleId });
      return user as User | undefined;
    } catch (error) {
      console.error('Error getting user by Apple ID:', error);
      return undefined;
    }
  }

  async createUser(user: InsertUser): Promise<User> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      
      // Get the next user ID
      const id = await this.getNextId(this.collections.users);
      
      // Create the user object
      const newUser: User = {
        id,
        username: user.username,
        email: user.email,
        password: user.password || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        defaultBroker: user.defaultBroker || null,
        useTestnet: user.useTestnet !== undefined ? user.useTestnet : true,
        binanceApiKey: user.binanceApiKey || null,
        binanceSecretKey: user.binanceSecretKey || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the user into MongoDB
      await usersCollection.insertOne(newUser);
      
      return newUser;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const db = this.getDb();
      const usersCollection = db.collection(this.collections.users);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the user in MongoDB
      const result = await usersCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result as User | undefined;
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  // API key related methods
  async updateUserApiKeys(userId: number, apiKeys: any): Promise<User | undefined> {
    try {
      return this.updateUser(userId, {
        defaultBroker: apiKeys.defaultBroker,
        useTestnet: apiKeys.useTestnet
      });
    } catch (error) {
      console.error('Error updating user API keys:', error);
      return undefined;
    }
  }

  async getUserApiKeys(userId: number): Promise<any> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      return {
        defaultBroker: user.defaultBroker,
        useTestnet: user.useTestnet
      };
    } catch (error) {
      console.error('Error getting user API keys:', error);
      return undefined;
    }
  }

  // Binance API key methods
  async updateUserBinanceApiKeys(userId: number, apiKeys: any): Promise<User | undefined> {
    try {
      return this.updateUser(userId, {
        binanceApiKey: apiKeys.binanceApiKey,
        binanceSecretKey: apiKeys.binanceSecretKey
      });
    } catch (error) {
      console.error('Error updating Binance API keys:', error);
      return undefined;
    }
  }

  async getUserBinanceApiKeys(userId: number): Promise<any> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      return {
        binanceApiKey: user.binanceApiKey,
        binanceSecretKey: user.binanceSecretKey
      };
    } catch (error) {
      console.error('Error getting Binance API keys:', error);
      return undefined;
    }
  }

  async clearUserApiKeys(userId: number): Promise<boolean> {
    try {
      const updated = await this.updateUser(userId, {
        binanceApiKey: null,
        binanceSecretKey: null
      });
      return !!updated;
    } catch (error) {
      console.error('Error clearing API keys:', error);
      return false;
    }
  }

  // Bot methods
  async getAllBots(): Promise<any[]> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      const bots = await botsCollection.find({}).toArray();
      return bots;
    } catch (error) {
      console.error('Error getting all bots:', error);
      return [];
    }
  }
  
  async getBotById(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      const bot = await botsCollection.findOne({ id });
      return bot;
    } catch (error) {
      console.error('Error getting bot by ID:', error);
      return undefined;
    }
  }
  
  async createBot(bot: any): Promise<any> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      
      // Get the next bot ID
      const id = await this.getNextId(this.collections.bots);
      
      // Create bot object with timestamps
      const newBot = {
        id,
        ...bot,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the bot into MongoDB
      await botsCollection.insertOne(newBot);
      
      return newBot;
    } catch (error) {
      console.error('Error creating bot:', error);
      return { id: -1, ...bot };
    }
  }
  
  async updateBot(id: number, updates: any): Promise<any> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the bot in MongoDB
      const result = await botsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating bot:', error);
      return { id, ...updates };
    }
  }
  
  async deleteBot(id: number): Promise<boolean> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      
      // Delete the bot from MongoDB
      const result = await botsCollection.deleteOne({ id });
      
      return result.deletedCount === 1;
    } catch (error) {
      console.error('Error deleting bot:', error);
      return false;
    }
  }
  
  async getUserBots(userId: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      
      // Find all bots for the user
      const bots = await botsCollection.find({ userId }).toArray();
      
      return bots;
    } catch (error) {
      console.error('Error getting user bots:', error);
      return [];
    }
  }
  
  async startBot(id: number): Promise<any> {
    try {
      return this.updateBot(id, { isRunning: true });
    } catch (error) {
      console.error('Error starting bot:', error);
      return { id, isRunning: true };
    }
  }
  
  async stopBot(id: number): Promise<any> {
    try {
      return this.updateBot(id, { isRunning: false });
    } catch (error) {
      console.error('Error stopping bot:', error);
      return { id, isRunning: false };
    }
  }
  
  async updateBotStatus(id: number, isRunning: boolean, stats?: any): Promise<any> {
    try {
      return this.updateBot(id, { isRunning, ...(stats || {}) });
    } catch (error) {
      console.error('Error updating bot status:', error);
      return { id, isRunning, ...(stats || {}) };
    }
  }
  
  async getActiveBots(): Promise<any[]> {
    try {
      const db = this.getDb();
      const botsCollection = db.collection(this.collections.bots);
      
      // Find all active bots
      const bots = await botsCollection.find({ isRunning: true }).toArray();
      
      return bots;
    } catch (error) {
      console.error('Error getting active bots:', error);
      return [];
    }
  }

  // Bot trade methods
  async createBotTrade(trade: any): Promise<number> {
    try {
      const db = this.getDb();
      const botTradesCollection = db.collection(this.collections.botTrades);
      
      // Get the next trade ID
      const id = await this.getNextId(this.collections.botTrades);
      
      // Create trade object with timestamps
      const newTrade = {
        id,
        ...trade,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the trade into MongoDB
      await botTradesCollection.insertOne(newTrade);
      
      return id;
    } catch (error) {
      console.error('Error creating bot trade:', error);
      return -1;
    }
  }
  
  async getBotTrades(botId: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const botTradesCollection = db.collection(this.collections.botTrades);
      
      // Find all trades for the bot
      const trades = await botTradesCollection.find({ botId }).toArray();
      
      return trades;
    } catch (error) {
      console.error('Error getting bot trades:', error);
      return [];
    }
  }
  
  async getBotTrade(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const botTradesCollection = db.collection(this.collections.botTrades);
      
      // Find the trade by ID
      const trade = await botTradesCollection.findOne({ id });
      
      return trade;
    } catch (error) {
      console.error('Error getting bot trade:', error);
      return undefined;
    }
  }
  
  async getUserBotTrades(userId: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const botTradesCollection = db.collection(this.collections.botTrades);
      
      // Find all trades for the user
      const trades = await botTradesCollection.find({ userId }).toArray();
      
      return trades;
    } catch (error) {
      console.error('Error getting user bot trades:', error);
      return [];
    }
  }
  
  async updateBotTrade(id: number, updates: any): Promise<any> {
    try {
      const db = this.getDb();
      const botTradesCollection = db.collection(this.collections.botTrades);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the trade in MongoDB
      const result = await botTradesCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating bot trade:', error);
      return { id, ...updates };
    }
  }

  // Pricing plan methods
  async getAllPricingPlans(): Promise<any[]> {
    try {
      const db = this.getDb();
      const pricingPlansCollection = db.collection(this.collections.pricingPlans);
      
      // Find all pricing plans
      const plans = await pricingPlansCollection.find({}).toArray();
      
      return plans;
    } catch (error) {
      console.error('Error getting all pricing plans:', error);
      return [];
    }
  }
  
  async getPricingPlanById(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const pricingPlansCollection = db.collection(this.collections.pricingPlans);
      
      // Find the pricing plan by ID
      const plan = await pricingPlansCollection.findOne({ id });
      
      return plan;
    } catch (error) {
      console.error('Error getting pricing plan by ID:', error);
      return undefined;
    }
  }

  // Payment methods
  async createPayment(payment: any): Promise<any> {
    try {
      const db = this.getDb();
      const paymentsCollection = db.collection(this.collections.payments);
      
      // Get the next payment ID
      const id = await this.getNextId(this.collections.payments);
      
      // Create payment object with timestamps
      const newPayment = {
        id,
        ...payment,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the payment into MongoDB
      await paymentsCollection.insertOne(newPayment);
      
      return newPayment;
    } catch (error) {
      console.error('Error creating payment:', error);
      return { id: -1, ...payment };
    }
  }
  
  async getPaymentById(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const paymentsCollection = db.collection(this.collections.payments);
      
      // Find the payment by ID
      const payment = await paymentsCollection.findOne({ id });
      
      return payment;
    } catch (error) {
      console.error('Error getting payment by ID:', error);
      return undefined;
    }
  }
  
  async getUserPayments(userId: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const paymentsCollection = db.collection(this.collections.payments);
      
      // Find all payments for the user
      const payments = await paymentsCollection.find({ userId }).toArray();
      
      return payments;
    } catch (error) {
      console.error('Error getting user payments:', error);
      return [];
    }
  }
  
  async updatePayment(id: number, updates: any): Promise<any> {
    try {
      const db = this.getDb();
      const paymentsCollection = db.collection(this.collections.payments);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the payment in MongoDB
      const result = await paymentsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating payment:', error);
      return { id, ...updates };
    }
  }

  // Stripe methods
  async updateUserStripeInfo(userId: number, stripeInfo: any): Promise<User | undefined> {
    try {
      return this.updateUser(userId, { stripeCustomerId: stripeInfo.stripeCustomerId });
    } catch (error) {
      console.error('Error updating user Stripe info:', error);
      return undefined;
    }
  }
  
  async updateUserPremiumStatus(userId: number, hasPremium: boolean, expiresAt?: Date): Promise<User | undefined> {
    try {
      const updates: any = { hasPremium };
      if (expiresAt) {
        updates.premiumExpiresAt = expiresAt;
      }
      
      return this.updateUser(userId, updates);
    } catch (error) {
      console.error('Error updating user premium status:', error);
      return undefined;
    }
  }

  // Paper Trading Account methods
  async getPaperTradingAccount(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      
      // Find the account by ID
      const account = await accountsCollection.findOne({ id });
      
      return account;
    } catch (error) {
      console.error('Error getting paper trading account:', error);
      return undefined;
    }
  }
  
  async getUserPaperTradingAccount(userId: number): Promise<any> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      
      // Find the account for the user
      const account = await accountsCollection.findOne({ userId });
      
      return account;
    } catch (error) {
      console.error('Error getting user paper trading account:', error);
      return undefined;
    }
  }
  
  async createPaperTradingAccount(account: InsertPaperTradingAccount): Promise<any> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      
      // Get the next account ID
      const id = await this.getNextId(this.collections.paperTradingAccounts);
      
      // Create account object with timestamps
      const newAccount = {
        id,
        ...account,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the account into MongoDB
      await accountsCollection.insertOne(newAccount);
      
      return newAccount;
    } catch (error) {
      console.error('Error creating paper trading account:', error);
      return { id: -1, ...account };
    }
  }
  
  async updatePaperTradingAccount(id: number, updates: Partial<PaperTradingAccount>): Promise<any> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the account in MongoDB
      const result = await accountsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating paper trading account:', error);
      return { id, ...updates };
    }
  }
  
  async resetPaperTradingAccount(id: number, initialBalance?: number): Promise<any> {
    try {
      const balance = initialBalance ? initialBalance.toString() : "10000";
      
      // Update the account with reset values
      const updates = {
        initialBalance: balance,
        currentBalance: balance,
        totalProfitLoss: "0",
        totalProfitLossPercent: "0",
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        lastResetAt: new Date()
      };
      
      return this.updatePaperTradingAccount(id, updates);
    } catch (error) {
      console.error('Error resetting paper trading account:', error);
      return { 
        id, 
        initialBalance: initialBalance ? initialBalance.toString() : "10000", 
        currentBalance: initialBalance ? initialBalance.toString() : "10000" 
      };
    }
  }

  // Paper Trading Position methods
  async getPaperTradingPosition(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const positionsCollection = db.collection(this.collections.paperTradingPositions);
      
      // Find the position by ID
      const position = await positionsCollection.findOne({ id });
      
      return position;
    } catch (error) {
      console.error('Error getting paper trading position:', error);
      return undefined;
    }
  }
  
  async getAccountPaperTradingPositions(accountId: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const positionsCollection = db.collection(this.collections.paperTradingPositions);
      
      // Find all positions for the account
      const positions = await positionsCollection.find({ accountId }).toArray();
      
      return positions;
    } catch (error) {
      console.error('Error getting account paper trading positions:', error);
      return [];
    }
  }
  
  async createPaperTradingPosition(position: InsertPaperTradingPosition): Promise<any> {
    try {
      const db = this.getDb();
      const positionsCollection = db.collection(this.collections.paperTradingPositions);
      
      // Get the next position ID
      const id = await this.getNextId(this.collections.paperTradingPositions);
      
      // Create position object with ID and timestamp
      const newPosition = {
        id,
        ...position,
        openedAt: new Date()
      };
      
      // Insert the position into MongoDB
      await positionsCollection.insertOne(newPosition);
      
      return newPosition;
    } catch (error) {
      console.error('Error creating paper trading position:', error);
      return { id: -1, ...position };
    }
  }
  
  async updatePaperTradingPosition(id: number, updates: Partial<PaperTradingPosition>): Promise<any> {
    try {
      const db = this.getDb();
      const positionsCollection = db.collection(this.collections.paperTradingPositions);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the position in MongoDB
      const result = await positionsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating paper trading position:', error);
      return { id, ...updates };
    }
  }
  
  async closePaperTradingPosition(id: number, exitPrice: number): Promise<any> {
    try {
      const db = this.getDb();
      const positionsCollection = db.collection(this.collections.paperTradingPositions);
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Find the position to close
      const position = await positionsCollection.findOne({ id });
      
      if (!position) {
        return null;
      }
      
      // Calculate profit/loss
      const entryPrice = parseFloat(position.entryPrice);
      const quantity = parseFloat(position.quantity);
      const direction = position.direction;
      
      let profitLoss = 0;
      let profitLossPercent = 0;
      
      if (direction === 'LONG') {
        profitLoss = (exitPrice - entryPrice) * quantity;
        profitLossPercent = ((exitPrice - entryPrice) / entryPrice) * 100;
      } else {
        profitLoss = (entryPrice - exitPrice) * quantity;
        profitLossPercent = ((entryPrice - exitPrice) / entryPrice) * 100;
      }
      
      // Get the next trade ID
      const tradeId = await this.getNextId(this.collections.paperTradingTrades);
      
      // Create the trade record
      const trade = {
        id: tradeId,
        positionId: id,
        accountId: position.accountId,
        symbol: position.symbol,
        entryPrice: position.entryPrice,
        exitPrice: exitPrice.toString(),
        quantity: position.quantity,
        direction: position.direction,
        status: 'CLOSED',
        profitLoss: profitLoss.toString(),
        profitLossPercent: profitLossPercent.toString(),
        fee: "0", // Simplified example
        openedAt: position.openedAt,
        closedAt: new Date(),
        type: 'MANUAL',
        isAiGenerated: false,
        aiConfidence: null
      };
      
      // Insert the trade record
      await tradesCollection.insertOne(trade);
      
      // Update the position to closed status
      await positionsCollection.updateOne(
        { id },
        { 
          $set: {
            exitPrice: exitPrice.toString(),
            status: 'CLOSED',
            closedAt: new Date(),
            profitLoss: profitLoss.toString(),
            profitLossPercent: profitLossPercent.toString()
          }
        }
      );
      
      // Update the account balance
      await this.updateAccountBalanceAfterTrade(position.accountId, profitLoss);
      
      return trade;
    } catch (error) {
      console.error('Error closing paper trading position:', error);
      return { 
        id: -1, 
        positionId: id,
        exitPrice: exitPrice.toString(),
        profitLoss: "0",
        profitLossPercent: "0",
        closedAt: new Date()
      };
    }
  }
  
  // Helper method to update account balance after trade
  private async updateAccountBalanceAfterTrade(accountId: number, profitLoss: number): Promise<void> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      
      // Find the account
      const account = await accountsCollection.findOne({ id: accountId });
      
      if (!account) {
        console.error(`Account ${accountId} not found`);
        return;
      }
      
      // Calculate new balance
      const currentBalance = parseFloat(account.currentBalance);
      const newBalance = currentBalance + profitLoss;
      
      // Calculate profit/loss percentage
      const initialBalance = parseFloat(account.initialBalance);
      const totalProfitLoss = newBalance - initialBalance;
      const totalProfitLossPercent = (totalProfitLoss / initialBalance) * 100;
      
      // Update trade counts
      let totalTrades = account.totalTrades || 0;
      let winningTrades = account.winningTrades || 0;
      let losingTrades = account.losingTrades || 0;
      
      totalTrades++;
      if (profitLoss > 0) {
        winningTrades++;
      } else if (profitLoss < 0) {
        losingTrades++;
      }
      
      // Update the account
      await accountsCollection.updateOne(
        { id: accountId },
        {
          $set: {
            currentBalance: newBalance.toString(),
            totalProfitLoss: totalProfitLoss.toString(),
            totalProfitLossPercent: totalProfitLossPercent.toString(),
            totalTrades,
            winningTrades,
            losingTrades,
            updatedAt: new Date()
          }
        }
      );
    } catch (error) {
      console.error('Error updating account balance after trade:', error);
    }
  }

  // Paper Trading Trade methods
  async getPaperTradingTrade(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Find the trade by ID
      const trade = await tradesCollection.findOne({ id });
      
      return trade;
    } catch (error) {
      console.error('Error getting paper trading trade:', error);
      return undefined;
    }
  }
  
  async getAccountPaperTradingTrades(accountId: number, limit?: number, offset?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Prepare the query
      let query = tradesCollection.find({ accountId }).sort({ closedAt: -1 });
      
      // Apply offset if provided
      if (offset) {
        query = query.skip(offset);
      }
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const trades = await query.toArray();
      
      return trades;
    } catch (error) {
      console.error('Error getting account paper trading trades:', error);
      return [];
    }
  }
  
  async createPaperTradingTrade(trade: InsertPaperTradingTrade): Promise<any> {
    try {
      const db = this.getDb();
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Get the next trade ID
      const id = await this.getNextId(this.collections.paperTradingTrades);
      
      // Create trade object with ID and timestamps
      const newTrade = {
        id,
        ...trade,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the trade into MongoDB
      await tradesCollection.insertOne(newTrade);
      
      // If this is a closed trade, update the account balance
      if (trade.status === 'CLOSED' && trade.profitLoss) {
        await this.updateAccountBalanceAfterTrade(trade.accountId, parseFloat(trade.profitLoss));
      }
      
      return newTrade;
    } catch (error) {
      console.error('Error creating paper trading trade:', error);
      return { id: -1, ...trade };
    }
  }
  
  async updatePaperTradingTrade(id: number, updates: Partial<PaperTradingTrade>): Promise<any> {
    try {
      const db = this.getDb();
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the trade in MongoDB
      const result = await tradesCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      // If status changed to CLOSED, update account balance
      if (updates.status === 'CLOSED' && updates.profitLoss && result) {
        await this.updateAccountBalanceAfterTrade(result.accountId, parseFloat(updates.profitLoss));
      }
      
      return result;
    } catch (error) {
      console.error('Error updating paper trading trade:', error);
      return { id, ...updates };
    }
  }

  // Paper Trading Stats
  async getPaperTradingStats(accountId: number): Promise<any> {
    try {
      const db = this.getDb();
      const accountsCollection = db.collection(this.collections.paperTradingAccounts);
      const tradesCollection = db.collection(this.collections.paperTradingTrades);
      
      // Find the account
      const account = await accountsCollection.findOne({ id: accountId });
      
      if (!account) {
        return {
          totalTrades: 0,
          winningTrades: 0,
          losingTrades: 0,
          winRate: 0,
          totalProfitLoss: "0",
          totalProfitLossPercent: "0",
          averageProfitLoss: "0",
          averageProfitLossPercent: "0"
        };
      }
      
      // Get all closed trades for the account
      const trades = await tradesCollection.find({ 
        accountId, 
        status: 'CLOSED' 
      }).toArray();
      
      // Calculate stats
      const totalTrades = trades.length;
      const winningTrades = trades.filter(t => parseFloat(t.profitLoss) > 0).length;
      const losingTrades = trades.filter(t => parseFloat(t.profitLoss) < 0).length;
      const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
      
      // Calculate profit/loss
      const totalProfitLoss = account.totalProfitLoss || "0";
      const totalProfitLossPercent = account.totalProfitLossPercent || "0";
      
      // Calculate averages
      let sumProfitLoss = 0;
      let sumProfitLossPercent = 0;
      
      trades.forEach(trade => {
        sumProfitLoss += parseFloat(trade.profitLoss);
        sumProfitLossPercent += parseFloat(trade.profitLossPercent);
      });
      
      const averageProfitLoss = totalTrades > 0 ? (sumProfitLoss / totalTrades).toString() : "0";
      const averageProfitLossPercent = totalTrades > 0 ? (sumProfitLossPercent / totalTrades).toString() : "0";
      
      return {
        totalTrades,
        winningTrades,
        losingTrades,
        winRate,
        totalProfitLoss,
        totalProfitLossPercent,
        averageProfitLoss,
        averageProfitLossPercent
      };
    } catch (error) {
      console.error('Error getting paper trading stats:', error);
      return {
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        winRate: 0,
        totalProfitLoss: "0",
        totalProfitLossPercent: "0",
        averageProfitLoss: "0",
        averageProfitLossPercent: "0"
      };
    }
  }

  // Trade Logging methods
  async createTradeLog(tradeLog: InsertTradeLog): Promise<any> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Get the next log ID
      const id = await this.getNextId(this.collections.tradeLogs);
      
      // Create log object with ID and timestamp
      const newLog = {
        id,
        ...tradeLog,
        timestamp: new Date()
      };
      
      // Insert the log into MongoDB
      await tradeLogsCollection.insertOne(newLog);
      
      return newLog;
    } catch (error) {
      console.error('Error creating trade log:', error);
      return { id: -1, ...tradeLog, timestamp: new Date() };
    }
  }
  
  async getTradeLog(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Find the log by ID
      const log = await tradeLogsCollection.findOne({ id });
      
      return log;
    } catch (error) {
      console.error('Error getting trade log:', error);
      return undefined;
    }
  }
  
  async getAllTradeLogs(limit?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Prepare the query
      let query = tradeLogsCollection.find({}).sort({ timestamp: -1 });
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const logs = await query.toArray();
      
      return logs;
    } catch (error) {
      console.error('Error getting all trade logs:', error);
      return [];
    }
  }
  
  async getTradeLogsBySymbol(symbol: string, limit?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Prepare the query
      let query = tradeLogsCollection.find({ symbol }).sort({ timestamp: -1 });
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const logs = await query.toArray();
      
      return logs;
    } catch (error) {
      console.error('Error getting trade logs by symbol:', error);
      return [];
    }
  }
  
  async getTradeLogsByUserId(userId: number, limit?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Prepare the query
      let query = tradeLogsCollection.find({ user_id: userId }).sort({ timestamp: -1 });
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const logs = await query.toArray();
      
      return logs;
    } catch (error) {
      console.error('Error getting trade logs by user ID:', error);
      return [];
    }
  }
  
  async getTradeLogsBySource(source: string, limit?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Prepare the query
      let query = tradeLogsCollection.find({ trade_source: source }).sort({ timestamp: -1 });
      
      // Apply limit if provided
      if (limit) {
        query = query.limit(limit);
      }
      
      // Execute the query
      const logs = await query.toArray();
      
      return logs;
    } catch (error) {
      console.error('Error getting trade logs by source:', error);
      return [];
    }
  }
  
  async updateTradeLog(id: number, updates: Partial<TradeLog>): Promise<any> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the log in MongoDB
      const result = await tradeLogsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating trade log:', error);
      return { id, ...updates };
    }
  }
  
  async searchTradeLogs(filter: any, limit?: number): Promise<any[]> {
    try {
      const db = this.getDb();
      const tradeLogsCollection = db.collection(this.collections.tradeLogs);
      
      // Build MongoDB query from filter
      const query: any = {};
      
      if (filter.symbol) {
        query.symbol = filter.symbol;
      }
      
      if (filter.trade_source) {
        query.trade_source = filter.trade_source;
      }
      
      if (filter.status) {
        query.status = filter.status;
      }
      
      if (filter.user_id) {
        query.user_id = filter.user_id;
      }
      
      if (filter.action) {
        query.action = filter.action;
      }
      
      if (filter.fromDate) {
        query.timestamp = query.timestamp || {};
        query.timestamp.$gte = new Date(filter.fromDate);
      }
      
      if (filter.toDate) {
        query.timestamp = query.timestamp || {};
        query.timestamp.$lte = new Date(filter.toDate);
      }
      
      // Prepare the query
      let mongoQuery = tradeLogsCollection.find(query).sort({ timestamp: -1 });
      
      // Apply limit if provided
      if (limit) {
        mongoQuery = mongoQuery.limit(limit);
      }
      
      // Execute the query
      const logs = await mongoQuery.toArray();
      
      return logs;
    } catch (error) {
      console.error('Error searching trade logs:', error);
      return [];
    }
  }

  // Risk Settings methods
  async getRiskSettings(id: number): Promise<any> {
    try {
      const db = this.getDb();
      const riskSettingsCollection = db.collection(this.collections.riskSettings);
      
      // Find the settings by ID
      const settings = await riskSettingsCollection.findOne({ id });
      
      return settings;
    } catch (error) {
      console.error('Error getting risk settings:', error);
      return undefined;
    }
  }
  
  async getRiskSettingsByUserId(userId: number): Promise<any> {
    try {
      const db = this.getDb();
      const riskSettingsCollection = db.collection(this.collections.riskSettings);
      
      // Find the settings by user ID
      const settings = await riskSettingsCollection.findOne({ userId });
      
      return settings;
    } catch (error) {
      console.error('Error getting risk settings by user ID:', error);
      return undefined;
    }
  }
  
  async createRiskSettings(settings: InsertRiskSettings): Promise<any> {
    try {
      const db = this.getDb();
      const riskSettingsCollection = db.collection(this.collections.riskSettings);
      
      // Get the next settings ID
      const id = await this.getNextId(this.collections.riskSettings);
      
      // Create settings object with ID and timestamps
      const newSettings = {
        id,
        ...settings,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the settings into MongoDB
      await riskSettingsCollection.insertOne(newSettings);
      
      return newSettings;
    } catch (error) {
      console.error('Error creating risk settings:', error);
      return { id: -1, ...settings };
    }
  }
  
  async updateRiskSettings(id: number, updates: Partial<RiskSettings>): Promise<any> {
    try {
      const db = this.getDb();
      const riskSettingsCollection = db.collection(this.collections.riskSettings);
      
      // Prepare update with updatedAt timestamp
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      // Update the settings in MongoDB
      const result = await riskSettingsCollection.findOneAndUpdate(
        { id },
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating risk settings:', error);
      return { id, ...updates };
    }
  }
}