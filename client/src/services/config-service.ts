/**
 * Configuration Service
 * 
 * This service provides centralized configuration management for the application.
 * It handles loading configuration from environment variables and provides access
 * to configuration values with type safety.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { logInfo, logError } from '../utils/logger';

// Load environment variables from .env file if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// Define configuration schema
interface AppConfig {
  // Server configuration
  port: number;
  host: string;
  isDevelopment: boolean;
  
  // Database configuration
  mongoUri: string;
  mongoDbName: string;
  postgresqlUrl: string | null;
  
  // API keys
  openaiApiKey: string | null;
  binanceApiKey: string | null;
  binanceApiSecret: string | null;
  okxApiKey: string | null;
  okxApiSecret: string | null;
  
  // Feature flags
  enableProxy: boolean;
  enableML: boolean;
  useBinance: boolean;
  useOkx: boolean;
  
  // Proxy configuration
  proxyIp: string | null;
  proxyPort: number | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
  
  // Admin and authentication
  adminUsername: string;
  adminPassword: string;
  jwtSecret: string;
  sessionSecret: string;
  
  // Other features
  telegramBotToken: string | null;
  smsApiKey: string | null;
}

// Initialize with default values
let config: AppConfig = {
  // Server configuration
  port: parseInt(process.env.PORT || '5000', 10),
  host: process.env.HOST || '0.0.0.0',
  isDevelopment: process.env.NODE_ENV !== 'production',
  
  // Database configuration
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/tradeliy',
  mongoDbName: process.env.MONGO_DB_NAME || 'tradeliy',
  postgresqlUrl: process.env.DATABASE_URL || null,
  
  // API keys
  openaiApiKey: process.env.OPENAI_API_KEY || null,
  binanceApiKey: process.env.BINANCE_API_KEY || null,
  binanceApiSecret: process.env.BINANCE_API_SECRET || null,
  okxApiKey: process.env.OKX_API_KEY || null,
  okxApiSecret: process.env.OKX_API_SECRET || null,
  
  // Feature flags
  enableProxy: process.env.ENABLE_PROXY === 'true',
  enableML: process.env.ENABLE_ML !== 'false',
  useBinance: process.env.USE_BINANCE !== 'false',
  useOkx: process.env.USE_OKX === 'true',
  
  // Proxy configuration
  proxyIp: process.env.PROXY_IP || null,
  proxyPort: process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : null,
  proxyUsername: process.env.PROXY_USERNAME || null,
  proxyPassword: process.env.PROXY_PASSWORD || null,
  
  // Admin and authentication
  adminUsername: process.env.ADMIN_USERNAME || 'admin',
  adminPassword: process.env.ADMIN_PASSWORD || 'admin',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  sessionSecret: process.env.SESSION_SECRET || 'session-secret',
  
  // Other features
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || null,
  smsApiKey: process.env.SMS_API_KEY || null,
};

/**
 * Initialize the configuration service
 * @returns Promise resolving to boolean indicating success
 */
async function initialize(): Promise<boolean> {
  try {
    logInfo('Config', 'Initializing configuration service');
    
    // Perform any validation or additional setup here
    validateRequiredConfigs();
    
    return true;
  } catch (error: any) {
    logError('Config', `Error initializing configuration: ${error.message}`);
    return false;
  }
}

/**
 * Validate that required configuration values are present
 */
function validateRequiredConfigs(): void {
  const requiredConfigs: Array<{key: keyof AppConfig, name: string}> = [
    { key: 'mongoUri', name: 'MongoDB URI' },
  ];
  
  const missingConfigs = requiredConfigs.filter(({key}) => !config[key]);
  
  if (missingConfigs.length > 0) {
    const missingNames = missingConfigs.map(c => c.name).join(', ');
    logError('Config', `Missing required configuration values: ${missingNames}`);
  }
}

/**
 * Get the entire configuration
 * Warning: This includes sensitive data and should only be used internally
 * @returns The current configuration
 */
function getConfig(): AppConfig {
  return { ...config }; // Return a copy to prevent modification
}

/**
 * Get a configuration value by key
 * @param key Configuration key
 * @returns Configuration value
 */
function get<K extends keyof AppConfig>(key: K): AppConfig[K] {
  return config[key];
}

