import { Router, Request, Response } from 'express';
import { accountService } from './accountService';
import { marketService } from './marketService';
import { bybitService } from './bybitService';
import { tradingBotService } from './tradingBotService';
import { convertToBybitPair, convertFromBybitPair } from './config';

const router = Router();

/**
 * Utility for handling API errors with consistent responses
 */
const handleApiError = (err: any, res: Response) => {
  console.error('Bybit API error:', err);
  res.status(500).json({
    success: false,
    message: err.message || 'An error occurred while processing your request',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

/**
 * Check Bybit API status and connectivity
 * GET /api/bybit/status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await accountService.checkConnection();
    res.json({
      success: true,
      status,
      apiKeyHasWritePermissions: status.hasWritePermissions,
      apiKeyHasReadPermissions: status.hasReadPermissions
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Verify API key permissions
 * GET /api/bybit/permissions
 */
router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const status = await accountService.checkConnection();
    res.json({
      success: true,
      hasReadPermissions: status.hasReadPermissions,
      hasWritePermissions: status.hasWritePermissions,
      message: status.message
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get Bybit configuration details
 * GET /api/bybit/config
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    res.json({
      success: true,
      config: {
        baseUrl: bybitService.getBaseUrl(),
        isConfigured: bybitService.isConfigured()
      }
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get market tickers
 * GET /api/bybit/markets
 */
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const markets = await marketService.getMarketData();
    res.json({
      success: true,
      markets
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get market detail for a specific symbol
 * GET /api/bybit/markets/:symbol
 */
router.get('/markets/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    // Convert from OKX style (BTC-USDT) to Bybit style (BTCUSDT) if needed
    const bybitSymbol = symbol.includes('-') ? convertToBybitPair(symbol) : symbol;
    
    const marketDetail = await marketService.getMarketDetail(bybitSymbol);
    res.json({
      success: true,
      market: marketDetail
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get candlestick data for a specific symbol
 * GET /api/bybit/candles/:symbol
 */
router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { interval = '60', limit = '100' } = req.query;
    
    // Convert from OKX style (BTC-USDT) to Bybit style (BTCUSDT) if needed
    const bybitSymbol = symbol.includes('-') ? convertToBybitPair(symbol) : symbol;
    
    const candles = await marketService.getCandlestickData(
      bybitSymbol,
      interval as string,
      parseInt(limit as string)
    );
    
    res.json({
      success: true,
      candles
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get account balance
 * GET /api/bybit/account/balance
 */
router.get('/account/balance', async (req: Request, res: Response) => {
  try {
    const balances = await accountService.getAccountBalances();
    res.json({
      success: true,
      balances
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get trading history
 * GET /api/bybit/account/history
 */
router.get('/account/history', async (req: Request, res: Response) => {
  try {
    const history = await accountService.getTradingHistory();
    res.json({
      success: true,
      history
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get open orders
 * GET /api/bybit/account/orders
 */
router.get('/account/orders', async (req: Request, res: Response) => {
  try {
    const orders = await accountService.getOpenOrders();
    res.json({
      success: true,
      orders
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Place a new order
 * POST /api/bybit/order
 */
router.post('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, amount, price } = req.body;
    
    if (!symbol || !side || !type || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Required: symbol, side, type, amount'
      });
    }
    
    // Convert from OKX style (BTC-USDT) to Bybit style (BTCUSDT) if needed
    const bybitSymbol = symbol.includes('-') ? convertToBybitPair(symbol) : symbol;
    
    // Convert side to Bybit format (Buy/Sell)
    const bybitSide = side.toLowerCase() === 'buy' ? 'Buy' : 'Sell';
    
    // Convert type to Bybit format (Limit/Market)
    const bybitType = type.toLowerCase() === 'limit' ? 'Limit' : 'Market';
    
    const result = await accountService.placeOrder(
      bybitSymbol,
      bybitSide as 'Buy' | 'Sell',
      bybitType as 'Limit' | 'Market',
      amount,
      price
    );
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Cancel an existing order
 * DELETE /api/bybit/order
 */
router.delete('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, orderId } = req.body;
    
    if (!symbol || !orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Required: symbol, orderId'
      });
    }
    
    // Convert from OKX style (BTC-USDT) to Bybit style (BTCUSDT) if needed
    const bybitSymbol = symbol.includes('-') ? convertToBybitPair(symbol) : symbol;
    
    const result = await accountService.cancelOrder(bybitSymbol, orderId);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Create a new trading bot
 * POST /api/bybit/bots
 */
router.post('/bots', async (req: Request, res: Response) => {
  try {
    const { name, strategy, description, parameters } = req.body;
    
    if (!name || !strategy || !description || !parameters) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters. Required: name, strategy, description, parameters'
      });
    }
    
    const bot = await tradingBotService.createBot(
      name,
      strategy,
      description,
      parameters
    );
    
    res.status(201).json({
      success: true,
      bot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Start a trading bot
 * POST /api/bybit/bots/:id/start
 */
router.post('/bots/:id/start', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const success = await tradingBotService.startBot(id);
    
    if (success) {
      res.json({
        success: true,
        message: `Bot ${id} started successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to start bot ${id}`
      });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Stop a trading bot
 * POST /api/bybit/bots/:id/stop
 */
router.post('/bots/:id/stop', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const success = await tradingBotService.stopBot(id);
    
    if (success) {
      res.json({
        success: true,
        message: `Bot ${id} stopped successfully`
      });
    } else {
      res.status(400).json({
        success: false,
        message: `Failed to stop bot ${id}`
      });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get bot status
 * GET /api/bybit/bots/:id/status
 */
router.get('/bots/:id/status', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const status = await tradingBotService.getBotStatus(id);
    
    res.json({
      success: true,
      status
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get bot performance
 * GET /api/bybit/bots/:id/performance
 */
router.get('/bots/:id/performance', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const performance = await tradingBotService.getBotPerformance(id);
    
    res.json({
      success: true,
      performance
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;