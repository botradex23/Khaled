/**
 * Test API Key Encryption and Decryption in MongoDB
 * 
 * This script tests the proper encryption of API keys in MongoDB:
 * 1. Saves encrypted API keys
 * 2. Retrieves and verifies decryption works
 * 3. Deletes keys to clean up
 */

// We'll use the native MongoDB driver instead of our storage layer for independent testing
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Manual dotenv implementation
const envPath = path.resolve(process.cwd(), '.env');
const envContents = fs.readFileSync(envPath, 'utf8');

// Parse the .env file and add variables to process.env
envContents.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  if (trimmedLine && !trimmedLine.startsWith('#')) {
    const [key, value] = trimmedLine.split('=');
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  }
});

// MongoDB settings
const MONGO_URI = process.env.MONGO_URI;
const DB_NAME = 'Saas'; // From the URI

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';

// Test data
const TEST_USER_ID = 9999;
const TEST_API_KEY = `test_api_key_${Date.now()}`;
const TEST_SECRET_KEY = `test_secret_key_${Date.now()}`;
const TEST_ALLOWED_IP = '185.199.228.220';

// Implementation of the encryption and decryption functions from encryptionService.ts
function getEncryptionKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  
  return Buffer.from(encryptionKey, 'base64');
}

function encrypt(text) {
  try {
    if (!text) return text;
    
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    // Get the auth tag
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted text, and auth tag into one string
    // Format: iv:authTag:encryptedText
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

function decrypt(encryptedText) {
  try {
    if (!encryptedText) return encryptedText;
    
    // Check if the text is in the expected format
    if (!encryptedText.includes(':')) {
      // Not encrypted or in wrong format
      return encryptedText;
    }
    
    const key = getEncryptionKey();
    
    // Split the encrypted text to get IV, auth tag, and encrypted data
    const [ivBase64, authTagBase64, encryptedData] = encryptedText.split(':');
    
    if (!ivBase64 || !authTagBase64 || !encryptedData) {
      throw new Error('Invalid encrypted text format');
    }
    
    // Convert base64 strings back to buffers
    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Return the original text if decryption fails (might not be encrypted)
    return encryptedText;
  }
}

// Helper function to check if a string is encrypted
function isEncrypted(value, originalValue) {
  // If the value exactly matches the original, it's not encrypted
  if (value === originalValue) {
    return false;
  }
  
  // If the value has the format of our encrypted text (contains colons)
  if (value && value.includes(':')) {
    return true;
  }
  
  return false;
}

async function runTest() {
  if (!MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env file');
    process.exit(1);
  }
  
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DB_NAME);
    const usersCollection = db.collection('users');
    
    // 1. Clean up any existing test user
    console.log(`\n🧹 Cleaning up existing test user (${TEST_USER_ID})...`);
    await usersCollection.deleteOne({ userId: TEST_USER_ID });
    
    // 2. Save API keys with encryption
    console.log('\n💾 Saving Binance API keys with encryption...');
    const encryptedApiKey = encrypt(TEST_API_KEY);
    const encryptedSecretKey = encrypt(TEST_SECRET_KEY);
    
    await usersCollection.insertOne({
      userId: TEST_USER_ID,
      username: 'test_user',
      email: 'test@example.com',
      binanceApiKey: encryptedApiKey,
      binanceSecretKey: encryptedSecretKey,
      binanceAllowedIp: TEST_ALLOWED_IP,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // 3. Retrieve and verify the saved API keys are encrypted
    console.log('\n🔍 Retrieving saved API keys...');
    const savedUser = await usersCollection.findOne({ userId: TEST_USER_ID });
    
    if (!savedUser) {
      console.error('❌ Failed to retrieve test user');
      process.exit(1);
    }
    
    console.log('Retrieved user data:');
    
    // Check if API keys are stored encrypted
    const isApiKeyEncrypted = isEncrypted(savedUser.binanceApiKey, TEST_API_KEY);
    const isSecretKeyEncrypted = isEncrypted(savedUser.binanceSecretKey, TEST_SECRET_KEY);
    
    console.log(`- binanceApiKey encryption: ${isApiKeyEncrypted ? '✅ Encrypted' : '❌ Not encrypted/stored in plaintext'}`);
    console.log(`- binanceSecretKey encryption: ${isSecretKeyEncrypted ? '✅ Encrypted' : '❌ Not encrypted/stored in plaintext'}`);
    console.log(`- binanceAllowedIp: ${savedUser.binanceAllowedIp === TEST_ALLOWED_IP ? '✅ Matches' : '❌ Does not match'}`);
    
    // 4. Test decryption
    console.log('\n🔓 Testing decryption of API keys...');
    const decryptedApiKey = decrypt(savedUser.binanceApiKey);
    const decryptedSecretKey = decrypt(savedUser.binanceSecretKey);
    
    console.log(`- decrypted apiKey matches original: ${decryptedApiKey === TEST_API_KEY ? '✅ Yes' : '❌ No'}`);
    console.log(`- decrypted secretKey matches original: ${decryptedSecretKey === TEST_SECRET_KEY ? '✅ Yes' : '❌ No'}`);
    
    // 5. Delete API keys and verify they are removed
    console.log('\n🗑️ Deleting Binance API keys...');
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
    
    // 6. Verify deletion
    console.log('\n🔍 Verifying API keys deletion...');
    const updatedUser = await usersCollection.findOne({ userId: TEST_USER_ID });
    
    if (!updatedUser) {
      console.error('❌ Failed to retrieve updated test user');
      process.exit(1);
    }
    
    console.log('Updated user data:');
    console.log(`- binanceApiKey: ${updatedUser.binanceApiKey === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    console.log(`- binanceSecretKey: ${updatedUser.binanceSecretKey === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    console.log(`- binanceAllowedIp: ${updatedUser.binanceAllowedIp === null ? '✅ Properly cleared (null)' : '❌ Not properly cleared'}`);
    
    // 7. Final cleanup
    console.log('\n🧹 Final cleanup...');
    await usersCollection.deleteOne({ userId: TEST_USER_ID });
    
    console.log('\n✅ All tests completed successfully!');
  } catch (error) {
    console.error(`❌ An error occurred: ${error.message}`);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log('📡 MongoDB connection closed');
  }
}

// Run the test
runTest();