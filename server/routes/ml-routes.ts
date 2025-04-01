/**
 * ML Routes
 * 
 * This module provides Express routes that directly communicate with the Python Flask service
 * for ML predictions and model management.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '../logger';

const router = Router();
const pythonServiceUrl = 'http://localhost:5001';

/**
 * GET /api/ml/predict/:symbol
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
    
    // Important: Explicitly set headers to ensure we return JSON
    res.setHeader('Content-Type', 'application/json');
    return res.json(response.data);
  } catch (error: any) {
    logger.error(`Error getting ML prediction: ${error.message}`);
    
    // Return a fallback response with clear error information
    return res.status(200).json({
      success: true,
      symbol: symbol.toUpperCase(),
      signal: 'HOLD',
      confidence: 0.75,
      current_price: symbol.includes('BTC') ? 89000 : symbol.includes('ETH') ? 3800 : 100,
      timestamp: new Date().toISOString(),
      is_sample_data: true,
      probabilities: {
        SELL: 0.15,
        HOLD: 0.75,
        BUY: 0.10
      },
      indicators: {
        rsi_14: 50.0,
        ema_20: 45000,
        macd: 0.0,
        macd_signal: 0.0,
        macd_hist: 0.0
      },
      error: error.message
    });
  }
});

/**
 * POST /api/ml/predictions
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
    
    // Generate fallback predictions for all requested symbols
    const fallbackPredictions: Record<string, any> = {};
    
    symbols.forEach(symbol => {
      fallbackPredictions[symbol] = {
        success: true,
        symbol: symbol,
        signal: 'HOLD',
        confidence: 0.70,
        current_price: symbol.includes('BTC') ? 89000 : symbol.includes('ETH') ? 3800 : 100,
        timestamp: new Date().toISOString(),
        is_sample_data: true,
        probabilities: {
          SELL: 0.15,
          HOLD: 0.70,
          BUY: 0.15
        },
        indicators: {
          rsi_14: 50.0,
          ema_20: symbol.includes('BTC') ? 45000 : symbol.includes('ETH') ? 3700 : 95,
          macd: 0.0,
          macd_signal: 0.0,
          macd_hist: 0.0
        }
      };
    });
    
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      predictions: fallbackPredictions,
      error: error.message
    });
  }
});

/**
 * GET /api/ml/status
 * Get ML service status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    logger.info(`Fetching ML service status from Python Flask service`);
    
    const response = await axios.get(`${pythonServiceUrl}/api/status`, {
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
    
    return res.status(200).json({
      success: true,
      status: 'degraded',
      message: 'ML service is unavailable but the system is using fallback data',
      error: error.message
    });
  }
});

export default router;