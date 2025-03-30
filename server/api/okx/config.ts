// OKX API Configuration - DEPRECATED
// This code is kept only for backwards compatibility
// The system now uses Binance API exclusively

// Define dummy URLs to maintain compatibility with existing code
export const OKX_BASE_URL = 'https://www.okx.com'; 
export const OKX_DEMO_BASE_URL = 'https://www.okx.com';

// We're no longer using OKX, so we don't need to check for environment variables
console.log('OKX integration is deprecated. Using Binance exclusively.');

// Use dummy credentials since we're not making real OKX API calls
export const API_KEY = 'deprecated';
export const SECRET_KEY = 'deprecated';
export const PASSPHRASE = 'deprecated';

// Log the actual values being used (first 4 and last 4 chars for security)
console.log('Using API Key:', API_KEY.length > 8 ? 
  `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : '[hidden]');
console.log('Using Secret Key:', SECRET_KEY.length > 8 ?
  `${SECRET_KEY.substring(0, 4)}...${SECRET_KEY.substring(SECRET_KEY.length - 4)}` : '[hidden]');

/**
 * Check if API credentials are configured
 * Always returns true now that OKX is deprecated
 */
export const isConfigured = () => {
  return true; // Always return true to avoid breaking any code that checks this
};

// Define commonly used currencies and pairs
export const DEFAULT_CURRENCIES = [
  'BTC',
  'ETH',
  'USDT',
  'USDC',
  'SOL',
  'BNB',
  'XRP',
  'DOGE',
  'ADA',
  'MATIC'
];

export const DEFAULT_PAIRS = [
  'BTC-USDT',
  'ETH-USDT',
  'SOL-USDT',
  'BNB-USDT',
  'XRP-USDT',
  'DOGE-USDT',
  'ADA-USDT',
  'MATIC-USDT',
  'AVAX-USDT',
  'DOT-USDT',
  'UNI-USDT',
  'LINK-USDT',
  'SHIB-USDT',
  'LTC-USDT',
  'ATOM-USDT',
  'NEAR-USDT',
  'BCH-USDT',
  'FIL-USDT',
  'TRX-USDT',
  'XLM-USDT'
];

// Define allowed trading strategies
export const TRADING_STRATEGIES = {
  GRID: 'grid',
  DCA: 'dca',
  MACD: 'macd'
};

// Default request parameters
export const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout for API requests