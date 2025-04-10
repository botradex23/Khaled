/**
 * Application Configuration
 * 
 * This module provides centralized access to all environment variables and configuration
 * settings used across the application. It ensures that we have a single source of truth
 * for all configuration values and supports environment-based configuration.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Initialize environment variables from .env file
dotenv.config();

// Helper function to get boolean environment variables
function getBooleanEnv(name: string, defaultValue: boolean = false): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

// Helper function to get numeric environment variables
function getNumericEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

// Define configuration values grouped by category
export const config = {
  // Server configuration
  server: {
    port: getNumericEnv('PORT', 5000),
    nodeEnv: process.env.NODE_ENV || 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV !== 'production',
    sessionSecret: process.env.SESSION_SECRET || 'default-secret-change-in-production',
    isReplit: Boolean(process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT)
  },

  // Database configuration
  database: {
    mongoUri: process.env.MONGO_URI || '',
    postgresDatabaseUrl: process.env.DATABASE_URL || '',
  },

  // Proxy configuration for geo-restricted regions
  proxy: {
    enabled: getBooleanEnv('USE_PROXY', false),
    protocol: process.env.PROXY_PROTOCOL || 'http',
    username: process.env.PROXY_USERNAME || '',
    password: process.env.PROXY_PASSWORD || '',
    ip: process.env.PROXY_IP || '',
    port: getNumericEnv('PROXY_PORT', 8080),
    encodingMethod: process.env.PROXY_ENCODING_METHOD || 'quote_plus',
    fallbackToDirect: getBooleanEnv('FALLBACK_TO_DIRECT', true)
  },

  // Encryption configuration
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-key-change-in-production'
  },

  // Authentication configuration
  auth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    },
    apple: {
      clientId: process.env.APPLE_CLIENT_ID || '',
      clientSecret: process.env.APPLE_CLIENT_SECRET || ''
    }
  },

  // Exchange configurations
  exchanges: {
    binance: {
      apiKey: process.env.BINANCE_API_KEY || '',
      secretKey: process.env.BINANCE_SECRET_KEY || '',
      useTestnet: getBooleanEnv('USE_TESTNET', false),
      proxy: {
        host: process.env.BINANCE_PROXY_HOST || process.env.PROXY_IP || '',
        port: getNumericEnv('BINANCE_PROXY_PORT', getNumericEnv('PROXY_PORT', 8080)),
        username: process.env.BINANCE_PROXY_USERNAME || process.env.PROXY_USERNAME || '',
        password: process.env.BINANCE_PROXY_PASSWORD || process.env.PROXY_PASSWORD || ''
      }
    },
    okx: {
      apiKey: process.env.OKX_API_KEY || '',
      apiSecret: process.env.OKX_API_SECRET || '',
      passphrase: process.env.OKX_PASSPHRASE || '',
      useTestnet: getBooleanEnv('OKX_USE_TESTNET', false)
    }
  },

  // API services configuration
  services: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || ''
    }
  },

  // Demo mode configuration
  demo: {
    enabled: getBooleanEnv('USE_DEMO_MODE', false),
    fallbackToDemo: getBooleanEnv('FALLBACK_TO_DEMO', false)
  }
};

export default config;