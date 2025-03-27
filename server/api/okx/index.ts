import { Router, Request, Response } from 'express';
import { okxService, createOkxServiceWithCustomCredentials } from './okxService';
import { marketService } from './marketService';
import { accountService } from './accountService';
import { tradingBotService, getMinInvestmentForStrategy, getEstimatedReturnForStrategy, getRiskLevelForStrategy } from './tradingBotService';
import { DEFAULT_PAIRS } from './config';
import { storage } from '../../storage';
import { ensureAuthenticated } from '../../auth';

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

// Demo account data endpoint that also checks for user auth
router.get('/demo/account/balance', withUserApiKeys, async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated and has custom API keys
    if (req.user && req.user.id && (req as any).customOkxService) {
      console.log(`Using custom OKX API keys for user ID ${req.user.id} in demo endpoint`);
      
      try {
        // Use the custom OKX service with user's API keys
        const customService = (req as any).customOkxService;
        const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/account/balance');
        
        // Verify response format
        if (!response.data || !response.data[0]?.details || !Array.isArray(response.data[0].details)) {
          console.error(`Invalid response format from OKX API for user ${req.user.id}`, response);
          throw new Error('Invalid response format from OKX API - missing details array');
        }
        
        console.log(`Successfully got balance data with ${response.data[0].details.length} currencies for user ${req.user.id}`);
        
        if (response.data[0].details.length === 0) {
          console.log(`User ${req.user.id} has empty balance in OKX API - falling back to accountService`);
          const balances = await accountService.getAccountBalances();
          return res.json(balances);
        }
        
        // Process and format the response
        const balances = response.data[0].details.map((balance: any) => ({
          currency: balance.ccy,
          available: parseFloat(balance.availBal) || 0,
          frozen: parseFloat(balance.frozenBal) || 0,
          total: parseFloat(balance.bal) || 0,
          valueUSD: parseFloat(balance.eq) || 0
        }));
        
        res.json(balances);
      } catch (error) {
        console.error(`Error fetching balance with custom keys for user ${req.user.id}:`, error);
        // If there's an error with the custom service, fallback to account service
        console.log('Falling back to default OKX API keys due to error');
        const balances = await accountService.getAccountBalances();
        res.json(balances);
      }
    } else {
      // No authentication or no custom keys, use default demo data
      console.log('Using default OKX API keys for demo endpoint');
      const balances = await accountService.getAccountBalances();
      res.json(balances);
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

// Demo trading history endpoint that also checks for user auth
router.get('/demo/trading/history', withUserApiKeys, async (req: Request, res: Response) => {
  try {
    let history;
    
    // Check if user is authenticated and has custom API keys
    if (req.user && req.user.id && (req as any).customOkxService) {
      console.log(`Using custom OKX API keys for user ID ${req.user.id} in demo trading history endpoint`);
      
      try {
        // Use the custom OKX service with user's API keys
        const customService = (req as any).customOkxService;
        const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/trade/fills');
        
        if (!response.data) {
          console.error(`Invalid response format from OKX API for user ${req.user.id}`, response);
          throw new Error('Invalid response format from OKX API for trading history');
        }
        
        console.log(`Successfully got trading history with ${response.data.length} trades for user ${req.user.id}`);
        history = response.data;
        
        if (response.data.length === 0) {
          console.log(`User ${req.user.id} has no trade history in OKX API - falling back to demoHistory`);
          // Instead of using accountService, directly provide demo data for consistent result
          const currentDate = new Date();
          return res.json([
            {
              id: `demo-${Date.now()}-0`,
              symbol: 'BTC-USDT',
              side: 'buy',
              price: '87450.2',
              size: '0.01',
              status: 'Executed',
              timestamp: new Date(currentDate.getTime() - 5 * 60000).toISOString(),
              feeCurrency: 'USDT',
              fee: '0.05'
            },
            {
              id: `demo-${Date.now()}-1`,
              symbol: 'ETH-USDT',
              side: 'buy',
              price: '2032.45',
              size: '0.05',
              status: 'Executed',
              timestamp: new Date(currentDate.getTime() - 15 * 60000).toISOString(),
              feeCurrency: 'USDT',
              fee: '0.025'
            },
            {
              id: `demo-${Date.now()}-2`,
              symbol: 'BTC-USDT',
              side: 'sell',
              price: '87950.75',
              size: '0.008',
              status: 'Executed',
              timestamp: new Date(currentDate.getTime() - 30 * 60000).toISOString(),
              feeCurrency: 'USDT',
              fee: '0.04'
            }
          ]);
        }
      } catch (error) {
        console.error(`Error fetching trading history with custom keys for user ${req.user.id}:`, error);
        // If there's an error with the custom service, fallback to demo data
        console.log('Falling back to demo trading history due to error');
        const currentDate = new Date();
        return res.json([
          {
            id: `demo-${Date.now()}-0`,
            symbol: 'BTC-USDT',
            side: 'buy',
            price: '87450.2',
            size: '0.01',
            status: 'Executed',
            timestamp: new Date(currentDate.getTime() - 5 * 60000).toISOString(),
            feeCurrency: 'USDT',
            fee: '0.05'
          },
          {
            id: `demo-${Date.now()}-1`,
            symbol: 'ETH-USDT',
            side: 'buy',
            price: '2032.45',
            size: '0.05',
            status: 'Executed',
            timestamp: new Date(currentDate.getTime() - 15 * 60000).toISOString(),
            feeCurrency: 'USDT',
            fee: '0.025'
          },
          {
            id: `demo-${Date.now()}-2`,
            symbol: 'BTC-USDT',
            side: 'sell',
            price: '87950.75',
            size: '0.008',
            status: 'Executed',
            timestamp: new Date(currentDate.getTime() - 30 * 60000).toISOString(),
            feeCurrency: 'USDT',
            fee: '0.04'
          }
        ]);
      }
    } else {
      // No authentication or no custom keys, use default demo data
      console.log('Using default OKX API keys for demo trading history endpoint');
      history = await accountService.getTradingHistory();
    }
    
    // Format the data for our React client to better handle it
    const formattedHistory = Array.isArray(history) ? history.map((item: any) => {
      // OKX returns a different format than what our frontend expects
      // Map it to a consistent format
      return {
        id: item.tradeId || item.ordId || item.fillId || `okx-${Date.now()}`,
        symbol: item.instId || 'BTC-USDT',
        side: item.side || 'buy',
        price: item.fillPx || item.px || '0',
        size: item.fillSz || item.sz || '0',
        status: 'Executed',
        timestamp: item.fillTime || item.cTime || item.uTime || new Date().toISOString(),
        feeCurrency: item.feeCcy || 'USDT',
        fee: item.fee || '0'
      };
    }) : [];
    
    res.json(formattedHistory);
  } catch (err) {
    // If the API call fails, return demo trading data
    const currentDate = new Date();
    const demoHistory = [
      {
        id: `demo-${Date.now()}-0`,
        symbol: 'BTC-USDT',
        side: 'buy',
        price: '87450.2',
        size: '0.01',
        status: 'Executed',
        timestamp: new Date(currentDate.getTime() - 5 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.05'
      },
      {
        id: `demo-${Date.now()}-1`,
        symbol: 'ETH-USDT',
        side: 'buy',
        price: '2032.45',
        size: '0.05',
        status: 'Executed',
        timestamp: new Date(currentDate.getTime() - 15 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.025'
      },
      {
        id: `demo-${Date.now()}-2`,
        symbol: 'BTC-USDT',
        side: 'sell',
        price: '87950.75',
        size: '0.008',
        status: 'Executed',
        timestamp: new Date(currentDate.getTime() - 30 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.04'
      }
    ];
    res.json(demoHistory);
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

// New middleware to get user's API keys and use them for OKX API calls
async function withUserApiKeys(req: Request, res: Response, next: Function) {
  if (!req.user || !req.user.id) {
    console.log('No authenticated user, using default API keys');
    return next(); // Continue with default keys
  }
  
  try {
    // Get user's API keys
    const userId = req.user.id;
    const apiKeys = await storage.getUserApiKeys(userId);
    
    // More detailed logging to help with debugging
    console.log(`API Keys for user ID ${userId}:`, {
      hasApiKey: !!apiKeys?.okxApiKey,
      hasSecretKey: !!apiKeys?.okxSecretKey,
      hasPassphrase: !!apiKeys?.okxPassphrase,
      useTestnet: apiKeys?.useTestnet,
      defaultBroker: apiKeys?.defaultBroker
    });
    
    // Check if we have all needed keys and they're not empty
    if (apiKeys && 
        apiKeys.okxApiKey && 
        apiKeys.okxSecretKey && 
        apiKeys.okxPassphrase && 
        apiKeys.okxApiKey.trim() !== '' && 
        apiKeys.okxSecretKey.trim() !== '' && 
        apiKeys.okxPassphrase.trim() !== '') {
      
      console.log(`Creating custom OKX service with user ID ${userId}'s API keys`);
      
      // Always use testnet for safety unless explicitly set to false
      const useTestnet = apiKeys.useTestnet !== false;
      
      // Create a custom OKX service instance with user's keys
      // We'll attach it to the request object
      (req as any).customOkxService = createOkxServiceWithCustomCredentials(
        apiKeys.okxApiKey,
        apiKeys.okxSecretKey,
        apiKeys.okxPassphrase,
        useTestnet // Use testnet setting from user's preferences
      );
      
      // Try a simple test request to verify connection
      try {
        await (req as any).customOkxService.ping();
        console.log(`Custom OKX service connected successfully for user ${userId}`);
      } catch (pingError) {
        console.error(`Failed to connect to OKX with custom keys for user ${userId}:`, pingError);
      }
    } else {
      console.log(`No complete OKX API keys found for user ID ${userId}, using default keys`);
    }
  } catch (error) {
    console.error('Error getting user API keys:', error);
  }
  
  next();
}

// Account endpoints
router.get('/account/balance', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      try {
        // Using customOkxService directly instead of accountService
        const customService = (req as any).customOkxService;
        const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/account/balance');
        
        // Verify response format with more detailed error handling
        if (!response.data || !response.data[0]?.details || !Array.isArray(response.data[0].details)) {
          console.error(`Invalid response format from OKX API for user ${req.user?.id}`, response);
          throw new Error('Invalid response format from OKX API - missing details array');
        }
        
        console.log(`Successfully got account balance data with ${response.data[0].details.length} currencies for user ${req.user?.id}`);
        
        // Handle empty balance array case
        if (response.data[0].details.length === 0) {
          console.log(`User ${req.user?.id} has empty balance in OKX API - falling back to accountService`);
          const balances = await accountService.getAccountBalances();
          return res.json(balances);
        }
        
        // Process and format the response similar to accountService.getAccountBalances
        const balances = response.data[0].details.map((balance: any) => ({
          currency: balance.ccy,
          available: parseFloat(balance.availBal) || 0,
          frozen: parseFloat(balance.frozenBal) || 0,
          total: parseFloat(balance.bal) || 0,
          valueUSD: parseFloat(balance.eq) || 0
        }));
        
        res.json(balances);
      } catch (error) {
        console.error(`Error fetching account balance with custom keys for user ${req.user?.id}:`, error);
        // If there's an error with the custom service, fallback to account service
        console.log('Falling back to accountService due to error');
        const balances = await accountService.getAccountBalances();
        res.json(balances);
      }
    } else {
      // Fall back to default service
      console.log('No custom OKX service found, using accountService');
      const balances = await accountService.getAccountBalances();
      res.json(balances);
    }
  } catch (err) {
    console.error('Error in /account/balance handler:', err);
    // Always provide fallback data even on errors
    try {
      const balances = await accountService.getAccountBalances();
      res.json(balances);
    } catch (fallbackError) {
      handleApiError(err, res);
    }
  }
});

// Added this endpoint to support our new UI
router.get('/trading/history', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    let history;
    
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      try {
        // Using customOkxService directly
        const customService = (req as any).customOkxService;
        const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/trade/fills');
        
        if (!response.data) {
          console.error(`Invalid response format from OKX API for user ${req.user?.id} in trading history`, response);
          throw new Error('Invalid response format from OKX API for trading history');
        }
        
        console.log(`Successfully got trading history with ${response.data.length} trades for user ${req.user?.id}`);
        history = response.data;
        
        if (response.data.length === 0) {
          console.log(`User ${req.user?.id} has no trade history in OKX API - falling back to accountService`);
          history = await accountService.getTradingHistory();
          
          // If still empty, provide demo data
          if (!Array.isArray(history) || history.length === 0) {
            console.log(`AccountService also returned empty history - providing demo data`);
            const currentDate = new Date();
            history = [
              {
                tradeId: `demo-${Date.now()}-0`,
                instId: 'BTC-USDT',
                side: 'buy',
                fillPx: '87450.2',
                fillSz: '0.01',
                fillTime: new Date(currentDate.getTime() - 5 * 60000).toISOString(),
                feeCcy: 'USDT',
                fee: '0.05'
              },
              {
                tradeId: `demo-${Date.now()}-1`,
                instId: 'ETH-USDT',
                side: 'buy',
                fillPx: '2032.45',
                fillSz: '0.05',
                fillTime: new Date(currentDate.getTime() - 15 * 60000).toISOString(),
                feeCcy: 'USDT',
                fee: '0.025'
              },
              {
                tradeId: `demo-${Date.now()}-2`,
                instId: 'BTC-USDT',
                side: 'sell',
                fillPx: '87950.75',
                fillSz: '0.008',
                fillTime: new Date(currentDate.getTime() - 30 * 60000).toISOString(),
                feeCcy: 'USDT',
                fee: '0.04'
              }
            ];
          }
        }
      } catch (error) {
        console.error(`Error fetching trading history with custom keys for user ${req.user?.id}:`, error);
        // If there's an error with the custom service, fallback to account service
        console.log('Falling back to accountService due to error');
        history = await accountService.getTradingHistory();
      }
    } else {
      // Fall back to default service
      console.log('No custom OKX service found, using accountService for trading history');
      history = await accountService.getTradingHistory();
    }
    
    // Format the data for our React client to better handle it
    const formattedHistory = Array.isArray(history) ? history.map((item: any) => {
      // OKX returns a different format than what our frontend expects
      // Map it to a consistent format
      return {
        id: item.tradeId || item.ordId || item.fillId || `okx-${Date.now()}`,
        symbol: item.instId || 'BTC-USDT',
        side: item.side || 'buy',
        price: item.fillPx || item.px || '0',
        size: item.fillSz || item.sz || '0',
        status: 'בוצע',
        timestamp: item.fillTime || item.cTime || item.uTime || new Date().toISOString(),
        feeCurrency: item.feeCcy || 'USDT',
        fee: item.fee || '0'
      };
    }) : [];
    
    res.json(formattedHistory);
  } catch (err) {
    console.error('Error in /trading/history handler:', err);
    // If the API call fails, return demo trading data so we can show some sample data in the UI
    const currentDate = new Date();
    const demoHistory = [
      {
        id: `demo-${Date.now()}-0`,
        symbol: 'BTC-USDT',
        side: 'buy',
        price: '87450.2',
        size: '0.01',
        status: 'בוצע',
        timestamp: new Date(currentDate.getTime() - 5 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.05'
      },
      {
        id: `demo-${Date.now()}-1`,
        symbol: 'ETH-USDT',
        side: 'buy',
        price: '2032.45',
        size: '0.05',
        status: 'בוצע',
        timestamp: new Date(currentDate.getTime() - 15 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.025'
      },
      {
        id: `demo-${Date.now()}-2`,
        symbol: 'BTC-USDT',
        side: 'sell',
        price: '87950.75',
        size: '0.008',
        status: 'בוצע',
        timestamp: new Date(currentDate.getTime() - 30 * 60000).toISOString(),
        feeCurrency: 'USDT',
        fee: '0.04'
      }
    ];
    res.json(demoHistory);
  }
});

router.get('/account/history', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    let history;
    
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      // Using customOkxService directly
      const customService = (req as any).customOkxService;
      const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/trade/fills');
      history = response.data || [];
    } else {
      // Fall back to default service
      history = await accountService.getTradingHistory();
    }
    
    res.json(history);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/account/orders', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    let orders;
    
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      // Using customOkxService directly
      const customService = (req as any).customOkxService;
      const response = await customService.makeAuthenticatedRequest('GET', '/api/v5/trade/orders-pending');
      orders = response.data || [];
    } else {
      // Fall back to default service
      orders = await accountService.getOpenOrders();
    }
    
    res.json(orders);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Order endpoints
router.post('/order', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, amount, price } = req.body;
    
    // Validate required parameters
    if (!symbol || !side || !type || !amount) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: symbol, side, type, amount'
      });
    }
    
    let result;
    
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      // Using customOkxService directly
      const customService = (req as any).customOkxService;
      const data: any = {
        instId: symbol,
        tdMode: 'cash',
        side,
        ordType: type,
        sz: amount
      };
      
      // Add price if it's a limit order
      if (type === 'limit' && price) {
        data.px = price;
      }
      
      result = await customService.makeAuthenticatedRequest('POST', '/api/v5/trade/order', data);
    } else {
      // Fall back to default service
      result = await accountService.placeOrder(symbol, side, type, amount, price);
    }
    
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.delete('/order', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol, orderId } = req.body;
    
    // Validate required parameters
    if (!symbol || !orderId) {
      return res.status(400).json({
        error: 'Missing Parameters',
        message: 'Required parameters: symbol, orderId'
      });
    }
    
    let result;
    
    // Check if we have custom service from middleware
    if ((req as any).customOkxService) {
      // Using customOkxService directly
      const customService = (req as any).customOkxService;
      result = await customService.makeAuthenticatedRequest('POST', '/api/v5/trade/cancel-order', {
        instId: symbol,
        ordId: orderId
      });
    } else {
      // Fall back to default service
      result = await accountService.cancelOrder(symbol, orderId);
    }
    
    res.json(result);
  } catch (err) {
    handleApiError(err, res);
  }
});

// Trading bot endpoints
router.post('/bots', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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

router.post('/bots/:id/start', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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

router.post('/bots/:id/stop', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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
router.post('/bots/:id/parameters', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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

router.get('/bots/:id/status', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
  try {
    const botId = parseInt(req.params.id);
    const status = await tradingBotService.getBotStatus(botId);
    res.json(status);
  } catch (err) {
    handleApiError(err, res);
  }
});

router.get('/bots/:id/performance', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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
router.put('/bots/:id/parameters', ensureAuthenticated, withUserApiKeys, async (req: Request, res: Response) => {
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