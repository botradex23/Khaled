import { Router, Request, Response } from 'express';
import { okxService } from './okxService';
import { marketService } from './marketService';
import { accountService } from './accountService';
import { tradingBotService } from './tradingBotService';
import { DEFAULT_PAIRS } from './config';

const router = Router();

// Middleware to handle common errors
const handleApiError = (err: any, res: Response) => {
  console.error('OKX API Error:', err);
  
  if (err.name === 'OkxApiNotConfiguredError') {
    return res.status(503).json({
      error: 'API Not Configured',
      message: 'OKX API credentials are not properly configured'
    });
  }
  
  if (err.response) {
    // Error from OKX API
    return res.status(err.response.status || 500).json({
      error: 'API Error',
      message: err.response.data?.msg || err.message
    });
  }
  
  return res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
};

// Check API status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await accountService.checkConnection();
    
    // Log key format details on the server for easier debugging
    if (status.keyFormat) {
      console.log(`
OKX API Key Format Analysis:
- API Key: ${status.keyFormat.apiKeyFormat}
- Secret Key: ${status.keyFormat.secretKeyFormat}
- Passphrase: ${status.keyFormat.passphraseFormat}
      `);
    }
    
    res.json(status);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Endpoint to check API key configuration details (for debugging)
router.get('/config', async (req: Request, res: Response) => {
  try {
    const apiKey = process.env.OKX_API_KEY || '';
    const maskedApiKey = apiKey ? `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}` : 'Not configured';
    
    const secretKey = process.env.OKX_SECRET_KEY || '';
    const maskedSecretKey = secretKey ? `${secretKey.substring(0, 5)}...${secretKey.substring(secretKey.length - 4)}` : 'Not configured';
    
    const passphrase = process.env.OKX_PASSPHRASE || '';
    const maskedPassphrase = passphrase ? `${passphrase.substring(0, 5)}...${passphrase.substring(passphrase.length - 4)}` : 'Not configured';
    
    // Check if keys are in correct format
    const isApiKeyValid = apiKey.length >= 10; // Typical API keys are longer
    const isSecretKeyValid = secretKey.length >= 10;
    const isPassphraseValid = passphrase.length >= 4;
    
    // Check if passphrase looks like a hex string (all uppercase hex characters)
    const isPassphraseHex = /^[A-F0-9]+$/.test(passphrase);
    
    res.json({
      apiKeyConfigured: !!apiKey,
      secretKeyConfigured: !!secretKey,
      passphraseConfigured: !!passphrase,
      maskedApiKey,
      maskedSecretKey,
      maskedPassphrase,
      apiKeyLength: apiKey.length,
      secretKeyLength: secretKey.length,
      passphraseLength: passphrase.length,
      isApiKeyValid,
      isSecretKeyValid,
      isPassphraseValid,
      isPassphraseHex,
      baseUrl: okxService.getBaseUrl(),
      isDemoMode: true
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

// Market data endpoints
router.get('/markets', async (req: Request, res: Response) => {
  try {
    const symbols = req.query.symbols 
      ? String(req.query.symbols).split(',') 
      : DEFAULT_PAIRS;
    
    const marketData = await marketService.getMarketData(symbols);
    res.json(marketData);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/markets/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const marketDetail = await marketService.getMarketDetail(symbol);
    res.json(marketDetail);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/candles/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    // Default to '1H' (uppercase) and ensure any passed interval is also uppercase
    const interval = req.query.interval 
      ? (req.query.interval as string).toUpperCase() 
      : '1H';
    const limit = parseInt(req.query.limit as string || '100');
    
    const candleData = await marketService.getCandlestickData(symbol, interval, limit);
    res.json(candleData);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Account endpoints
router.get('/account/balance', async (req: Request, res: Response) => {
  try {
    const balances = await accountService.getAccountBalances();
    res.json(balances);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/account/history', async (req: Request, res: Response) => {
  try {
    const history = await accountService.getTradingHistory();
    res.json(history);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/account/orders', async (req: Request, res: Response) => {
  try {
    const orders = await accountService.getOpenOrders();
    res.json(orders);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Order endpoints
router.post('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, amount, price } = req.body;
    
    // Validate required parameters
    if (!symbol || !side || !type || !amount) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: symbol, side, type, amount'
      });
    }
    
    const result = await accountService.placeOrder(symbol, side, type, amount, price);
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.delete('/order', async (req: Request, res: Response) => {
  try {
    const { symbol, orderId } = req.body;
    
    // Validate required parameters
    if (!symbol || !orderId) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: symbol, orderId'
      });
    }
    
    const result = await accountService.cancelOrder(symbol, orderId);
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Trading bot endpoints
router.post('/bots', async (req: Request, res: Response) => {
  try {
    const { userId, name, strategy, description, parameters } = req.body;
    
    // Validate required parameters
    if (!userId || !name || !strategy || !parameters) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: userId, name, strategy, parameters'
      });
    }
    
    const bot = await tradingBotService.createBot(
      userId,
      name,
      strategy,
      description || '',
      parameters
    );
    
    res.json(bot);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.post('/bots/:id/start', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const result = await tradingBotService.startBot(botId);
    
    if (result) {
      res.json({ success: true, message: 'Bot started successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Bot is already running' });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

router.post('/bots/:id/stop', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const result = await tradingBotService.stopBot(botId);
    
    if (result) {
      res.json({ success: true, message: 'Bot stopped successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Bot is not running' });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/bots/:id/status', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const status = await tradingBotService.getBotStatus(botId);
    res.json(status);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/bots/:id/performance', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const performance = await tradingBotService.getBotPerformance(botId);
    res.json(performance);
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;