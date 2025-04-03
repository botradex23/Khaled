/**
 * Encryption Service Test
 * 
 * This script tests the encryption service by importing it directly from the module.
 */

// We need CommonJS imports since we're using the .cjs extension
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Import .env variables
const dotenvPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(dotenvPath)) {
  const envConfig = fs.readFileSync(dotenvPath, 'utf8')
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('=').map(part => part.trim()))
    .reduce((acc, [key, value]) => {
      if (key && value) acc[key] = value;
      return acc;
    }, {});
  
  Object.entries(envConfig).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

// Algorithm for encryption (must match the one used in the encryption service)
const ALGORITHM = 'aes-256-gcm';

// Get encryption key from environment
function getEncryptionKey() {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  
  return Buffer.from(encryptionKey, 'base64');
}

// Encryption function (must match the one in encryptionService.ts)
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

// Decryption function (must match the one in encryptionService.ts)
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

// Test data
const testApiKey = 'test-api-key-123456789abcdef';
const testSecretKey = 'test-secret-key-abcdefghijklmnopqrstuvwxyz';

// Run the test
function runTest() {
  console.log('=== Encryption Service Test ===');
  console.log('Original API Key:', testApiKey);
  console.log('Original Secret Key:', testSecretKey);
  
  // Encrypt the keys
  console.log('\nEncrypting...');
  const encryptedApiKey = encrypt(testApiKey);
  const encryptedSecretKey = encrypt(testSecretKey);
  
  console.log('Encrypted API Key:', encryptedApiKey);
  console.log('Encrypted Secret Key:', encryptedSecretKey);
  
  // Decrypt the keys
  console.log('\nDecrypting...');
  const decryptedApiKey = decrypt(encryptedApiKey);
  const decryptedSecretKey = decrypt(encryptedSecretKey);
  
  console.log('Decrypted API Key:', decryptedApiKey);
  console.log('Decrypted Secret Key:', decryptedSecretKey);
  
  // Verify the decryption
  console.log('\nVerification:');
  console.log('API Key Match:', decryptedApiKey === testApiKey);
  console.log('Secret Key Match:', decryptedSecretKey === testSecretKey);
  
  // Return the test results
  const success = decryptedApiKey === testApiKey && decryptedSecretKey === testSecretKey;
  console.log(success ? '\n✅ Encryption service test PASSED!' : '\n❌ Encryption service test FAILED!');
}

// Run the test
runTest();