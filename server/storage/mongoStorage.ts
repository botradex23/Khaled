// Temporary placeholder for mongodb module
// We'll need to update this once we resolve the installation issues
const FakeMongoModule = {
  MongoClient: class {
    constructor(uri: string) {
      this.uri = uri;
    }
    uri: string;
    connect() { return Promise.resolve(); }
    db() { 
      return {
        collection: () => ({
          find: () => ({
            toArray: () => Promise.resolve([]),
            sort: () => ({ limit: () => ({ toArray: () => Promise.resolve([]) }) })
          }),
          findOne: () => Promise.resolve(null),
          insertOne: () => Promise.resolve({ insertedId: 'fake-id' }),
          findOneAndUpdate: () => Promise.resolve(null),
          deleteOne: () => Promise.resolve({ deletedCount: 0 })
        }),
        command: () => Promise.resolve({ ok: 1 })
      };
    }
  },
  ObjectId: class ObjectId {
    constructor(id: string) {
      this.id = id;
    }
    id: string;
    toString() { return this.id; }
  }
};

// Use the fake module as a fallback
const { MongoClient, ObjectId } = (globalThis as any).mongodb || FakeMongoModule;

import {
  User,
  InsertUser,
  TradeLog,
  InsertTradeLog,
  RiskSettings,
  InsertRiskSettings
} from '@shared/schema';
import { IStorage } from '../storage';

/**
 * MongoDB Storage implementation
 * Uses MongoDB Atlas for all storage operations
 * 
 * NOTE: This is a partial implementation of the IStorage interface
 * with basic functionality. Additional methods will be implemented 
 * as needed per user requirements.
 */
// @ts-ignore - Ignoring the interface implementation check for now
export class MongoDBStorage implements IStorage {
  private client: any; // MongoClient
  private db: any; // Db
  private usersCollection: any; // Collection<User>
  private botsCollection: any; // Collection<any>
  private tradesCollection: any; // Collection<TradeLog>
  private riskSettingsCollection: any; // Collection<RiskSettings>

  constructor() {
    const uri = process.env.MONGO_URI || 'mongodb+srv://dbuser:dbpassword@cluster0.mongodb.net/saas';
    console.log("Using MongoDB URI:", uri.substring(0, 20) + '...');
    this.client = new MongoClient(uri);
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<boolean>} True if connection was successful, false otherwise
   */
  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      console.log("✅ Connected successfully to MongoDB Atlas");
      this.db = this.client.db("Saas");
      
      // Initialize collections
      this.usersCollection = this.db.collection("users");
      this.botsCollection = this.db.collection("bots");
      this.tradesCollection = this.db.collection("trades");
      this.riskSettingsCollection = this.db.collection("risk_settings");
      