/**
 * Set a configuration value
 * @param key Configuration key
 * @param value New configuration value
 */
function set<K extends keyof AppConfig>(key: K, value: AppConfig[K]): void {
  config[key] = value;
  logInfo('Config', `Updated configuration value for ${key}`);
}

/**
 * Get a safe subset of configuration (no sensitive data)
 * @returns Safe configuration for external use
 */
function getSafeConfig(): Partial<AppConfig> {
  const { 
    port, 
    host, 
    isDevelopment, 
    mongoDbName,
    enableProxy,
    enableML,
    useBinance,
    useOkx
  } = config;
  
  return {
    port,
    host,
    isDevelopment,
    mongoDbName,
    enableProxy,
    enableML,
    useBinance,
    useOkx,
    // Add any other non-sensitive configuration here
  };
}

/**
 * Check if an API key is configured
 * @param keyName Name of the API key to check
 * @returns Whether the API key is configured
 */
function hasApiKey(keyName: 'openai' | 'binance' | 'okx' | 'telegram' | 'sms'): boolean {
  switch (keyName) {
    case 'openai':
      return !!config.openaiApiKey;
    case 'binance':
      return !!config.binanceApiKey && !!config.binanceApiSecret;
    case 'okx':
      return !!config.okxApiKey && !!config.okxApiSecret;
    case 'telegram':
      return !!config.telegramBotToken;
    case 'sms':
      return !!config.smsApiKey;
    default:
      return false;
  }
}

/**
 * Update configuration from environment variables
 * Useful when environment variables change during runtime
 */
function refreshFromEnv(): void {
  // Reload from .env file if present
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
  
  // Update configuration from environment variables
  config = {
    ...config,
    // Server configuration
    port: parseInt(process.env.PORT || String(config.port), 10),
    host: process.env.HOST || config.host,
    isDevelopment: process.env.NODE_ENV !== 'production',
    
    // Database configuration
    mongoUri: process.env.MONGO_URI || config.mongoUri,
    mongoDbName: process.env.MONGO_DB_NAME || config.mongoDbName,
    postgresqlUrl: process.env.DATABASE_URL || config.postgresqlUrl,
    
    // API keys
    openaiApiKey: process.env.OPENAI_API_KEY || config.openaiApiKey,
    binanceApiKey: process.env.BINANCE_API_KEY || config.binanceApiKey,
    binanceApiSecret: process.env.BINANCE_API_SECRET || config.binanceApiSecret,
    okxApiKey: process.env.OKX_API_KEY || config.okxApiKey,
    okxApiSecret: process.env.OKX_API_SECRET || config.okxApiSecret,
    
    // Feature flags
    enableProxy: process.env.ENABLE_PROXY === 'true' || config.enableProxy,
    enableML: process.env.ENABLE_ML !== 'false' && config.enableML,
    useBinance: process.env.USE_BINANCE !== 'false' && config.useBinance,
    useOkx: process.env.USE_OKX === 'true' || config.useOkx,
    
    // Proxy configuration
    proxyIp: process.env.PROXY_IP || config.proxyIp,
    proxyPort: process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT, 10) : config.proxyPort,
    proxyUsername: process.env.PROXY_USERNAME || config.proxyUsername,
    proxyPassword: process.env.PROXY_PASSWORD || config.proxyPassword,
    
    // Admin and authentication
    adminUsername: process.env.ADMIN_USERNAME || config.adminUsername,
    adminPassword: process.env.ADMIN_PASSWORD || config.adminPassword,
    jwtSecret: process.env.JWT_SECRET || config.jwtSecret,
    sessionSecret: process.env.SESSION_SECRET || config.sessionSecret,
    
    // Other features
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || config.telegramBotToken,
    smsApiKey: process.env.SMS_API_KEY || config.smsApiKey,
  };
  
  logInfo('Config', 'Configuration refreshed from environment variables');
}

// Export functions
export {
  initialize,
  getConfig,
  get,
  set,
  getSafeConfig,
  hasApiKey,
  refreshFromEnv,
  validateRequiredConfigs
};

// Export types
export type { AppConfig };

// Default export for backwards compatibility
export default {
  initialize,
  getConfig,
  get,
  set,
  getSafeConfig,
  hasApiKey,
  refreshFromEnv,
  validateRequiredConfigs
};