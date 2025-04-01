/**
 * Markets Binance Python Routes
 * 
 * This module provides Express routes that use the Python Binance Bridge
 * to access Binance market data via the Python Flask application.
 */

import { Router, Request, Response } from 'express';
import { pythonBinanceBridge } from '../api/binance/python-binance-bridge';
import { logger } from '../logger';

const router = Router();

/**
 * GET /api/markets/python-binance/ping
 * Ping the Python Binance service
 */
router.get('/ping', async (req: Request, res: Response) => {
  try {
    const isRunning = await pythonBinanceBridge.ensureServiceRunning();
    if (isRunning) {
      return res.status(200).json({
        success: true,
        message: 'Python Binance service is running',
        source: 'python-binance-bridge'
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Python Binance service is not running',
        source: 'python-binance-bridge'
      });
    }
  } catch (error) {
    logger.error(`Error pinging Python Binance service: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to ping Python Binance service',
      error: String(error)
    });
  }
});

/**
 * GET /api/markets/python-binance/prices
 * Get all current prices from Python Binance service
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const data = await pythonBinanceBridge.getAllPrices();
    return res.status(200).json(data);
  } catch (error) {
    logger.error(`Error fetching all prices from Python Binance service: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch prices from Python Binance service',
      error: String(error)
    });
  }
});

/**
 * GET /api/markets/python-binance/price/:symbol
 * Get price for a specific symbol from Python Binance service
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const data = await pythonBinanceBridge.getSymbolPrice(symbol);
    
    if (!data || data.success === false) {
      return res.status(404).json({
        success: false,
        message: `No price data found for symbol: ${symbol}`,
        source: 'python-binance-bridge'
      });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    logger.error(`Error fetching price from Python Binance service: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch price from Python Binance service',
      error: String(error)
    });
  }
});

/**
 * GET /api/markets/python-binance/ticker/24hr
 * Get 24hr ticker statistics for one or all symbols
 */
router.get('/ticker/24hr', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    const data = await pythonBinanceBridge.get24hrStats(symbol as string | undefined);
    
    if (!data || data.success === false) {
      return res.status(404).json({
        success: false,
        message: symbol 
          ? `No 24hr statistics found for symbol: ${symbol}`
          : 'No 24hr statistics found',
        source: 'python-binance-bridge'
      });
    }
    
    return res.status(200).json(data);
  } catch (error) {
    logger.error(`Error fetching 24hr stats from Python Binance service: ${error}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch 24hr statistics from Python Binance service',
      error: String(error)
    });
  }
});

export default router;