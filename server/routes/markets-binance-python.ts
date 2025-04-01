/**
 * Binance Market API Routes using Python Bridge
 * 
 * These routes provide access to Binance market data via the Python implementation
 * which uses the ccxt library for improved stability and proxy support.
 */

import { Router, Request, Response } from 'express';
import { pythonBinanceMarketService } from '../api/binance/python-binance-bridge';

const router = Router();

/**
 * Get all market prices from Binance via Python bridge
 * 
 * @route GET /api/binance-python/all-markets
 * @returns {Object} success - Whether the request was successful
 * @returns {Array} data - Array of market data
 */
router.get('/all-markets', async (req: Request, res: Response) => {
  try {
    console.log('[api] Fetching all Binance market pairs via Python bridge');
    const prices = await pythonBinanceMarketService.getAllPrices();
    
    return res.json({
      success: true,
      source: 'binance-python',
      timestamp: new Date().toISOString(),
      data: prices
    });
  } catch (error: any) {
    console.error(`Error fetching Binance markets data via Python bridge: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch market data',
      message: error.message || String(error)
    });
  }
});

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
  try {
    const prices = pythonBinanceMarketService.getSimulatedPrices();
    
    return res.json({
      success: true,
      source: 'binance-python-simulated',
      timestamp: new Date().toISOString(),
      data: prices
    });
  } catch (error: any) {
    console.error(`Error fetching simulated prices: ${error}`);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch simulated prices',
      message: error.message || String(error)
    });
  }
});

export default router;