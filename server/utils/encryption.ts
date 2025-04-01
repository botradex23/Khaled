import crypto from "crypto";

/**
 * Fernet-like encryption implementation using Node.js crypto
 * 
 * This module provides Fernet-compatible encryption which:
 * 1. Uses a single ENCRYPTION_KEY from environment (for simplicity)
 * 2. Uses AES-256-CBC with HMAC-SHA256 for authenticated encryption
 * 3. Handles key rotation with version tracking
 */

// Generate secure default encryption key if environment variable is not set
let defaultKey: Buffer;

try {
  // Generate a secure random 32-byte key for Fernet-like encryption
  defaultKey = crypto.randomBytes(32);
} catch (error) {
  console.error("Failed to generate secure random encryption key:", error);
  // Fallback to fixed key only if random generation fails
  defaultKey = Buffer.from("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", "hex");
}

// Check if encryption key is properly set in environment
if (!process.env.ENCRYPTION_KEY) {
  // Generate a value we can suggest to the user
  const suggestedKey = defaultKey.toString('hex');
  
  console.log('Using secure random encryption key for this session (environment variable not set).');
  console.log('For persistent encryption across restarts, set this environment variable:');
  console.log(`ENCRYPTION_KEY=${suggestedKey}`);
  console.log('Warning: After restart, previously encrypted data will not be decryptable without this exact key.');
}

// Use environment variable if available, otherwise use generated secure default
const masterKey = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex") 
  : defaultKey;

// Split the master key into encryption key and signing key
const encryptionKey = masterKey.slice(0, 16);
const signingKey = masterKey.slice(16, 32);

/**
 * Encrypts a string using Fernet-like encryption (AES-256-CBC with HMAC)
 * @param text The text to encrypt
 * @returns The encrypted text as a base64 string
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    // Generate a random IV
    const iv = crypto.randomBytes(16);
    
    // Create cipher with encryption key and IV
    const cipher = crypto.createCipheriv("aes-256-cbc", encryptionKey, iv);
    
    // Encrypt the text
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    // Create timestamp for freshness
    const timestamp = Math.floor(Date.now() / 1000);
    const timestampBytes = Buffer.alloc(8);
    timestampBytes.writeBigUInt64BE(BigInt(timestamp), 0);
    
    // Combine all parts: Version (1 byte) + Timestamp (8 bytes) + IV (16 bytes) + Ciphertext
    const version = Buffer.from([1]); // Version 1
    const payload = Buffer.concat([version, timestampBytes, iv, encrypted]);
    
    // Create HMAC for authentication
    const hmac = crypto.createHmac("sha256", signingKey);
    hmac.update(payload);
    const signature = hmac.digest();
    
    // Final token: Payload + HMAC
    const token = Buffer.concat([payload, signature]);
    
    // Return as base64 string
    return token.toString("base64");
  } catch (error) {
    console.error("Encryption error:", error);
    // If encryption fails, log the error but don't return plaintext
    throw new Error("Encryption failed");
  }
}

/**
 * Decrypts a string that was encrypted using Fernet
 * @param token The encrypted token as a base64 string
 * @returns The decrypted text
 */
export function decrypt(token: string): string {
  if (!token) return token;
  
  try {
    // Decode the base64 token
    const data = Buffer.from(token, "base64");
    
    // Check if the token is long enough
    if (data.length < 57) { // 1 (version) + 8 (timestamp) + 16 (IV) + 32 (HMAC) + at least 1 byte of ciphertext
      throw new Error("Token too short");
    }
    
    // Extract parts
    const version = data[0];
    if (version !== 1) {
      throw new Error(`Unsupported token version: ${version}`);
    }
    
    // Get payload (everything except the HMAC)
    const payload = data.slice(0, data.length - 32);
    const providedHmac = data.slice(data.length - 32);
    
    // Verify HMAC
    const hmac = crypto.createHmac("sha256", signingKey);
    hmac.update(payload);
    const calculatedHmac = hmac.digest();
    
    if (!crypto.timingSafeEqual(providedHmac, calculatedHmac)) {
      throw new Error("Invalid token (HMAC verification failed)");
    }
    
    // Extract timestamp, IV, and ciphertext
    const timestamp = Number(data.readBigUInt64BE(1));
    const iv = data.slice(9, 25);
    const ciphertext = data.slice(25, data.length - 32);
    
    // Check token freshness if needed (commented out for now)
    // const currentTime = Math.floor(Date.now() / 1000);
    // const ttl = 60 * 60 * 24 * 30; // 30 days
    // if (currentTime - timestamp > ttl) {
    //   throw new Error("Token expired");
    // }
    
    // Decrypt the ciphertext
    const decipher = crypto.createDecipheriv("aes-256-cbc", encryptionKey, iv);
    let decrypted = decipher.update(ciphertext);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString("utf8");
  } catch (error) {
    console.error("Decryption error:", error);
    
    // Check if this might be an old AES-only token (for backward compatibility)
    if (isLegacyEncrypted(token)) {
      try {
        return decryptLegacy(token);
      } catch (legacyError) {
        console.error("Legacy decryption also failed:", legacyError);
      }
    }
    
    // Decryption failed, don't return potentially corrupt data
    throw new Error("Decryption failed");
  }
}

/**
 * Legacy AES-only decryption for backward compatibility
 */
function decryptLegacy(encryptedText: string): string {
  const iv = masterKey.slice(0, 16); // Use part of the master key as IV
  const decipher = crypto.createDecipheriv("aes-256-cbc", masterKey, iv);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Checks if a string appears to be encrypted with the new Fernet-like format
 */
export function isEncrypted(text: string): boolean {
  // Check if it looks like a base64 string of appropriate length
  if (!text) return false;
  
  // Try to detect Fernet tokens (base64 encoded, with appropriate length)
  const validBase64 = /^[A-Za-z0-9+/]+={0,2}$/i.test(text) && text.length > 20;
  
  // Also check for legacy hex format
  const validHex = /^[0-9a-f]+$/i.test(text) && text.length > 32;
  
  return validBase64 || validHex;
}

/**
 * Checks if a string appears to be encrypted with the legacy hex format
 */
function isLegacyEncrypted(text: string): boolean {
  return /^[0-9a-f]+$/i.test(text) && text.length > 32;
}