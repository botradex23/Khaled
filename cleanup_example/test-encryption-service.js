/**
 * Test script for the encryption service
 * 
 * This script tests the encryption and decryption functions of the encryptionService.
 */

import { config } from 'dotenv';
import { encrypt, decrypt } from './server/services/encryptionService.js';

config();

// Test a pair of API keys
const apiKey = 'test-api-key-123456789abcdef';
const secretKey = 'test-secret-key-abcdefghijklmnopqrstuvwxyz';

console.log('=== Encryption Service Test ===');
console.log('Original API Key:', apiKey);
console.log('Original Secret Key:', secretKey);

try {
  // Test encryption
  console.log('\nEncrypting...');
  const encryptedApiKey = encrypt(apiKey);
  const encryptedSecretKey = encrypt(secretKey);
  
  console.log('Encrypted API Key:', encryptedApiKey);
  console.log('Encrypted Secret Key:', encryptedSecretKey);
  
  // Test decryption
  console.log('\nDecrypting...');
  const decryptedApiKey = decrypt(encryptedApiKey);
  const decryptedSecretKey = decrypt(encryptedSecretKey);
  
  console.log('Decrypted API Key:', decryptedApiKey);
  console.log('Decrypted Secret Key:', decryptedSecretKey);
  
  // Verify results
  console.log('\nVerification:');
  console.log('API Key Match:', apiKey === decryptedApiKey);
  console.log('Secret Key Match:', secretKey === decryptedSecretKey);
  
  if (apiKey === decryptedApiKey && secretKey === decryptedSecretKey) {
    console.log('\n✅ Encryption service test PASSED!');
  } else {
    console.log('\n❌ Encryption service test FAILED!');
  }
} catch (error) {
  console.error('\n❌ Encryption service test ERROR:', error);
}