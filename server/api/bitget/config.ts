// Bitget API configuration settings

// Base URLs for Bitget API
export const BITGET_MAINNET_URL = 'https://api.bitget.com';
export const BITGET_TESTNET_URL = 'https://api.bitgettest.com';

// Whether to use testnet (demo environment) instead of mainnet
export const USE_TESTNET = true;

// Base URL to use (will be set to testnet or mainnet based on USE_TESTNET)
export const BASE_URL = USE_TESTNET ? BITGET_TESTNET_URL : BITGET_MAINNET_URL;

// Use fallback demo data if API fails or for testing purposes
export const ALWAYS_USE_DEMO = true;

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
export const isConfigured = () => {
  const hasApiKey = API_KEY && API_KEY.length > 0 && API_KEY !== 'undefined';
  const hasSecretKey = SECRET_KEY && SECRET_KEY.length > 0 && SECRET_KEY !== 'undefined';
  const hasPassphrase = PASSPHRASE && PASSPHRASE.length > 0 && PASSPHRASE !== 'undefined';
  
  if (!hasApiKey) console.log('Warning: BITGET_API_KEY not configured');
  if (!hasSecretKey) console.log('Warning: BITGET_SECRET_KEY not configured');
  if (!hasPassphrase) console.log('Warning: BITGET_PASSPHRASE not configured');
  
  return hasApiKey && hasSecretKey && hasPassphrase;
};

// Common currencies to show in the app
export const DEFAULT_CURRENCIES = [
  'BTC', 'ETH', 'SOL', 'XRP', 'DOGE', 'USDT', 'USDC'
];

// Common trading pairs to show in the app
export const DEFAULT_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'DOGEUSDT', 'XRPUSDT', 'BNBUSDT', 'ADAUSDT'
];

// Trading strategies supported by the app
export const TRADING_STRATEGIES = {
  GRID: 'grid',
  DCA: 'dca',
  MACD: 'macd'
};

// Default timeout for API requests (10 seconds)
export const DEFAULT_TIMEOUT = 10000;