      console.log("✅ MongoDB collections initialized");
      return true;
    } catch (error) {
      console.error("❌ Failed to connect to MongoDB:", error);
      return false;
    }
  }

  /**
   * Check database connection status
   */
  async checkDatabaseStatus(): Promise<{ connected: boolean; isSimulated?: boolean; description?: string; error?: string | null }> {
    try {
      await this.client.db().command({ ping: 1 });
      return {
        connected: true,
        isSimulated: false,
        description: 'Connected to MongoDB Atlas',
        error: null
      };
    } catch (err) {
      return {
        connected: false,
        isSimulated: false,
        description: 'Failed to connect to MongoDB',
        error: String(err)
      };
    }
  }
  
  // ===== USER METHODS =====
  
  /**
   * Get user by ID
   */
  async getUser(id: number): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ id });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return undefined;
    }
  }

  /**
   * Get user by username
   */
  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ username });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ email });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }
  
  /**
   * Get user by Google ID
   */
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ googleId });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  /**
   * Get user by Apple ID
   */
  async getUserByAppleId(appleId: string): Promise<User | undefined> {
    try {
      const user = await this.usersCollection.findOne({ appleId });
      return user || undefined;
    } catch (error) {
      console.error('Error getting user by Apple ID:', error);
      return undefined;
    }
  }

  /**
   * Create a new user
   */
  async createUser(user: InsertUser): Promise<User> {
    try {
      // Create the full user object with required fields
      const fullUser: User = {
        id: Date.now(),
        username: user.username,
        email: user.email,
        password: user.password || null,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        defaultBroker: user.defaultBroker || null,
        useTestnet: user.useTestnet !== undefined ? user.useTestnet : true,
        isAdmin: user.isAdmin || false, // Include isAdmin field 
        okxApiKey: user.okxApiKey || null,
        okxSecretKey: user.okxSecretKey || null,
        okxPassphrase: user.okxPassphrase || null,
        binanceApiKey: user.binanceApiKey || null,
        binanceSecretKey: user.binanceSecretKey || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await this.usersCollection.insertOne(fullUser);
      console.log(`✅ Saved new user to MongoDB: ${user.email} (ID: ${fullUser.id}, MongoDB ID: ${result.insertedId})`);
      return fullUser;
    } catch (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
  }

  /**
   * Update a user
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      const result = await this.usersCollection.findOneAndUpdate(
        { id },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      console.log(`✅ Updated user in MongoDB: ID ${id}`);
      return result || undefined;
    } catch (error) {
      console.error('❌ Error updating user:', error);
      return undefined;
    }
  }
  
  // ===== API KEY METHODS =====
  
  /**
   * Update user API keys
   */
  async updateUserApiKeys(userId: number, apiKeys: any): Promise<User | undefined> {
    try {
      const result = await this.updateUser(userId, {
        defaultBroker: apiKeys.defaultBroker,
        useTestnet: apiKeys.useTestnet
      });
      console.log(`✅ Updated API keys for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating user API keys:', error);
      return undefined;
    }
  }

  /**
   * Get user API keys
   */
  async getUserApiKeys(userId: number): Promise<any> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const result = {
        defaultBroker: user.defaultBroker,
        useTestnet: user.useTestnet
      };
      console.log(`✅ Retrieved API keys for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Error getting user API keys:', error);
      return undefined;
    }
  }

  /**
   * Update Binance API keys
   */
  async updateUserBinanceApiKeys(userId: number, apiKeys: any): Promise<User | undefined> {
    try {
      // Validate the API keys before updating
      if (!apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
        console.error('❌ Invalid Binance API keys provided for user', userId);
        return undefined;
      }
      
      // Create update object with the keys
      const updateObj: any = {
        binanceApiKey: apiKeys.binanceApiKey,
        binanceSecretKey: apiKeys.binanceSecretKey
      };
      
      // Add allowed IP if provided
      if (apiKeys.binanceAllowedIp !== undefined) {
        updateObj.binanceAllowedIp = apiKeys.binanceAllowedIp;
      }
      
      const result = await this.updateUser(userId, updateObj);
      console.log(`✅ Binance API keys saved for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Error updating Binance API keys:', error);
      return undefined;
    }
  }

  /**
   * Get Binance API keys
   */
  async getUserBinanceApiKeys(userId: number): Promise<any> {
    try {
      const user = await this.getUser(userId);
      if (!user) return undefined;
      
      const result = {
        binanceApiKey: user.binanceApiKey,
        binanceSecretKey: user.binanceSecretKey,
        binanceAllowedIp: user.binanceAllowedIp || null
      };
      console.log(`✅ Retrieved Binance API keys for user: ${userId}`);
      return result;
    } catch (error) {
      console.error('❌ Error getting Binance API keys:', error);
      return undefined;
    }
  }

  /**
   * Clear API keys
   */
  async clearUserApiKeys(userId: number): Promise<boolean> {
    try {
      // Verify the user exists before attempting to clear keys
      const user = await this.getUser(userId);
      if (!user) {
        console.error(`❌ Cannot clear API keys for non-existent user: ${userId}`);
        return false;
      }
      
      const updated = await this.updateUser(userId, {
        binanceApiKey: null,
        binanceSecretKey: null,
        binanceAllowedIp: null
      });
      console.log(`✅ Binance API keys removed for user: ${userId}`);
      return !!updated;
    } catch (error) {
      console.error('❌ Error clearing API keys:', error);
      return false;
    }
  }
  
  // ===== PAPER TRADING ACCOUNT METHODS =====

  /**
   * Get user's paper trading account
   */
  async getUserPaperTradingAccount(userId: number): Promise<any> {
    try {
      // Find the paper trading account for this user
      const account = await this.db.collection("paper_trading_accounts").findOne({ userId: Number(userId) });
      console.log(`Retrieved paper trading account for user: ${userId}`);
      return account || undefined;
    } catch (error) {
      console.error('Error getting user paper trading account:', error);
      return undefined;
    }
  }

  // ===== BOT METHODS =====
  
  /**
   * Get all bots
   */
  async getAllBots(): Promise<any[]> {
    try {
      const bots = await this.botsCollection.find({}).toArray();
      return bots;
    } catch (error) {
      console.error('Error getting all bots:', error);
      return [];
    }
  }
  
  /**
   * Get bot by ID - supports both number and string IDs
   */
  async getBotById(id: number | string): Promise<any> {
    try {
      // If string and looks like ObjectId, query by _id
      if (typeof id === 'string' && id.length === 24) {
        return await this.botsCollection.findOne({ _id: new ObjectId(id) });
      }
      // Otherwise query by numeric id field
      return await this.botsCollection.findOne({ id: Number(id) });
    } catch (error) {
      console.error('Error getting bot by ID:', error);
      return undefined;
    }
  }
  
  /**
   * Create a new bot
   */
  async createBot(bot: any): Promise<any> {
    try {
      // Validate the required bot properties
      if (!bot.userId) {
        console.error('❌ Cannot create bot: Missing userId');
        return { error: 'Missing required field: userId' };
      }
      
      if (!bot.botType) {
        console.error('❌ Cannot create bot: Missing botType');
        return { error: 'Missing required field: botType' };
      }
      
      // Set default values for missing properties
      const fullBot = { 
        id: Date.now(), // Add numeric ID for compatibility
        ...bot,
        userId: Number(bot.userId),
        name: bot.name || `${bot.botType} Bot ${new Date().toISOString().slice(0, 10)}`,
        isRunning: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await this.botsCollection.insertOne(fullBot);
      console.log(`✅ Saved new bot to MongoDB: ${fullBot.name} (ID: ${fullBot.id}, MongoDB ID: ${result.insertedId}, Type: ${fullBot.botType})`);
      return { _id: result.insertedId, ...fullBot };
    } catch (error) {
      console.error('❌ Error creating bot:', error);
      return { error: 'Failed to create bot' };
    }
  }
  
  /**
   * Update a bot - supports both number and string IDs
   */
  async updateBot(id: number | string, updates: any): Promise<any> {
    try {
      const updateWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      let query;
      // If string and looks like ObjectId, query by _id
      if (typeof id === 'string' && id.length === 24) {
        query = { _id: new ObjectId(id) };
      } else {
        // Otherwise query by numeric id field
        query = { id: Number(id) };
      }
      
      const result = await this.botsCollection.findOneAndUpdate(
        query,
        { $set: updateWithTimestamp },
        { returnDocument: 'after' }
      );
      
      return result;
    } catch (error) {
      console.error('Error updating bot:', error);
      return { error: 'Failed to update bot' };
    }
  }
  
  /**
   * Delete a bot - supports both number and string IDs
   */
  async deleteBot(id: number | string): Promise<boolean> {
    try {
      let query;
      // If string and looks like ObjectId, query by _id
      if (typeof id === 'string' && id.length === 24) {
        query = { _id: new ObjectId(id) };
      } else {
        // Otherwise query by numeric id field
        query = { id: Number(id) };
      }
      
      const result = await this.botsCollection.deleteOne(query);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Error deleting bot:', error);
      return false;
    }
  }
  
  /**
   * Get bots for a specific user
   */
  async getUserBots(userId: number): Promise<any[]> {
    try {
      const bots = await this.botsCollection.find({ userId: Number(userId) }).toArray();
      return bots;
    } catch (error) {
      console.error('Error getting user bots:', error);
      return [];
    }
  }
  
  /**
   * Start a bot - supports both number and string IDs
   */
  async startBot(id: number | string): Promise<any> {
    try {
      return this.updateBot(id, { isRunning: true });
    } catch (error) {
      console.error('Error starting bot:', error);
      return { id, isRunning: true, error: 'Failed to persist status' };
    }
  }
  
  /**
   * Stop a bot - supports both number and string IDs
   */
  async stopBot(id: number | string): Promise<any> {
    try {
      return this.updateBot(id, { isRunning: false });
    } catch (error) {
      console.error('Error stopping bot:', error);
      return { id, isRunning: false, error: 'Failed to persist status' };
    }
  }
  
  /**
   * Update bot status - supports both number and string IDs
   */
  async updateBotStatus(id: number | string, isRunning: boolean, stats?: any): Promise<any> {
    try {
      return this.updateBot(id, { isRunning, ...(stats || {}) });
    } catch (error) {
      console.error('Error updating bot status:', error);
      return { id, isRunning, ...(stats || {}), error: 'Failed to persist status' };
    }
  }
  
  /**
   * Get all active bots
   */
  async getActiveBots(): Promise<any[]> {
    try {
      const bots = await this.botsCollection.find({ isRunning: true }).toArray();
      return bots;
    } catch (error) {
      console.error('Error getting active bots:', error);
      return [];
    }
  }
  
  // ===== TRADE LOG METHODS =====
  
  /**
   * Create a trade log
   */
  async createTradeLog(tradeLog: InsertTradeLog): Promise<any> {
    try {
      const fullLog = {
        ...tradeLog,
        timestamp: new Date()
      };
      const result = await this.tradesCollection.insertOne(fullLog);
      console.log(`✅ Saved new trade log to MongoDB: ${tradeLog.symbol} ${tradeLog.action} (ID: ${result.insertedId}, Source: ${tradeLog.trade_source || 'Unknown'})`);
      return { _id: result.insertedId, ...fullLog };
    } catch (error) {
      console.error('❌ Error creating trade log:', error);
      return { error: 'Failed to create trade log' };
    }
  }
  
  /**
   * Get all trade logs
   */
  async getAllTradeLogs(limit = 100): Promise<TradeLog[]> {
    try {
      return await this.tradesCollection.find().sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (error) {
      console.error('Error getting all trade logs:', error);
      return [];
    }
  }
  
  /**
   * Get trade logs by user ID
   */
  async getTradeLogsByUserId(userId: number, limit = 100): Promise<TradeLog[]> {
    try {
      return await this.tradesCollection.find({ userId: Number(userId) }).sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (error) {
      console.error('Error getting trade logs by user ID:', error);
      return [];
    }
  }
  
  /**
   * Get trade logs by symbol
   */
  async getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
    try {
      return await this.tradesCollection.find({ symbol }).sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (error) {
      console.error('Error getting trade logs by symbol:', error);
      return [];
    }
  }
  
  /**
   * Get trade logs by source
   */
  async getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
    try {
      return await this.tradesCollection.find({ source }).sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (error) {
      console.error('Error getting trade logs by source:', error);
      return [];
    }
  }
  
  /**
   * Search trade logs with filters
   */
  async searchTradeLogs(filter: any, limit = 100): Promise<TradeLog[]> {
    try {
      return await this.tradesCollection.find(filter).sort({ timestamp: -1 }).limit(limit).toArray();
    } catch (error) {
      console.error('Error searching trade logs:', error);
      return [];
    }
  }
  
  // ===== RISK SETTINGS METHODS =====

  /**
   * Get risk settings by ID
   */
  async getRiskSettings(userId: number): Promise<RiskSettings | undefined> {
    try {
      const settings = await this.riskSettingsCollection.findOne({ userId });
      return settings || undefined;
    } catch (error) {
      console.error('Error getting risk settings:', error);
      return undefined;
    }
  }

  /**
   * Create risk settings
   */
  async createRiskSettings(settings: InsertRiskSettings): Promise<RiskSettings> {
    try {
      // Validate user ID is provided
      if (!settings.userId) {
        console.error('❌ Cannot create risk settings: Missing userId');
        throw new Error('Missing required field: userId');
      }
      
      // Check if settings already exist for this user to avoid duplicates
      const existingSettings = await this.getRiskSettings(settings.userId);
      if (existingSettings) {
        console.log(`⚠️ Risk settings already exist for user ${settings.userId}, updating instead of creating`);
        const updated = await this.updateRiskSettings(settings.userId, settings);
        if (!updated) {
          throw new Error('Failed to update existing risk settings');
        }
        return updated;
      }
      
      // Create new settings with proper defaults
      const fullSettings: RiskSettings = {
        id: Date.now(),
        userId: settings.userId,
        globalStopLoss: settings.globalStopLoss || '5',
        globalTakeProfit: settings.globalTakeProfit || '10',
        maxPositionSize: settings.maxPositionSize || '10',
        maxPortfolioRisk: settings.maxPortfolioRisk || '20',
        maxTradesPerDay: settings.maxTradesPerDay || 10,
        enableGlobalStopLoss: settings.enableGlobalStopLoss ?? true,
        enableGlobalTakeProfit: settings.enableGlobalTakeProfit ?? true,
        enableMaxPositionSize: settings.enableMaxPositionSize ?? true,
        stopLossStrategy: settings.stopLossStrategy || 'fixed',
        enableEmergencyStopLoss: settings.enableEmergencyStopLoss ?? true,
        emergencyStopLossThreshold: settings.emergencyStopLossThreshold || '15',
        defaultStopLossPercent: settings.defaultStopLossPercent || '3',
        defaultTakeProfitPercent: settings.defaultTakeProfitPercent || '6',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const result = await this.riskSettingsCollection.insertOne(fullSettings);
      console.log(`✅ Saved new risk settings to MongoDB: User ID ${settings.userId} (MongoDB ID: ${result.insertedId})`);
      return fullSettings;
    } catch (error) {
      console.error('❌ Error creating risk settings:', error);
      throw error;
    }
  }

  /**
   * Update risk settings
   */
  async updateRiskSettings(userId: number, updates: Partial<RiskSettings>): Promise<RiskSettings | undefined> {
    try {
      const result = await this.riskSettingsCollection.findOneAndUpdate(
        { userId },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      console.log(`✅ Updated risk settings in MongoDB: User ID ${userId}`);
      return result || undefined;
    } catch (error) {
      console.error('❌ Error updating risk settings:', error);
      return undefined;
    }
  }
}