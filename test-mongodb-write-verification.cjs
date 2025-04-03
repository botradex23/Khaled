/**
 * MongoDB Write Verification Test
 * 
 * This script tests the MongoDB storage layer by:
 * 1. Creating a test user
 * 2. Creating a test bot
 * 3. Logging a sample trade
 * 4. Creating risk settings
 * 5. Verifying all documents exist in their respective collections
 */

const { MongoClient } = require('mongodb');
require('dotenv').config();

const uri = process.env.MONGO_URI;
if (!uri) {
  console.error('❌ MONGO_URI environment variable is not set');
  process.exit(1);
}

// Test data
const testUser = {
  username: `test_user_${Date.now()}`,
  email: `test_${Date.now()}@example.com`,
  password: 'hashedPassword123',
  firstName: 'Test',
  lastName: 'User',
  defaultBroker: 'binance',
  useTestnet: true,
  binanceApiKey: null,
  binanceSecretKey: null
};

const testBot = {
  userId: null, // Will be set after user creation
  name: `Test Bot ${new Date().toISOString().slice(0, 10)}`,
  botType: 'AI_GRID',
  tradingPair: 'BTCUSDT',
  status: 'IDLE',
  isRunning: false,
  config: {
    upperLimit: '75000',
    lowerLimit: '65000',
    gridLines: 10,
    investmentAmount: '1000'
  }
};

const testTradeLog = {
  symbol: 'BTCUSDT',
  action: 'BUY',
  entry_price: '70345.50',
  quantity: '0.01',
  trade_source: 'TEST',
  status: 'EXECUTED',
  predicted_confidence: '0.85',
  reason: 'Testing MongoDB write verification'
};

const testRiskSettings = {
  globalStopLoss: '5',
  globalTakeProfit: '10',
  maxPositionSize: '10',
  maxPortfolioRisk: '15',
  maxTradesPerDay: 15,
  enableGlobalStopLoss: true,
  enableGlobalTakeProfit: true,
  enableMaxPositionSize: true,
  stopLossStrategy: 'fixed',
  enableEmergencyStopLoss: true,
  emergencyStopLossThreshold: '20',
  defaultStopLossPercent: '3',
  defaultTakeProfitPercent: '6'
};

// MongoDB collections
let users;
let bots;
let tradeLogs;
let riskSettings;
let client;
let db;

async function connectToMongoDB() {
  try {
    console.log('🔄 Connecting to MongoDB Atlas...');
    client = new MongoClient(uri);
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    db = client.db();
    users = db.collection('users');
    bots = db.collection('bots');
    tradeLogs = db.collection('tradeLogs');
    riskSettings = db.collection('riskSettings');
    
    return true;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    return false;
  }
}

async function createTestUser() {
  try {
    const fullUser = {
      ...testUser,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await users.insertOne(fullUser);
    console.log(`✅ Created test user: ${fullUser.username} (ID: ${fullUser.id}, MongoDB ID: ${result.insertedId})`);
    return { _id: result.insertedId, ...fullUser };
  } catch (error) {
    console.error('❌ Failed to create test user:', error);
    return null;
  }
}

async function createTestBot(userId) {
  try {
    const fullBot = {
      ...testBot,
      userId: userId,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await bots.insertOne(fullBot);
    console.log(`✅ Created test bot: ${fullBot.name} (ID: ${fullBot.id}, MongoDB ID: ${result.insertedId})`);
    return { _id: result.insertedId, ...fullBot };
  } catch (error) {
    console.error('❌ Failed to create test bot:', error);
    return null;
  }
}

async function createTestTradeLog(userId) {
  try {
    const fullLog = {
      ...testTradeLog,
      userId: userId,
      timestamp: new Date()
    };
    
    const result = await tradeLogs.insertOne(fullLog);
    console.log(`✅ Created test trade log: ${fullLog.symbol} ${fullLog.action} (MongoDB ID: ${result.insertedId})`);
    return { _id: result.insertedId, ...fullLog };
  } catch (error) {
    console.error('❌ Failed to create test trade log:', error);
    return null;
  }
}

async function createTestRiskSettings(userId) {
  try {
    const fullSettings = {
      ...testRiskSettings,
      userId: userId,
      id: Date.now(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await riskSettings.insertOne(fullSettings);
    console.log(`✅ Created test risk settings for user ID ${userId} (MongoDB ID: ${result.insertedId})`);
    return { _id: result.insertedId, ...fullSettings };
  } catch (error) {
    console.error('❌ Failed to create test risk settings:', error);
    return null;
  }
}

async function verifyDocumentExists(collection, filter) {
  try {
    const result = await collection.findOne(filter);
    return !!result;
  } catch (error) {
    console.error(`❌ Failed to verify document in ${collection.collectionName}:`, error);
    return false;
  }
}

async function runTest() {
  let success = true;
  
  if (!(await connectToMongoDB())) {
    process.exit(1);
  }
  
  try {
    // Step 1: Create a test user
    console.log('\n🧪 Step 1: Creating test user...');
    const user = await createTestUser();
    if (!user) {
      console.error('❌ Test failed: Unable to create user');
      success = false;
    } else {
      const userExists = await verifyDocumentExists(users, { id: user.id });
      console.log(`${userExists ? '✅' : '❌'} User exists in MongoDB: ${userExists}`);
      success = success && userExists;
      
      // Step 2: Create a test bot
      console.log('\n🧪 Step 2: Creating test bot...');
      const bot = await createTestBot(user.id);
      if (!bot) {
        console.error('❌ Test failed: Unable to create bot');
        success = false;
      } else {
        const botExists = await verifyDocumentExists(bots, { id: bot.id });
        console.log(`${botExists ? '✅' : '❌'} Bot exists in MongoDB: ${botExists}`);
        success = success && botExists;
      }
      
      // Step 3: Create a test trade log
      console.log('\n🧪 Step 3: Creating test trade log...');
      const tradeLog = await createTestTradeLog(user.id);
      if (!tradeLog) {
        console.error('❌ Test failed: Unable to create trade log');
        success = false;
      } else {
        const tradeLogExists = await verifyDocumentExists(tradeLogs, { _id: tradeLog._id });
        console.log(`${tradeLogExists ? '✅' : '❌'} Trade log exists in MongoDB: ${tradeLogExists}`);
        success = success && tradeLogExists;
      }
      
      // Step 4: Create test risk settings
      console.log('\n🧪 Step 4: Creating test risk settings...');
      const settings = await createTestRiskSettings(user.id);
      if (!settings) {
        console.error('❌ Test failed: Unable to create risk settings');
        success = false;
      } else {
        const settingsExist = await verifyDocumentExists(riskSettings, { id: settings.id });
        console.log(`${settingsExist ? '✅' : '❌'} Risk settings exist in MongoDB: ${settingsExist}`);
        success = success && settingsExist;
      }
    }
    
    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`${success ? '✅ All tests passed! MongoDB is working correctly.' : '❌ Some tests failed. Check the logs above.'}`);
    console.log('MongoDB collections tested:');
    console.log('- users');
    console.log('- bots');
    console.log('- tradeLogs');
    console.log('- riskSettings');

  } catch (error) {
    console.error('❌ Unexpected error during test:', error);
    success = false;
  } finally {
    if (client) {
      await client.close();
      console.log('\n🔄 MongoDB connection closed');
    }
    
    return success;
  }
}

// Run the test
runTest().then(success => {
  process.exit(success ? 0 : 1);
});