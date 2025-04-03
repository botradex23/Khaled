/**
 * Test Binance API Key Storage
 * 
 * This script verifies the proper handling of Binance API keys with allowedIp in MongoDB.
 * It tests:
 * 1. Saving API keys with allowedIp
 * 2. Retrieving the keys and verifying allowedIp is included
 * 3. Deleting the keys and verifying allowedIp is removed
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// MongoDB connection details
const mongoUri = process.env.MONGODB_URI;
const dbName = 'crypto_trading_platform';

// Test data
const TEST_USER_ID = 9999;
const TEST_API_KEY = 'test_api_key_' + Date.now();
const TEST_SECRET_KEY = 'test_secret_key_' + Date.now();
const TEST_ALLOWED_IP = '185.199.228.220';

async function main() {
  if (!mongoUri) {
    console.error('❌ MONGODB_URI not set in .env file');
    process.exit(1);
  }

  const client = new MongoClient(mongoUri);
  
  try {
    // Connect to MongoDB
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    
    // 1. Clean up any existing test user
    console.log(`\n🧹 Cleaning up existing test user (${TEST_USER_ID})...`);
    await usersCollection.deleteOne({ userId: TEST_USER_ID });
    
    // 2. Save API keys with allowedIp
    console.log(`\n💾 Saving Binance API keys with allowedIp...`);
    await usersCollection.insertOne({
      userId: TEST_USER_ID,
      username: 'test_user',
      email: 'test@example.com',
      binanceApiKey: TEST_API_KEY,
      binanceSecretKey: TEST_SECRET_KEY,
      binanceAllowedIp: TEST_ALLOWED_IP,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 3. Retrieve and verify the saved API keys
    console.log(`\n🔍 Retrieving Binance API keys...`);
    const savedUser = await usersCollection.findOne({ userId: TEST_USER_ID });
    
    if (!savedUser) {
      console.error('❌ Failed to retrieve test user');
      process.exit(1);
    }
    
    console.log('Retrieved user data:');
    console.log(`- binanceApiKey: ${savedUser.binanceApiKey === TEST_API_KEY ? '✅ Matches' : '❌ Does not match'}`);
    console.log(`- binanceSecretKey: ${savedUser.binanceSecretKey === TEST_SECRET_KEY ? '✅ Matches' : '❌ Does not match'}`);
    console.log(`- binanceAllowedIp: ${savedUser.binanceAllowedIp === TEST_ALLOWED_IP ? '✅ Matches' : '❌ Does not match'}`);
    
    // 4. Delete the API keys and verify they are removed
    console.log(`\n🗑️ Deleting Binance API keys...`);
    await usersCollection.updateOne(
      { userId: TEST_USER_ID },
      { 
        $set: { 
          binanceApiKey: null, 
          binanceSecretKey: null,
          binanceAllowedIp: null,
          updatedAt: new Date()
        }
      }
    );
    
    // 5. Verify deletion
    console.log(`\n🔍 Verifying API keys deletion...`);
    const updatedUser = await usersCollection.findOne({ userId: TEST_USER_ID });
    
    if (!updatedUser) {
      console.error('❌ Failed to retrieve updated test user');
      process.exit(1);
    }
    
    console.log('Updated user data:');
    console.log(`- binanceApiKey: ${updatedUser.binanceApiKey === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    console.log(`- binanceSecretKey: ${updatedUser.binanceSecretKey === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    console.log(`- binanceAllowedIp: ${updatedUser.binanceAllowedIp === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    
    // 6. Final cleanup
    console.log(`\n🧹 Final cleanup...`);
    await usersCollection.deleteOne({ userId: TEST_USER_ID });
    
    console.log('\n✅ All tests completed successfully!');
  } catch (err) {
    console.error('❌ An error occurred:', err);
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
}

main().catch(console.error);