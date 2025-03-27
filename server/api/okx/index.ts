import { Router, Request, Response } from 'express';
import { okxService } from './okxService';
import { marketService } from './marketService';
import { accountService } from './accountService';
import { tradingBotService, getMinInvestmentForStrategy, getEstimatedReturnForStrategy, getRiskLevelForStrategy } from './tradingBotService';
import { DEFAULT_PAIRS } from './config';
import { storage } from '../../storage';

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
    
    console.log('Creating new bot via OKX API:', { name, strategy, userId });
    
    // Get all existing bots to find the next ID to use
    const existingBots = await storage.getAllBots();
    let nextId = 4; // Start with 4 since we already have 3 demo bots
    
    // If we have bots, find the max ID and increment
    if (existingBots.length > 0) {
      const maxId = Math.max(...existingBots.map(bot => bot.id));
      nextId = maxId + 1;
    }
    
    console.log(`Creating bot with ID ${nextId}`);
    
    // Create a new bot with simple ID
    let tradingPair = 'BTC-USDT';
    let totalInvestment = '1000';
    
    if ('symbol' in parameters) {
      tradingPair = parameters.symbol;
    }
    
    if ('totalInvestment' in parameters) {
      totalInvestment = parameters.totalInvestment.toString();
    } else if ('initialInvestment' in parameters) {
      totalInvestment = parameters.initialInvestment.toString();
    } else if ('investmentAmount' in parameters) {
      totalInvestment = parameters.investmentAmount.toString();
    }
    
    // Create the bot directly using the storage Map
    const botMap = (storage as any).bots;
    
    if (botMap) {
      const newBot = {
        id: nextId,
        name,
        strategy,
        description: description || '',
        minInvestment: getMinInvestmentForStrategy(strategy).toString(),
        monthlyReturn: getEstimatedReturnForStrategy(strategy).toString(),
        riskLevel: getRiskLevelForStrategy(strategy),
        rating: '4.5',
        isPopular: false,
        userId,
        isRunning: false,
        tradingPair,
        totalInvestment,
        parameters: JSON.stringify(parameters),
        createdAt: new Date(),
        lastStartedAt: null,
        lastStoppedAt: null,
        profitLoss: "0",
        profitLossPercent: "0",
        totalTrades: 0
      };
      
      // Add bot to storage
      botMap.set(nextId, newBot);
      console.log(`Bot with ID ${nextId} created and added to storage directly`);
      
      // Get all bots after creation to verify
      const allBotsAfter = await storage.getAllBots();
      console.log(`Total bots after creation: ${allBotsAfter.length}`);
      
      res.json(newBot);
    } else {
      // Fall back to regular creation
      const bot = await tradingBotService.createBot(
        userId,
        name,
        strategy,
        description || '',
        parameters
      );
      
      res.json(bot);
    }
  } catch (err) {
    console.error('Error creating bot via OKX API:', err);
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

// Update bot parameters (for changing trading pair, price levels, etc.)
router.post('/bots/:id/parameters', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    
    if (isNaN(botId)) {
      return res.status(400).json({
        error: 'Invalid Bot ID',
        message: 'Bot ID must be a number'
      });
    }
    
    const { parameters } = req.body;
    
    if (!parameters) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Parameters object is required'
      });
    }
    
    console.log(`Updating bot ${botId} parameters:`, parameters);
    
    // Call the service to update bot parameters
    const updatedBot = await tradingBotService.updateBotParameters(botId, parameters);
    
    res.json({
      success: true,
      message: 'Bot parameters updated successfully',
      bot: updatedBot
    });
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

/**
 * Update bot parameters
 * Allows updating the grid levels and other bot parameters directly
 */
router.put('/bots/:id/parameters', async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const { parameters } = req.body;
    
    if (!parameters) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: parameters object'
      });
    }
    
    // Use the tradingBotService's updateBotParameters method
    const updatedBot = await tradingBotService.updateBotParameters(botId, parameters);
    
    res.json({
      success: true,
      message: 'Bot parameters updated successfully',
      bot: updatedBot
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;