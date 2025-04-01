/**
 * Binance Market API Routes using Python Bridge
 * 
 * These routes provide access to Binance market data via the Python implementation
 * which uses the official Binance connector SDK (binance-connector) for improved stability and proxy support.
 */

import { Router, Request, Response } from 'express';
import { pythonBinanceMarketService } from '../api/binance/python-binance-bridge';

const router = Router();

// In-memory cache for market data
let marketDataCache: {
  data: any[];
  timestamp: Date;
  source: string;
} | null = null;

// Cache expiration time in milliseconds (5 minutes)
const CACHE_EXPIRATION = 5 * 60 * 1000;

/**
 * Get all market prices from Binance via Python bridge
 * 
 * @route GET /api/markets/python/all-markets
 * @returns {Object} success - Whether the request was successful
 * @returns {Array} data - Array of market data
 */
router.get('/all-markets', async (req: Request, res: Response) => {
  try {
    // Check if we should force refresh cache
    const forceRefresh = req.query.refresh === 'true';
    
    // Check if we have a valid cache
    if (!forceRefresh && marketDataCache && 
        marketDataCache.data && 
        marketDataCache.data.length > 0 &&
        (new Date().getTime() - marketDataCache.timestamp.getTime()) < CACHE_EXPIRATION) {
      
      console.log('[api] Returning cached Binance market data (age: ' + 
                 ((new Date().getTime() - marketDataCache.timestamp.getTime()) / 1000).toFixed(0) + 
                 's)');
      
      return res.json({
        success: true,
        source: marketDataCache.source,
        timestamp: marketDataCache.timestamp.toISOString(),
        count: marketDataCache.data.length,
        data: marketDataCache.data,
        fromCache: true
      });
    }
    
    console.log('[api] Fetching all Binance market pairs via Python bridge');
    const allPrices = await pythonBinanceMarketService.getAllPrices();
    
    if (!allPrices || allPrices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No price data available from Binance via Python bridge'
      });
    }
    
    // Get 24hr statistics for extra market data like price change, volume, etc.
    let stats24hr: any[] = [];
    try {
      stats24hr = await pythonBinanceMarketService.get24hrStats() as any[];
    } catch (statsError) {
      console.warn('Failed to fetch 24hr stats, continuing with price data only:', statsError);
    }
    
    // Process the prices to add additional data
    const processedPrices = allPrices.map(ticker => {
      // Extract base and quote from symbol (e.g., BTCUSDT -> BTC and USDT)
      let baseSymbol = ticker.symbol;
      let quoteSymbol = '';
      
      // Check for common quote currencies
      const quotes = ['USDT', 'BUSD', 'USDC', 'BTC', 'ETH', 'BNB'];
      for (const quote of quotes) {
        if (ticker.symbol.endsWith(quote)) {
          baseSymbol = ticker.symbol.slice(0, -quote.length);
          quoteSymbol = quote;
          break;
        }
      }
      
      // Find matching 24hr stats if available
      const stats = Array.isArray(stats24hr) 
        ? stats24hr.find(stat => stat.symbol === ticker.symbol) 
        : null;
      
      return {
        symbol: ticker.symbol,
        baseSymbol,
        quoteSymbol,
        price: typeof ticker.price === 'string' ? parseFloat(ticker.price) : ticker.price,
        formattedPrice: formatPrice(typeof ticker.price === 'string' ? parseFloat(ticker.price) : ticker.price),
        // Add 24hr statistics if available
        priceChangePercent: stats ? parseFloat(stats.priceChangePercent || 0) : 0,
        volume: stats ? parseFloat(stats.volume || 0) : 0,
        quoteVolume: stats ? parseFloat(stats.quoteVolume || 0) : 0,
        high24h: stats ? parseFloat(stats.highPrice || 0) : 0,
        low24h: stats ? parseFloat(stats.lowPrice || 0) : 0,
        source: 'binance-python'
      };
    });
    
    // Update cache
    marketDataCache = {
      data: processedPrices,
      timestamp: new Date(),
      source: 'binance-python'
    };
    
    // Return all processed prices
    return res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      count: processedPrices.length,
      data: processedPrices,
      fromCache: false
    });
  } catch (error: any) {
    console.error(`Error fetching Binance markets data via Python bridge: ${error}`);
    
    // If we have cache data, return it even if it's expired
    if (marketDataCache && marketDataCache.data && marketDataCache.data.length > 0) {
      console.log('[api] Returning expired cache data due to API error');
      
      return res.json({
        success: true,
        source: marketDataCache.source,
        timestamp: marketDataCache.timestamp.toISOString(),
        count: marketDataCache.data.length,
        data: marketDataCache.data,
        fromCache: true,
        cacheAge: Math.floor((new Date().getTime() - marketDataCache.timestamp.getTime()) / 1000)
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message || String(error)
    });
  }
});

