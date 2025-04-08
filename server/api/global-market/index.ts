/**
 * Global Market Data API Routes
 * 
 * These routes provide access to global market data and ML predictions
 * without requiring API keys or authentication.
 */

import express from 'express';
import { globalMarketData, mlPredictionService } from '../../system-init';

const router = express.Router();

/**
 * Get status of global market services
 * @route GET /api/global-market/status
 * @access Public
 */
router.get('/status', (req, res) => {
  try {
    const marketStatus = globalMarketData.getStatus();
    const mlStatus = mlPredictionService.getStatus();
    
    res.json({
      success: true,
      marketData: marketStatus,
      mlPrediction: mlStatus
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting global market status',
      error: error.message
    });
  }
});

/**
 * Get all market prices
 * @route GET /api/global-market/prices
 * @access Public
 */
router.get('/prices', (req, res) => {
  try {
    const prices = globalMarketData.getMarketPrices();
    
    // Allow filtering by specific currency type
    const currencyType = req.query.currency?.toString().toLowerCase();
    let filteredPrices = prices;
    
    if (currencyType) {
      filteredPrices = prices.filter(price => {
        if (currencyType === 'usdt') return price.symbol.endsWith('USDT');
        if (currencyType === 'usdc') return price.symbol.endsWith('USDC');
        if (currencyType === 'busd') return price.symbol.endsWith('BUSD');
        return true;
      });
    }
    
    res.json({
      success: true,
      count: filteredPrices.length,
      data: filteredPrices,
      source: globalMarketData.getStatus().primaryExchange,
      timestamp: Date.now()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error getting market prices',
      error: error.message
    });
  }
});

/**
 * Get price for a specific symbol
 * @route GET /api/global-market/prices/:symbol
 * @access Public
 */
router.get('/prices/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const price = globalMarketData.getMarketPrice(symbol);
    
    if (!price) {
      return res.status(404).json({
        success: false,
        message: `Price not found for symbol ${symbol}`
      });
    }
    
    res.json({
      success: true,
      data: price
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting market price',
      error: error.message
    });
  }
});

/**
 * Get candle data for a symbol and timeframe
 * @route GET /api/global-market/candles/:symbol
 * @access Public
 */
router.get('/candles/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const interval = req.query.interval as string || '1h';
    const limit = parseInt(req.query.limit as string || '100');
    
    const candles = await globalMarketData.fetchCandleData(symbol, interval, limit);
    
    res.json({
      success: true,
      count: candles.length,
      symbol,
      interval,
      data: candles
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting candle data',
      error: error.message
    });
  }
});

/**
 * Get ML predictions
 * @route GET /api/global-market/predictions
 * @access Public
 */
router.get('/predictions', (req, res) => {
  try {
    const predictions = mlPredictionService.getAllPredictions();
    
    res.json({
      success: true,
      count: predictions.length,
      data: predictions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting predictions',
      error: error.message
    });
  }
});

/**
 * Get prediction for a specific symbol and timeframe
 * @route GET /api/global-market/predictions/:symbol
 * @access Public
 */
router.get('/predictions/:symbol', (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const timeframe = req.query.timeframe as string || '1h';
    
    const prediction = mlPredictionService.getPrediction(symbol, timeframe);
    
    if (!prediction) {
      return res.status(404).json({
        success: false,
        message: `Prediction not found for ${symbol} with timeframe ${timeframe}`
      });
    }
    
    res.json({
      success: true,
      data: prediction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting prediction',
      error: error.message
    });
  }
});

/**
 * Get top trading signals
 * @route GET /api/global-market/signals
 * @access Public
 */
router.get('/signals', (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string || '5');
    const signals = mlPredictionService.getTopSignals(limit);
    
    res.json({
      success: true,
      count: signals.length,
      data: signals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting trading signals',
      error: error.message
    });
  }
});

export default router;