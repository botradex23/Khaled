import { MongoClient, ObjectId } from 'mongodb';
import {
  InsertPaperTradingAccount,
  InsertRiskSettings,
  InsertTradeLog,
  InsertUser,
  PaperTradingAccount,
  RiskSettings,
  TradeLog,
  User,
} from '@shared/schema';
import { IStorage } from '../storage';

export class MongoDBStorage implements IStorage {
  private client: MongoClient;
  private db: any;
  private usersCollection: any;
  private botsCollection: any;
  private tradesCollection: any;
  private riskSettingsCollection: any;

  constructor() {
    // Explicitly read environment variables from process.env
    console.log('📦 Checking MongoDB environment variables...');
    
    // Load dotenv directly if needed, this is a backup approach
    try {
      require('dotenv').config();
    } catch (err) {
      console.warn('⚠️ Could not load dotenv, assuming environment variables are already set');
    }
    
    // Check if MONGO_URI is set in environment
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI environment variable is required but not set');
    }
    
    // Check for both MONGO_URI and MONGODB_URI environment variables
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    
    if (!mongoUri) {
      console.error('❌ Neither MONGO_URI nor MONGODB_URI environment variables are found');
      console.error('Available environment variables:', Object.keys(process.env)
        .filter(key => !key.includes('KEY') && !key.includes('SECRET'))
        .join(', '));
      throw new Error('MongoDB connection URI is required but not found in environment variables');
    }
    
    console.log(`📊 MongoDB URI found with format: ${mongoUri.substring(0, 20)}...`);
    const uri = mongoUri;
    console.log(`📦 MongoDB URI found (length: ${uri.length})`);
  
    console.log("MongoDB URI:", uri.substring(0, 20) + '...');
    
    // Extract database name for logging
    const dbName = uri.split('/').pop()?.split('?')[0] || 'unknown';
    console.log("MongoDB Database Name:", dbName);
    
    // Initialize the MongoClient
    this.client = new MongoClient(uri);
    