/**
 * Format price to appropriate precision based on value
 */
function formatPrice(price: number): string {
  if (price >= 1000) {
    return price.toFixed(2);
  } else if (price >= 1) {
    return price.toFixed(4);
  } else if (price >= 0.0001) {
    return price.toFixed(6);
  } else {
    return price.toFixed(8);
  }
}

/**
 * Get price for a specific symbol
 * 
 * @route GET /api/binance-python/price/:symbol
 * @param {string} symbol - The trading pair symbol (e.g., BTCUSDT)
 * @returns {Object} success - Whether the request was successful
 * @returns {Object} data - Price data for the requested symbol
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol parameter is required'
      });
    }

    const priceData = await pythonBinanceMarketService.getSymbolPrice(symbol);
    
    if (!priceData) {
      return res.status(404).json({
        success: false,
        error: `Price data not found for symbol: ${symbol}`
      });
    }
    
    return res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      data: priceData
    });
  } catch (error: any) {
    console.error(`Error fetching price for ${req.params.symbol}: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch price data',
      message: error.message || String(error)
    });
  }
});

/**
 * Get 24hr statistics for a symbol or all symbols
 * 
 * @route GET /api/binance-python/24hr-stats/:symbol?
 * @param {string} symbol - Optional trading pair symbol
 * @returns {Object} success - Whether the request was successful
 * @returns {Object|Array} data - 24hr statistics for the requested symbol(s)
 */
router.get('/24hr-stats/:symbol?', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    const stats = await pythonBinanceMarketService.get24hrStats(symbol);
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        error: `24hr statistics not found${symbol ? ` for symbol: ${symbol}` : ''}`
      });
    }
    
    return res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      data: stats
    });
  } catch (error: any) {
    console.error(`Error fetching 24hr stats${req.params.symbol ? ` for ${req.params.symbol}` : ''}: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch 24hr statistics',
      message: error.message || String(error)
    });
  }
});

/**
 * Get cached latest prices
 * 
 * @route GET /api/binance-python/latest-prices
 * @returns {Object} success - Whether the request was successful
 * @returns {Array} data - Array of latest prices
 */
router.get('/latest-prices', async (req: Request, res: Response) => {
  try {
    const prices = pythonBinanceMarketService.getAllLatestPrices();
    
    return res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      data: prices
    });
  } catch (error: any) {
    console.error(`Error fetching latest prices: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch latest prices',
      message: error.message || String(error)
    });
  }
});

/**
 * Get simulated prices (for testing and fallback)
 * 
 * @route GET /api/binance-python/simulated-prices
 * @returns {Object} success - Whether the request was successful
 * @returns {Object} data - Object of simulated prices
 */
router.get('/simulated-prices', async (req: Request, res: Response) => {
  // Always return an error now - we don't want to use simulated prices
  return res.status(503).json({
    success: false,
    error: 'Market data unavailable',
    message: 'Real API data is required. Please check your API keys and connection.',
    requiresAuthentication: true
  });
});

export default router;