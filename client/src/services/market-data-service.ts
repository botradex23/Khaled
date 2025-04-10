/**
 * Market Data Service
 * 
 * This service provides market data functionality for cryptocurrency markets.
 * It handles fetching, caching, and processing market data from various exchanges.
 */

import axios from 'axios';
import { logInfo, logError } from '../utils/logger';
import { db } from './index';

// Default symbols to track if none are specified
const DEFAULT_SYMBOLS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
  'DOGEUSDT', 'SOLUSDT', 'LTCUSDT', 'AVAXUSDT', 'DOTUSDT'
];

// Market data cache
interface MarketPrice {
  symbol: string;
  price: number;
  timestamp: number;
  source: string;
}

// Service state
let marketPrices: MarketPrice[] = [];
let lastUpdateTime: number = 0;
let updateInterval: NodeJS.Timeout | null = null;
let primaryExchange: 'binance' | 'okx' = 'okx';  // Default to OKX due to Binance geo-restrictions
let isInitialized = false;

/**
 * Initialize the market data service
 * @param options Initialization options
 * @returns Promise resolving to boolean indicating success
 */
async function initialize(options: {
  primaryExchange?: 'binance' | 'okx';
  updateIntervalMs?: number;
  symbols?: string[];
} = {}): Promise<boolean> {
  try {
    if (isInitialized) {
      logInfo('MarketData', 'Market data service already initialized');
      return true;
    }
    
    // Set options
    primaryExchange = options.primaryExchange || primaryExchange;
    const updateIntervalMs = options.updateIntervalMs || 60000; // Default: 1 minute
    const symbols = options.symbols || DEFAULT_SYMBOLS;
    
    logInfo('MarketData', `Initializing Market Data Service with ${primaryExchange} as primary exchange`);
    
    // Initialize by fetching data once
    const success = await updateMarketData(symbols);
    
    if (success) {
      // Set up regular updates
      if (updateInterval) {
        clearInterval(updateInterval);
      }
      
      updateInterval = setInterval(async () => {
        await updateMarketData(symbols);
      }, updateIntervalMs);
      
      isInitialized = true;
      logInfo('MarketData', 'Market data service initialized successfully');
      return true;
    } else {
      logError('MarketData', 'Failed to initialize market data service');
      return false;
    }
  } catch (error: any) {
    logError('MarketData', `Error initializing market data service: ${error.message}`);
    return false;
  }
}

/**
 * Update market data for the specified symbols
 * @param symbols List of trading pair symbols
 * @returns Promise resolving to boolean indicating success
 */
async function updateMarketData(symbols: string[] = DEFAULT_SYMBOLS): Promise<boolean> {
  try {
    // First try primary exchange
    try {
      if (primaryExchange === 'binance') {
        await updateFromBinance(symbols);
      } else {
        await updateFromOkx(symbols);
      }
      
      lastUpdateTime = Date.now();
      return true;
    } catch (primaryError: any) {
      // If primary exchange fails, try fallback
      logError('MarketData', `Error fetching from ${primaryExchange}: ${primaryError.message}`);
      logInfo('MarketData', `Trying fallback exchange...`);
      
      try {
        if (primaryExchange === 'binance') {
          await updateFromOkx(symbols);
        } else {
          await updateFromBinance(symbols);
        }
        
        lastUpdateTime = Date.now();
        return true;
      } catch (fallbackError: any) {
        logError('MarketData', `Fallback exchange also failed: ${fallbackError.message}`);
        throw new Error('All exchanges failed to provide market data');
      }
    }
  } catch (error: any) {
    logError('MarketData', `Error updating market data: ${error.message}`);
    return false;
  }
}

/**
 * Update market data from Binance
 * @param symbols List of trading pair symbols
 */
async function updateFromBinance(symbols: string[]): Promise<void> {
  const response = await axios.get('https://api.binance.com/api/v3/ticker/price');
  const allPrices = response.data;
  
  // Filter for the symbols we want
  const filteredPrices = allPrices.filter((item: any) => 
    symbols.includes(item.symbol)
  );
  
  // Update the cache
  const now = Date.now();
  const updatedPrices = filteredPrices.map((item: any) => ({
    symbol: item.symbol,
    price: parseFloat(item.price),
    timestamp: now,
    source: 'binance'
  }));
  
  // Merge with existing prices, replacing any with the same symbol
  marketPrices = mergeMarketPrices(marketPrices, updatedPrices);
  
  logInfo('MarketData', `Updated ${updatedPrices.length} market prices from Binance`);
  
  // Save to database if connected
  try {
    await savePricesToDb(updatedPrices);
  } catch (dbError: any) {
    logError('MarketData', `Error saving prices to database: ${dbError.message}`);
  }
}

