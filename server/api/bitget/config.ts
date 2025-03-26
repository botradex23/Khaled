// Bitget API configuration settings

// Base URLs for Bitget API
// Note: The testnet URL doesn't seem to work directly, so we'll use the mainnet URL
// with the demo flag in the header instead
export const BITGET_MAINNET_URL = 'https://api.bitget.com';
export const BITGET_TESTNET_URL = 'https://api.bitget.com'; // Changed to use main URL with demo flag

// Whether to use testnet (demo environment) instead of mainnet
// Using testnet as requested by user
export const USE_TESTNET = true;

// Base URL to use (will be set to testnet or mainnet based on USE_TESTNET)
export const BASE_URL = BITGET_MAINNET_URL; // Always use mainnet URL but with demo flag

// Use fallback demo data if API fails or for testing purposes
// Set to false as required by user - never use demo data
export const ALWAYS_USE_DEMO = false;

// API credentials - these should be sourced from environment variables
export const API_KEY = process.env.BITGET_API_KEY || '';
export const SECRET_KEY = process.env.BITGET_SECRET_KEY || '';
export const PASSPHRASE = process.env.BITGET_PASSPHRASE || ''; // Bitget requires a passphrase

/**
 * Check if API credentials are configured
 * 
 * Required permissions for the Bitget API key:
 * - Read permission (for account information and market data)
 * - Trade permission (for executing trades)
 */
export const isConfigured = (): boolean => {
  const hasApiKey = API_KEY && API_KEY.length > 0 && API_KEY !== 'undefined';
  const hasSecretKey = SECRET_KEY && SECRET_KEY.length > 0 && SECRET_KEY !== 'undefined';
  const hasPassphrase = PASSPHRASE && PASSPHRASE.length > 0 && PASSPHRASE !== 'undefined';
  
  if (!hasApiKey) console.log('Warning: BITGET_API_KEY not configured');
  if (!hasSecretKey) console.log('Warning: BITGET_SECRET_KEY not configured');
  if (!hasPassphrase) console.log('Warning: BITGET_PASSPHRASE not configured');
  
  // Make sure we're explicitly returning a boolean value
  return Boolean(hasApiKey && hasSecretKey && hasPassphrase);
};

// Common currencies to show in the app
export const DEFAULT_CURRENCIES = [
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'USDT', 'USDC'
];

// Common trading pairs to show in the app
// NOTE: Bitget API returns symbols without the _SPBL suffix, but when making individual calls to the API,
// we need to use the _SPBL suffix for many endpoints. Here we use the format returned by the tickers API.
export const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'
];

// Trading strategies supported by the app
export const TRADING_STRATEGIES = {
  GRID: 'grid',
  DCA: 'dca',
  MACD: 'macd'
};

// Default timeout for API requests (increased to 30 seconds for better reliability)
export const DEFAULT_TIMEOUT = 30000;