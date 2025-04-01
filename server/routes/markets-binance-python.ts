/**
 * Markets Binance Python Routes
 * 
 * This module provides Express routes that use the Python Binance Bridge
 * to access Binance market data via the Python Flask application.
 */

import { Router, Request, Response } from 'express';
import { pythonBinanceBridge } from '../api/binance/python-binance-bridge';
import { logger } from '../logger';
import axios from 'axios';

const router = Router();
const pythonServiceUrl = 'http://localhost:5001';

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

/**
 * GET /api/markets/python-binance/predict/:symbol
 * Get ML predictions for a specific symbol
 */
router.get('/predict/:symbol', async (req: Request, res: Response) => {
  const { symbol } = req.params;
  const interval = req.query.interval as string || '4h';
  const sample = req.query.sample === 'true';
  
  try {
    const url = `${pythonServiceUrl}/api/ml/predict/${symbol}?interval=${interval}&sample=${sample}`;
    logger.info(`Fetching ML prediction from: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Successfully received prediction data for ${symbol}`);
    
    res.setHeader('Content-Type', 'application/json');
    return res.json(response.data);
  } catch (error: any) {
    logger.error(`Error getting ML prediction: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: `Failed to get ML prediction: ${error.message}`,
      error: String(error)
    });
  }
});

/**
 * POST /api/markets/python-binance/predictions
 * Get ML predictions for multiple symbols
 */
router.post('/predictions', async (req: Request, res: Response) => {
  const { symbols, interval, sample } = req.body;
  
  if (!symbols || !Array.isArray(symbols)) {
    return res.status(400).json({
      success: false,
      message: 'Missing or invalid symbols array in request body'
    });
  }
  
  try {
    logger.info(`Fetching batch ML predictions for symbols: ${symbols.join(', ')}`);
    
    const response = await axios.post(`${pythonServiceUrl}/api/ml/predictions`, {
      symbols,
      interval: interval || '4h',
      sample: sample || false
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Successfully received batch prediction data for ${symbols.length} symbols`);
    
    res.setHeader('Content-Type', 'application/json');
    return res.json(response.data);
  } catch (error: any) {
    logger.error(`Error getting batch predictions from ML service: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: `Failed to get batch predictions from ML service: ${error.message}`,
      error: String(error)
    });
  }
});

/**
 * GET /api/markets/python-binance/ml/status
 * Get ML service status
 */
router.get('/ml/status', async (req: Request, res: Response) => {
  try {
    logger.info(`Fetching ML service status from: ${pythonServiceUrl}/api/ml/status`);
    
    const response = await axios.get(`${pythonServiceUrl}/api/ml/status`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    logger.info(`Successfully received ML service status`);
    
    res.setHeader('Content-Type', 'application/json');
    return res.json(response.data);
  } catch (error: any) {
    logger.error(`Error getting ML service status: ${error.message}`);
    
    return res.status(500).json({
      success: false,
      message: `Failed to get ML service status: ${error.message}`,
      error: String(error)
    });
  }
});

export default router;