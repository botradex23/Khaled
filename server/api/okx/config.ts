// OKX API Configuration

// Define OKX API endpoints
// Note: OKX documentation sometimes references different base URLs
// Options include:
// - https://www.okx.com (main website with API)
// - https://api.okx.com (dedicated API endpoint)
// - https://aws.okx.com (AWS hosted endpoint)
// Demo trading is handled via the 'x-simulated-trading' header
export const OKX_BASE_URL = 'https://www.okx.com'; // Base URL for API 
export const OKX_DEMO_BASE_URL = 'https://www.okx.com'; // Use same URL for demo (handled via header)

// Use API credentials from environment variables with fallbacks
// Check and log the environment variables
console.log('OKX Config - Environment variables check:');
console.log(`OKX_API_KEY: ${process.env.OKX_API_KEY ? process.env.OKX_API_KEY.substring(0, 4) + '...' : 'missing'}`);
console.log(`OKX_SECRET_KEY: ${process.env.OKX_SECRET_KEY ? process.env.OKX_SECRET_KEY.substring(0, 4) + '...' : 'missing'}`);
console.log(`OKX_PASSPHRASE: ${process.env.OKX_PASSPHRASE ? process.env.OKX_PASSPHRASE.substring(0, 2) + '...' : 'missing'}`);

// Use environment variables with fallbacks for API credentials
// When updating these credentials, you need to restart the server
export const API_KEY = process.env.OKX_API_KEY || 'a6c726f8-4e11-4c7c-b236-ad3b63d73a3d';
export const SECRET_KEY = process.env.OKX_SECRET_KEY || 'E5DE2806C9778CCCCCC80D07F719FD3B';
export const PASSPHRASE = process.env.OKX_PASSPHRASE || 'Khaled123.';

// Log the actual values being used (first 4 and last 4 chars for security)
console.log('Using API Key:', API_KEY.length > 8 ? 
  `${API_KEY.substring(0, 4)}...${API_KEY.substring(API_KEY.length - 4)}` : '[hidden]');
console.log('Using Secret Key:', SECRET_KEY.length > 8 ?
  `${SECRET_KEY.substring(0, 4)}...${SECRET_KEY.substring(SECRET_KEY.length - 4)}` : '[hidden]');

/**
 * Check if API credentials are configured
 * 
 * Required permissions for the OKX API key:
 * - Read permission (for account information and market data)
 * - Trade permission (for executing trades)
 * - No withdraw permission needed
 */
export const isConfigured = () => {
  return !!(API_KEY && SECRET_KEY && PASSPHRASE);
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
  'XRP-USDT'
];

// Define allowed trading strategies
export const TRADING_STRATEGIES = {
  GRID: 'grid',
  DCA: 'dca',
  MACD: 'macd'
};

// Default request parameters
export const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout for API requests