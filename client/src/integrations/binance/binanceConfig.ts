/**
 * Binance Configuration Module
 * Centralizes all configuration parameters for Binance API integration
 */

// Base URLs for Binance API
export const BINANCE_API_URL = 'https://api.binance.com';
export const BINANCE_TEST_API_URL = 'https://testnet.binance.vision';
export const BINANCE_WEBSOCKET_URL = 'wss://stream.binance.com:9443';

// Proxy configuration for regions with restricted access
export const PROXY_CONFIG = {
  USE_PROXY: process.env.USE_PROXY === 'true',
  MAX_PROXY_RETRIES: 3,
  RECONNECT_INTERVAL: 5000, // 5 seconds for reconnect attempts
  AVAILABLE_PROXIES: [
    { host: '86.38.234.176', port: 6630 },
    { host: '154.36.110.199', port: 6853 },
    { host: '45.151.162.198', port: 6600 },
  ],
  getProxyUrl: (proxyHost: string, proxyPort: number): string => {
    const proxyUsername = process.env.PROXY_USERNAME || 'ahjqspco';
    const proxyPassword = process.env.PROXY_PASSWORD || 'dzx3r1prpz9k';
    return `http://${proxyUsername}:${proxyPassword}@${proxyHost}:${proxyPort}`;
  }
};

// Default currency pairs for market data
export const DEFAULT_CURRENCY_PAIRS = [
  'btcusdt', 'ethusdt', 'bnbusdt', 'solusdt', 'xrpusdt',
  'adausdt', 'dogeusdt', 'dotusdt', 'maticusdt', 'linkusdt',
  'avaxusdt', 'uniusdt', 'shibusdt', 'ltcusdt', 'atomusdt',
  'nearusdt', 'bchusdt', 'filusdt', 'trxusdt', 'xlmusdt'
];

// Simulation mode defaults
export const SIMULATION_DEFAULTS = {
  INTERVAL_TIME: 5000, // Update every 5 seconds
  // Default realistic prices for simulation mode
  DEFAULT_PRICES: {
    'BTCUSDT': 69250.25,
    'ETHUSDT': 3475.50,
    'BNBUSDT': 608.75,
    'SOLUSDT': 188.15,
    'XRPUSDT': 0.6125,
    'ADAUSDT': 0.45,
    'DOGEUSDT': 0.16,
    'DOTUSDT': 8.25,
    'MATICUSDT': 0.78,
    'LINKUSDT': 15.85,
    'AVAXUSDT': 41.28,
    'UNIUSDT': 12.35,
    'SHIBUSDT': 0.00002654,
    'LTCUSDT': 93.21,
    'ATOMUSDT': 11.23,
    'NEARUSDT': 7.15,
    'BCHUSDT': 523.75,
    'FILUSDT': 8.93,
    'TRXUSDT': 0.1426,
    'XLMUSDT': 0.1392
  }
};

// API configuration interfaces
export interface BinanceApiConfig {
  apiKey: string;
  secretKey: string;
  useTestnet?: boolean;
  allowedIp?: string;
}

// Get default Binance API configuration from environment variables
export function getDefaultBinanceConfig(): BinanceApiConfig {
  return {
    apiKey: process.env.BINANCE_API_KEY || '',
    secretKey: process.env.BINANCE_SECRET_KEY || '',
    useTestnet: process.env.BINANCE_USE_TESTNET === 'true',
    allowedIp: process.env.BINANCE_ALLOWED_IP
  };
}

// WebSocket configuration
export const WEBSOCKET_CONFIG = {
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  ORIGIN: 'https://www.binance.com'
};