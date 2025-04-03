/**
 * Encryption Service
 * 
 * This service provides encryption and decryption capabilities using Crypto.
 * It's primarily used for securing sensitive data like API keys before storing in the database.
 */

import * as crypto from 'crypto';

// The encryption algorithm to use
const ALGORITHM = 'aes-256-gcm';

/**
 * Get encryption key from environment variable
 * @returns The encryption key or throws error if not configured
 */
function getEncryptionKey(): Buffer {
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (!encryptionKey) {
    throw new Error('ENCRYPTION_KEY environment variable not set');
  }
  
  return Buffer.from(encryptionKey, 'base64');
}

/**
 * Encrypt a text string
 * @param text - Text to encrypt
 * @returns Encrypted text as a base64 string
 */
export function encrypt(text: string): string {
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

/**
 * Decrypt an encrypted string
 * @param encryptedText - Encrypted text to decrypt
 * @returns Decrypted text
 */
export function decrypt(encryptedText: string): string {
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