/**
 * Routes for fetching market price data using the Python Binance Bridge
 * This provides the same interface as the original markets-binance.ts but uses
 * the Python implementation under the hood
 */

import { Router } from 'express';
import { pythonBinanceMarketService } from '../api/binance/python-binance-bridge';

const router = Router();

/**
 * Get all ticker prices (all cryptocurrencies)
 */
router.get('/api/markets/py-binance/prices', async (req, res) => {
  try {
    const data = await pythonBinanceMarketService.getAllPrices();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching prices from Python Binance Bridge:', error);
    res.status(500).json({ error: 'Failed to fetch prices', details: error.message });
  }
});

/**
 * Get price for a specific symbol
 */
router.get('/api/markets/py-binance/price/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await pythonBinanceMarketService.getSymbolPrice(symbol);
    
    if (!data) {
      return res.status(404).json({ error: `Price for ${symbol} not found` });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching price for ${req.params.symbol} from Python Binance Bridge:`, error);
    res.status(500).json({ error: 'Failed to fetch price', details: error.message });
  }
});

/**
 * Get 24hr ticker statistics (all cryptocurrencies)
 */
router.get('/api/markets/py-binance/24hr', async (req, res) => {
  try {
    const data = await pythonBinanceMarketService.get24hrStats();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching 24hr statistics from Python Binance Bridge:', error);
    res.status(500).json({ error: 'Failed to fetch 24hr statistics', details: error.message });
  }
});

/**
 * Get 24hr ticker statistics for a specific symbol
 */
router.get('/api/markets/py-binance/24hr/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const data = await pythonBinanceMarketService.get24hrStats(symbol);
    
    if (!data) {
      return res.status(404).json({ error: `24hr statistics for ${symbol} not found` });
    }
    
    res.json(data);
  } catch (error: any) {
    console.error(`Error fetching 24hr statistics for ${req.params.symbol} from Python Binance Bridge:`, error);
    res.status(500).json({ error: 'Failed to fetch 24hr statistics', details: error.message });
  }
});

/**
 * Get latest cached prices
 */
router.get('/api/markets/py-binance/latest-prices', (req, res) => {
  try {
    const data = pythonBinanceMarketService.getAllLatestPrices();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching latest prices from Python Binance Bridge:', error);
    res.status(500).json({ error: 'Failed to fetch latest prices', details: error.message });
  }
});

/**
 * Get simulated prices
 */
router.get('/api/markets/py-binance/simulated-prices', (req, res) => {
  try {
    const data = pythonBinanceMarketService.getSimulatedPrices();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching simulated prices from Python Binance Bridge:', error);
    res.status(500).json({ error: 'Failed to fetch simulated prices', details: error.message });
  }
});

export default router;