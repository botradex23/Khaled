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

// Direct API credentials (temporary for testing)
export const API_KEY = '990ddc24-085e-4567-9f86-64a732036f96'; // From screenshot
export const SECRET_KEY = '2528132DE19F19B2BADE00A48D82D7EA'; // From screenshot 
export const PASSPHRASE = 'Khaled123'; // From screenshot

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