/**
 * Update market data from OKX
 * @param symbols List of trading pair symbols
 */
async function updateFromOkx(symbols: string[]): Promise<void> {
  // Convert Binance style symbols to OKX format (e.g., BTCUSDT -> BTC-USDT)
  const okxSymbols = symbols.map(symbol => {
    // Find the position where USDT, USDC, etc. starts
    const quoteAssets = ['USDT', 'USDC', 'USD', 'BTC', 'ETH'];
    for (const quote of quoteAssets) {
      if (symbol.endsWith(quote)) {
        return `${symbol.substring(0, symbol.length - quote.length)}-${quote}`;
      }
    }
    return symbol; // Fallback
  });
  
  // Build URL with instIds parameter
  const instIds = okxSymbols.join(',');
  const response = await axios.get(`https://www.okx.com/api/v5/market/tickers?instType=SPOT&instId=${instIds}`);
  
  if (response.data && response.data.data) {
    const now = Date.now();
    const updatedPrices = response.data.data.map((item: any) => {
      // Extract base symbol from instId (e.g., BTC-USDT -> BTCUSDT)
      const parts = item.instId.split('-');
      const symbol = parts.join('');
      
      return {
        symbol,
        price: parseFloat(item.last),
        timestamp: now,
        source: 'okx'
      };
    });
    
    // Merge with existing prices
    marketPrices = mergeMarketPrices(marketPrices, updatedPrices);
    
    logInfo('MarketData', `Updated ${updatedPrices.length} market prices from OKX`);
    
    // Save to database if connected
    try {
      await savePricesToDb(updatedPrices);
    } catch (dbError: any) {
      logError('MarketData', `Error saving prices to database: ${dbError.message}`);
    }
  } else {
    throw new Error('Invalid response from OKX API');
  }
}

/**
 * Merge existing market prices with updated ones
 * @param existing Existing market prices
 * @param updated Updated market prices
 * @returns Merged market prices
 */
function mergeMarketPrices(existing: MarketPrice[], updated: MarketPrice[]): MarketPrice[] {
  const result = [...existing];
  
  // For each updated price, replace the existing one or add it
  for (const updatedPrice of updated) {
    const index = result.findIndex(p => p.symbol === updatedPrice.symbol);
    if (index >= 0) {
      result[index] = updatedPrice;
    } else {
      result.push(updatedPrice);
    }
  }
  
  return result;
}

/**
 * Save market prices to database
 * @param prices Market prices to save
 */
async function savePricesToDb(prices: MarketPrice[]): Promise<void> {
  try {
    if (!db.getStatus().connected) {
      return; // Database not connected, skip
    }
    
    const marketDataCollection = db.getCollection('marketData');
    
    // Insert each price as a document
    for (const price of prices) {
      await marketDataCollection.updateOne(
        { symbol: price.symbol },
        { 
          $set: {
            price: price.price,
            timestamp: new Date(price.timestamp),
            source: price.source
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }
  } catch (error: any) {
    throw error;
  }
}

/**
 * Get current market prices
 * @param symbols Optional list of symbols to filter for
 * @returns List of market prices
 */
function getMarketPrices(symbols?: string[]): MarketPrice[] {
  if (!symbols) {
    return marketPrices;
  }
  
  return marketPrices.filter(price => symbols.includes(price.symbol));
}

/**
 * Get price for a specific symbol
 * @param symbol Trading pair symbol
 * @returns Market price or null if not found
 */
function getPrice(symbol: string): MarketPrice | null {
  const price = marketPrices.find(p => p.symbol === symbol);
  return price || null;
}

/**
 * Get status of the market data service
 * @returns Status information
 */
function getStatus(): any {
  return {
    initialized: isInitialized,
    primaryExchange,
    lastUpdateTime,
    symbolCount: marketPrices.length,
    symbols: marketPrices.map(p => p.symbol)
  };
}

/**
 * Change the primary exchange
 * @param exchange New primary exchange
 */
function setPrimaryExchange(exchange: 'binance' | 'okx'): void {
  primaryExchange = exchange;
  logInfo('MarketData', `Changed primary exchange to ${exchange}`);
}

/**
 * Stop the market data service
 */
function stop(): void {
  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
  
  isInitialized = false;
  logInfo('MarketData', 'Market data service stopped');
}

// Export functions
export {
  initialize,
  updateMarketData,
  getMarketPrices,
  getPrice,
  getStatus,
  setPrimaryExchange,
  stop
};

// Export default object for backwards compatibility
export default {
  initialize,
  updateMarketData,
  getMarketPrices,
  getPrice,
  getStatus,
  setPrimaryExchange,
  stop
};