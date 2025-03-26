import { Router, Request, Response } from 'express';
import { marketService } from './marketService';
import { accountService } from './accountService';
import { bitgetService } from './bitgetService';
import { isConfigured, TRADING_STRATEGIES, DEFAULT_PAIRS, ALWAYS_USE_DEMO } from './config';

const router = Router();

/**
 * Utility for handling API errors with consistent responses
 */
const handleApiError = (err: any, res: Response) => {
  console.error('Bitget API Error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An error occurred communicating with Bitget API',
    error: err.toString()
  });
};

/**
 * Check Bitget API status and connectivity
 * GET /api/bitget/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await accountService.checkConnection();
    res.json(status);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get Bitget configuration details
 * GET /api/bitget/config
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    res.json({
      apiConfigured: isConfigured(),
      baseUrl: bitgetService.getBaseUrl(),
      usingDemoMode: ALWAYS_USE_DEMO,
      tradingStrategies: TRADING_STRATEGIES,
      defaultPairs: DEFAULT_PAIRS
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get market tickers
 * GET /api/bitget/markets
 */
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const { symbols } = req.query;
    
    // Parse symbols from query string if provided
    const symbolArray = symbols ? (symbols as string).split(',') : [];
    
    const marketData = await marketService.getMarketData(
      symbolArray.length > 0 ? symbolArray : undefined
    );
    
    res.json(marketData);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get market detail for a specific symbol
 * GET /api/bitget/markets/:symbol
 */
router.get('/markets/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol parameter is required'
      });
    }
    
    const marketDetail = await marketService.getMarketDetail(symbol);
    res.json(marketDetail);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get candlestick data for a specific symbol
 * GET /api/bitget/candles/:symbol
 */
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { interval = '1h', limit = '100' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol parameter is required'
      });
    }
    
    const candleData = await marketService.getCandlestickData(
      symbol,
      interval as string,
      parseInt(limit as string, 10)
    );
    
    res.json(candleData);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get account balance
 * GET /api/bitget/account/balance
 */
router.get('/account/balance', async (req: Request, res: Response) => {
  try {
    const balances = await accountService.getAccountBalances();
    res.json(balances);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get trading history
 * GET /api/bitget/account/history
 */
router.get('/account/history', async (req: Request, res: Response) => {
  try {
    const history = await accountService.getTradingHistory();
    res.json(history);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get open orders
 * GET /api/bitget/account/orders
 */
router.get('/account/orders', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    const orders = await accountService.getOpenOrders();
    res.json(orders);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Place a new order
 * POST /api/bitget/order
 */
router.post('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'symbol, side, type, and quantity are required parameters'
      });
    }
    
    // Validate side
    if (side !== 'buy' && side !== 'sell') {
      return res.status(400).json({
        success: false,
        message: 'side must be either "buy" or "sell"'
      });
    }
    
    // Validate order type
    if (type !== 'limit' && type !== 'market') {
      return res.status(400).json({
        success: false,
        message: 'type must be either "limit" or "market"'
      });
    }
    
    // For limit orders, price is required
    if (type === 'limit' && !price) {
      return res.status(400).json({
        success: false,
        message: 'price is required for limit orders'
      });
    }
    
    const result = await accountService.placeOrder(
      symbol,
      side as 'buy' | 'sell',
      type as 'limit' | 'market',
      quantity,
      price
    );
    
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Cancel an existing order
 * DELETE /api/bitget/order
 */
router.delete('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, orderId } = req.body;
    
    if (!symbol || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'symbol and orderId are required parameters'
      });
    }
    
    const result = await accountService.cancelOrder(symbol, orderId);
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;