/**
 * Markets Candles Router - Provides candle data from multiple brokers
 * 
 * This router handles candle data requests with automatic fallback
 * between Binance and OKX brokers.
 */

import express, { Request, Response } from 'express';
import { MultiBrokerService } from '../api/brokers/multiBrokerService';
import { BrokerType } from '../api/brokers/interfaces';

const router = express.Router();
const multiBrokerService = new MultiBrokerService();

/**
 * Map common interval strings to broker-specific formats
 * This function standardizes intervals across different brokers
 * 
 * @param interval The interval string to map (e.g., "1h", "15m", "1d")
 * @returns The standardized interval string
 */
function mapInterval(interval: string): string {
  // Default supported intervals for most brokers: 
  // 1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M
  
  const validIntervals = [
    '1m', '3m', '5m', '15m', '30m',
    '1h', '2h', '4h', '6h', '8h', '12h',
    '1d', '3d', '1w', '1M'
  ];
  
  if (validIntervals.includes(interval)) {
    return interval;
  }
  
  // Handle alternative formats
  const alternativeFormats: { [key: string]: string } = {
    '1min': '1m',
    '3min': '3m',
    '5min': '5m',
    '15min': '15m',
    '30min': '30m',
    '1hour': '1h',
    '2hour': '2h',
    '4hour': '4h',
    '6hour': '6h',
    '8hour': '8h',
    '12hour': '12h',
    '1day': '1d',
    '3day': '3d',
    '1week': '1w',
    '1month': '1M'
  };
  
  return alternativeFormats[interval] || '1h'; // Default to 1h if not found
}

/**
 * Get candle data for a specific symbol and interval
 * This endpoint uses the multi-broker service to automatically fall back
 * between Binance and OKX if one is unavailable
 * 
 * @route GET /api/markets/candles/:symbol
 */
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const interval = mapInterval(req.query.interval as string || '1h');
    const limit = parseInt(req.query.limit as string || '100', 10);
    
    // Get candle data with automatic fallback
    const candles = await multiBrokerService.getCandles(symbol, interval, limit);
    
    // Add source info to response
    const activeBroker = multiBrokerService.getActiveBrokerType();
    
    res.json({
      symbol,
      interval,
      count: candles.length,
      source: activeBroker === BrokerType.BINANCE ? 'binance' : 'okx',
      sourceType: multiBrokerService.getActiveBrokerType(),
      candles
    });
  } catch (error: any) {
    console.error('Error fetching candle data:', error);
    res.status(500).json({ 
      error: 'Failed to fetch candle data',
      message: error.message || 'Unknown error'
    });
  }
});

export default router;