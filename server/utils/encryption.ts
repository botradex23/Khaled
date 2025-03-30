import crypto from "crypto";

// Generate secure default encryption keys if environment variables are not set
let defaultKey: Buffer;
let defaultIv: Buffer;

try {
  // Generate a secure random key and IV if environment variables not provided
  defaultKey = crypto.randomBytes(32); // 256 bits for AES-256
  defaultIv = crypto.randomBytes(16); // 128 bits for IV
} catch (error) {
  console.error("Failed to generate secure random encryption keys:", error);
  // Fallback to fixed keys only if random generation fails
  defaultKey = Buffer.from("9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08", "hex");
  defaultIv = Buffer.from("4b7a70e9b5090dc0b6f61c31675bc75c", "hex");
}

// Check if encryption env vars are properly set
if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_IV) {
  // Generate values we can suggest to the user
  const suggestedKey = defaultKey.toString('hex');
  const suggestedIv = defaultIv.toString('hex');
  
  console.log('Using secure random encryption keys for this session (environment variables not set).');
  console.log('For persistent encryption across restarts, set these environment variables:');
  console.log(`ENCRYPTION_KEY=${suggestedKey}`);
  console.log(`ENCRYPTION_IV=${suggestedIv}`);
  console.log('Warning: After restart, previously encrypted data will not be decryptable without these exact keys.');
}

// Use environment variables if available, otherwise use generated secure defaults
const key = process.env.ENCRYPTION_KEY 
  ? Buffer.from(process.env.ENCRYPTION_KEY, "hex") 
  : defaultKey;

const iv = process.env.ENCRYPTION_IV 
  ? Buffer.from(process.env.ENCRYPTION_IV, "hex") 
  : defaultIv;

const algorithm = "aes-256-cbc";

/**
 * Encrypts a string using AES-256-CBC.
 * @param text The text to encrypt
 * @returns The encrypted text as a hex string
 */
export function encrypt(text: string): string {
  if (!text) return text;
  
  try {
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    // If encryption fails, return the original text to prevent data loss
    // This is not ideal for security, but prevents breaking the application
    console.warn("Returning unencrypted data due to encryption failure");
    return text;
  }
}

/**
 * Decrypts a string that was encrypted using AES-256-CBC.
 * @param encryptedText The encrypted text as a hex string
 * @returns The decrypted text
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  
  try {
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("Decryption error:", error);
    // If decryption fails, it might be because the text wasn't encrypted
    // in the first place, so return the original
    console.warn("Returning original data due to decryption failure");
    return encryptedText;
  }
}

/**
 * Checks if a string appears to be encrypted (hex string of expected length).
 * This is a heuristic and not foolproof.
 */
export function isEncrypted(text: string): boolean {
  // Check if it's a valid hex string of appropriate length (AES-256-CBC produces longer output)
  return /^[0-9a-f]+$/i.test(text) && text.length > 32;
}