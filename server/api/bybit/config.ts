// Bybit API configuration settings
// This file configures the connection to Bybit's API

export const BYBIT_BASE_URL = 'https://api.bybit.com'; // Base URL for main API
export const BYBIT_TESTNET_URL = 'https://api-testnet.bybit.com'; // Base URL for testnet

// Use API credentials from environment variables
export const API_KEY = process.env.BYBIT_API_KEY || '';
export const SECRET_KEY = process.env.BYBIT_SECRET_KEY || '';

// Check at startup if environment variables exist
console.log('Bybit Config - Environment variables check:');
console.log(`BYBIT_API_KEY: ${process.env.BYBIT_API_KEY ? process.env.BYBIT_API_KEY.substring(0, 4) + '...' : 'missing'}`);
console.log(`BYBIT_SECRET_KEY: ${process.env.BYBIT_SECRET_KEY ? process.env.BYBIT_SECRET_KEY.substring(0, 4) + '...' : 'missing'}`);

/**
 * Check if API credentials are configured
 * 
 * Required permissions for the Bybit API key:
 * - Read permission (for account information and market data)
 * - Trade permission (for executing trades)
 */
export const isConfigured = () => {
  return !!(API_KEY && SECRET_KEY);
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
  'BTCUSDT',  // Note: Bybit uses format without dash
  'ETHUSDT',
  'SOLUSDT',
  'BNBUSDT',
  'XRPUSDT'
];

// Define allowed trading strategies
export const TRADING_STRATEGIES = {
  GRID: 'grid',
  DCA: 'dca',
  MACD: 'macd'
};

// Default request parameters
export const DEFAULT_TIMEOUT = 10000; // 10 seconds timeout for API requests

// Convert OKX style pair format to Bybit format
// e.g. BTC-USDT -> BTCUSDT
export const convertToBybitPair = (okxPair: string): string => {
  return okxPair.replace('-', '');
};

// Convert Bybit style pair format to OKX style
// e.g. BTCUSDT -> BTC-USDT
export const convertFromBybitPair = (bybitPair: string): string => {
  // For common pairs we can split at a known position
  if (bybitPair.endsWith('USDT')) {
    return `${bybitPair.slice(0, -4)}-USDT`;
  } else if (bybitPair.endsWith('USDC')) {
    return `${bybitPair.slice(0, -4)}-USDC`;
  } else {
    // For other pairs, find where the quote currency likely starts
    // This is an approximation and might not work for all pairs
    const commonQuotes = ['BTC', 'ETH', 'USD'];
    for (const quote of commonQuotes) {
      if (bybitPair.endsWith(quote)) {
        return `${bybitPair.slice(0, -quote.length)}-${quote}`;
      }
    }
    // Default fallback - just add a dash before the last 3 characters
    return `${bybitPair.slice(0, -3)}-${bybitPair.slice(-3)}`;
  }
};