    // Initialize collections as null (they will be properly set during connect)
    this.usersCollection = null;
    this.botsCollection = null;
    this.tradesCollection = null;
    this.riskSettingsCollection = null;
  }

  /**
   * Connect to MongoDB database
   * @returns {Promise<boolean>} True if connection was successful, false otherwise
   */
  async connect(): Promise<boolean> {
    try {
      await this.client.connect();
      console.log("✅ Connected successfully to MongoDB Atlas");
      
      // Extract database name from MongoDB URI
      const uri = process.env.MONGO_URI || process.env.MONGODB_URI || '';
      const dbName = uri.split('/').pop()?.split('?')[0] || 'Saas';
      
      console.log(`Using MongoDB database: ${dbName}`);
      this.db = this.client.db(dbName);
      
      if (!this.db) {
        throw new Error('Failed to get database reference');
      }
      
      // List of required collections
      const requiredCollections = [
        "users",
        "bots",
        "trades",
        "risk_settings",
        "paper_trading_accounts"
      ];
      
      // Get a list of existing collections
      const collections = await this.db.listCollections().toArray();
      const existingCollections = collections.map((c: any) => c.name);
      
      console.log("Existing collections:", existingCollections);
      
      // Create any missing collections
      for (const collName of requiredCollections) {
        if (!existingCollections.includes(collName)) {
          console.log(`Creating missing collection: ${collName}`);
          await this.db.createCollection(collName);
        }
      }
      
      // Initialize collections with explicit error checking
      try {
        this.usersCollection = this.db.collection("users");
        this.botsCollection = this.db.collection("bots");
        this.tradesCollection = this.db.collection("trades");
        this.riskSettingsCollection = this.db.collection("risk_settings");
      } catch (error) {
        const collErr = error as Error;
        console.error('Failed to initialize collections:', collErr);
        throw new Error(`Collection initialization failed: ${collErr.message}`);
      }
      
      // Verify collections were properly initialized
      if (!this.usersCollection || !this.botsCollection || 
          !this.tradesCollection || !this.riskSettingsCollection) {
        throw new Error('One or more collections failed to initialize properly');
      }
      
      console.log("✅ MongoDB collections initialized successfully");
      
      return true;
    } catch (error) {
      console.error("❌ CRITICAL ERROR: Failed to connect to MongoDB:", error);
      throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : String(error)}`);
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
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
      console.log(`🔍 Looking for user with ID: ${id}`);
      
      // First try to find by numeric ID
      let user = await this.usersCollection.findOne({ id: Number(id) });
      
      if (!user) {
        // If not found by numeric ID, try to find by MongoDB _id
        try {
          // Only attempt if ID looks like an ObjectId (24 hex chars)
          if (typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id as any)) {
            user = await this.usersCollection.findOne({ _id: new ObjectId(id as any) });
          }
        } catch (innerError) {
          console.log('Not a valid MongoDB ObjectId, skipping _id lookup');
        }
      }
      
      if (user) {
        console.log(`✅ Found user with ID: ${id}`);
      } else {
        console.log(`❌ No user found with ID: ${id}`);
      }
      
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
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
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
      console.log(`🔍 Looking for user with email: ${email} in MongoDB collection`);
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      const user = await this.usersCollection.findOne({ email });
      
      if (user) {
        console.log(`✅ Found user with email: ${email} in MongoDB (ID: ${user.id})`);
        
        // Log some details about the user (without sensitive info)
        const userDetails = {
          id: user.id,
          username: user.username,
          email: user.email,
          isAdmin: user.isAdmin,
          createdAt: user.createdAt,
          hasBinanceKeys: !!user.binanceApiKey,
          hasOkxKeys: !!user.okxApiKey
        };
        console.log('User details:', userDetails);
      } else {
        console.log(`❌ No user found with email: ${email} in MongoDB`);
      }
      
      return user || undefined;
    } catch (error) {
      console.error('❌ Error getting user by email:', error);
      return undefined;
    }
  }
  
  /**
   * Get user by Google ID
   */
  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
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
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
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
      // Make sure collections are initialized
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized, attempting to initialize it now');
        if (this.db) {
          this.usersCollection = this.db.collection("users");
        } else {
          throw new Error('Database reference is not available');
        }
      }
      
      // Make sure usersCollection is initialized before using it
      if (!this.usersCollection) {
        throw new Error('Users collection could not be initialized');
      }
      
      // Log the start of user creation process with database info
      console.log(`📝 Creating new user in MongoDB - Database: ${this.db?.databaseName || 'unknown'}`);
      console.log(`📝 User creation details: email=${user.email}, username=${user.username}, isAdmin=${!!user.isAdmin}`);
      
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
        binanceAllowedIp: user.binanceAllowedIp || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Check if a user with the same email already exists (to avoid duplicates)
      const existingUser = await this.usersCollection.findOne({ email: user.email });
      if (existingUser) {
        console.log(`⚠️ A user with email ${user.email} already exists in MongoDB. ID: ${existingUser.id}`);
        return existingUser;
      }
      
      // Insert the new user into MongoDB
      const result = await this.usersCollection.insertOne(fullUser);
      console.log(`✅ Successfully saved new user to MongoDB:`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - ID: ${fullUser.id}`);
      console.log(`   - MongoDB ID: ${result.insertedId}`);
      console.log(`   - Admin: ${fullUser.isAdmin ? 'Yes' : 'No'}`);
      console.log(`   - Created at: ${fullUser.createdAt}`);
      
      // Verify the user was created by retrieving it
      const verifyUser = await this.usersCollection.findOne({ id: fullUser.id });
      if (verifyUser) {
        console.log(`✅ Verified user was correctly saved to MongoDB`);
      } else {
        console.warn(`⚠️ Could not verify user was saved (not found in immediate query)`);
      }
      
      return fullUser;
    } catch (error) {
      console.error('❌ CRITICAL ERROR creating user:', error);
      console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      throw new Error(`Failed to create user: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Update a user
   */
  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    try {
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
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
      if (!this.usersCollection) {
        console.error('❌ Users collection is not initialized');
        return undefined;
      }
      
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
  
  // Minimal implementation for the interface required methods
  
  async getUserPaperTradingAccount(userId: number): Promise<any> {
    try {
      if (!this.db) {
        console.error('❌ Database reference is not initialized');
        return undefined;
      }

      const account = await this.db.collection("paper_trading_accounts").findOne({ userId: Number(userId) });
      return account || undefined;
    } catch (error) {
      console.error('Error getting paper trading account:', error);
      return undefined;
    }
  }

  async createPaperTradingAccount(account: InsertPaperTradingAccount): Promise<PaperTradingAccount> {
    try {
      if (!this.db) {
        throw new Error('Database not initialized');
      }
      
      // First create default user if needed
      if (Number(account.userId) === 1) {
        try {
          // Check if user already exists
          const existingUser = await this.getUserByEmail('admin@example.com');
          if (!existingUser) {
            await this.createUser({
              id: 1,
              username: 'admin',
              email: 'admin@example.com',
              password: 'admin123',
              isAdmin: true
            } as InsertUser);
          }
        } catch (error) {
          console.error('Failed to create or verify default user:', error);
        }
      }
      
      // Create base account object
      const fullAccount: PaperTradingAccount = {
        id: Date.now(),
        userId: Number(account.userId),
        initialBalance: account.initialBalance || "10000",
        currentBalance: account.currentBalance || account.initialBalance || "10000",
        totalProfitLoss: "0",
        totalProfitLossPercent: "0",
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Insert the account
      await this.db.collection("paper_trading_accounts").insertOne(fullAccount);
      return fullAccount;
    } catch (error) {
      console.error('Error creating paper trading account:', error);
      throw new Error(`Failed to create paper trading account: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Other required methods with minimal implementation
  async getAllBots(): Promise<any[]> {
    return [];
  }
  
  async getBotById(id: number | string): Promise<any> {
    return undefined;
  }
  
  async createBot(bot: any): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async updateBot(id: number | string, updates: any): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async deleteBot(id: number | string): Promise<boolean> {
    return false;
  }
  
  async getUserBots(userId: number): Promise<any[]> {
    return [];
  }
  
  async startBot(id: number | string): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async stopBot(id: number | string): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async updateBotStatus(id: number | string, isRunning: boolean, stats?: any): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async getActiveBots(): Promise<any[]> {
    return [];
  }
  
  async createTradeLog(tradeLog: InsertTradeLog): Promise<any> {
    return { error: 'Not implemented' };
  }
  
  async getAllTradeLogs(limit = 100): Promise<TradeLog[]> {
    return [];
  }
  
  async getTradeLogsByUserId(userId: number, limit = 100): Promise<TradeLog[]> {
    return [];
  }
  
  async getTradeLogsBySymbol(symbol: string, limit = 100): Promise<TradeLog[]> {
    return [];
  }
  
  async getTradeLogsBySource(source: string, limit = 100): Promise<TradeLog[]> {
    return [];
  }
  
  async searchTradeLogs(filter: any, limit = 100): Promise<TradeLog[]> {
    return [];
  }
  
  async getRiskSettings(userId: number): Promise<RiskSettings | undefined> {
    return undefined;
  }
  
  async createRiskSettings(settings: InsertRiskSettings): Promise<RiskSettings> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    // Create baseline settings
    const fullSettings: RiskSettings = {
      id: Date.now(),
      userId: Number(settings.userId),
      maxRiskPerTrade: settings.maxRiskPerTrade || "1.0",
      maxDailyLoss: settings.maxDailyLoss || "5.0",
      maxWeeklyLoss: settings.maxWeeklyLoss || "15.0",
      maxMonthlyLoss: settings.maxMonthlyLoss || "30.0",
      maxOpenTrades: settings.maxOpenTrades || 5,
      maxDailyTrades: settings.maxDailyTrades || 10,
      stopLossEnabled: settings.stopLossEnabled !== undefined ? settings.stopLossEnabled : true,
      takeProfitEnabled: settings.takeProfitEnabled !== undefined ? settings.takeProfitEnabled : true,
      enableNotifications: settings.enableNotifications !== undefined ? settings.enableNotifications : true,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Insert settings
    await this.riskSettingsCollection.insertOne(fullSettings);
    return fullSettings;
  }
  
  async updateRiskSettings(userId: number, updates: Partial<RiskSettings>): Promise<RiskSettings | undefined> {
    try {
      if (!this.riskSettingsCollection) {
        console.error('❌ Risk settings collection is not initialized');
        return undefined;
      }
      
      const result = await this.riskSettingsCollection.findOneAndUpdate(
        { userId: Number(userId) },
        { $set: { ...updates, updatedAt: new Date() } },
        { returnDocument: 'after' }
      );
      return result || undefined;
    } catch (error) {
      console.error('Error updating risk settings:', error);
      return undefined;
    }
  }
}