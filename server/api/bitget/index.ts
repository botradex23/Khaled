import { Router, Request, Response } from 'express';
import axios from 'axios';
import { marketService } from './marketService';
import { accountService } from './accountService';
import { bitgetService } from './bitgetService';
import { tradingBotService } from './tradingBotService';
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
    // Get all tickers to examine format
    const allTickers = await bitgetService.getAllTickers();
    const sampleTickers = Array.isArray(allTickers) && allTickers.length > 0 
      ? allTickers.slice(0, 3) 
      : [];
    
    res.json({
      apiConfigured: isConfigured(),
      baseUrl: bitgetService.getBaseUrl(),
      usingDemoMode: ALWAYS_USE_DEMO,
      tradingStrategies: TRADING_STRATEGIES,
      defaultPairs: DEFAULT_PAIRS,
      debug: {
        sampleTickers,
        tickersCount: Array.isArray(allTickers) ? allTickers.length : 0,
      }
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
 * Get raw ticker data for debugging
 * GET /api/bitget/raw-ticker/:symbol
 */
router.get('/raw-ticker/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Symbol parameter is required'
      });
    }
    
    console.log(`Fetching all tickers to examine data structure`);
    
    // For now, get all tickers and filter to find the requested one
    const allTickers = await bitgetService.getAllTickers();
    
    // Find the requested ticker from all tickers
    let requestedTicker = null;
    if (Array.isArray(allTickers)) {
      requestedTicker = allTickers.find((ticker: any) => 
        ticker.symbol === symbol || 
        ticker.symbol.replace(/_/g, '') === symbol ||
        ticker.symbol.replace(/-/g, '') === symbol
      );
      
      console.log(`All tickers count: ${allTickers.length}`);
      console.log(`First few symbols: ${allTickers.slice(0, 5).map((t: any) => t.symbol).join(', ')}`);
      console.log(`Found requested ticker: ${requestedTicker ? 'Yes' : 'No'}`);
    }
    
    res.json({
      success: true,
      requestedTicker: requestedTicker,
      allTickersSample: Array.isArray(allTickers) && allTickers.length > 0 ? 
        allTickers.slice(0, 3) : [],
      message: 'Raw ticker data retrieved for debugging',
      dataFormat: {
        allTickersType: typeof allTickers,
        isArray: Array.isArray(allTickers),
        count: Array.isArray(allTickers) ? allTickers.length : 0
      }
    });
  } catch (err) {
    console.error('Error fetching raw ticker data:', err);
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
    
    console.log("Candles endpoint called with params:", {
      symbol,
      interval,
      limit
    });
    
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
    
    // בדיקה האם יש נתונים אמיתיים מה-API
    const currentDate = new Date();
    
    // נבדוק שיש לנו נתונים טובים מה-API
    // נתונים אמיתיים צריכים להיות מערך עם פריטים שמכילים את כל השדות הדרושים
    // ושהערכים סבירים (למשל מחיר גדול מ-0)
    const isRealApiData = Array.isArray(candleData) && candleData.length > 0 && 
                         candleData[0].hasOwnProperty('open') && candleData[0].hasOwnProperty('close') &&
                         candleData[0].hasOwnProperty('high') && candleData[0].hasOwnProperty('low') &&
                         candleData[0].hasOwnProperty('volume') && candleData[0].hasOwnProperty('timestamp') &&
                         parseFloat(candleData[0].open) > 0 && 
                         parseFloat(candleData[0].volume) > 0;
    
    // לוג של דוגמת נתונים ראשונה
    if (Array.isArray(candleData) && candleData.length > 0) {
      console.log("Sample data first item:", JSON.stringify(candleData[0]));
      
      // הוסף בדיקה של התאריך כדי לראות אם הוא מסוג תאריך אמיתי נכון
      try {
        const firstTimestamp = new Date(candleData[0].timestamp);
        console.log("First timestamp parsed:", {
          original: candleData[0].timestamp,
          parsed: firstTimestamp.toISOString(),
          isValidDate: !isNaN(firstTimestamp.getTime()),
          yearIs2025: firstTimestamp.getFullYear() === 2025,
          timeDiff: Math.abs(firstTimestamp.getTime() - currentDate.getTime()) / (1000 * 60 * 60)
        });
      } catch (err) {
        console.error("Error parsing timestamp:", err);
      }
    }
    
    // לוג מפורט לגבי נתוני הנרות
    console.log("Candles result summary:", {
      count: Array.isArray(candleData) ? candleData.length : 0,
      isRealApiData: isRealApiData,
      isDemoData: !isRealApiData, // נתונים אמיתיים יסומנו כ-isDemoData=false
      hasExpectedProperties: Array.isArray(candleData) && candleData.length > 0 ?
                            ['timestamp', 'open', 'high', 'low', 'close', 'volume'].every(prop => 
                              candleData[0].hasOwnProperty(prop)) : false,
      firstTimestamp: Array.isArray(candleData) && candleData.length > 0 ? candleData[0].timestamp : null,
      lastTimestamp: Array.isArray(candleData) && candleData.length > 0 ? candleData[candleData.length-1].timestamp : null,
    });
    
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

/**
 * Create a new trading bot
 * POST /api/bitget/bots
 */
router.post('/bots', async (req: Request, res: Response) => {
  try {
    const { name, strategy, description, parameters } = req.body;
    
    if (!name || !strategy || !parameters) {
      return res.status(400).json({
        success: false,
        message: 'name, strategy, and parameters are required fields'
      });
    }
    
    // Create the bot
    const bot = await tradingBotService.createBot(
      name,
      strategy,
      description || `${strategy} trading bot`,
      parameters
    );
    
    res.status(201).json(bot);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Start a trading bot
 * POST /api/bitget/bots/:id/start
 */
router.post('/bots/:id/start', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id, 10);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const success = await tradingBotService.startBot(botId);
    
    res.json({
      success,
      message: success ? 'Bot started successfully' : 'Failed to start bot'
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Stop a trading bot
 * POST /api/bitget/bots/:id/stop
 */
router.post('/bots/:id/stop', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id, 10);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const success = await tradingBotService.stopBot(botId);
    
    res.json({
      success,
      message: success ? 'Bot stopped successfully' : 'Bot was not running'
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get bot status
 * GET /api/bitget/bots/:id/status
 */
router.get('/bots/:id/status', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id, 10);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const status = await tradingBotService.getBotStatus(botId);
    res.json(status);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get bot performance
 * GET /api/bitget/bots/:id/performance
 */
router.get('/bots/:id/performance', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id, 10);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid bot ID'
      });
    }
    
    const performance = await tradingBotService.getBotPerformance(botId);
    res.json(performance);
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Get raw account info for debugging
 * GET /api/bitget/raw-account-info
 */
router.get('/raw-account-info', async (req: Request, res: Response) => {
  try {
    // Get raw API response without any transformation
    const response = await bitgetService.makeAuthenticatedRequest('GET', '/api/spot/v1/account/assets');
    console.log('Raw account info response:', JSON.stringify(response));
    res.json({
      success: true,
      data: response,
      message: 'Raw account info retrieved for debugging'
    });
  } catch (error) {
    console.error('Error fetching raw account info:', error);
    handleApiError(error, res);
  }
});

export default router;