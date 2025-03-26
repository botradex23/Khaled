import { Router, Request, Response } from 'express';
import axios from 'axios';
import { accountService } from './accountService';
import { marketService } from './marketService';
import { bybitService } from './bybitService';
import { tradingBotService } from './tradingBotService';
import { convertToBybitPair, convertFromBybitPair } from './config';
import { testProxyConnection, VPN_CONFIG, createProxyInstance } from './proxy-config';

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
    // First check for geo-restrictions by attempting a simple ping
    try {
      await bybitService.ping();
    } catch (pingError: any) {
      // Check if the error is related to geo-restriction (CloudFront 403)
      if (pingError.response && pingError.response.status === 403 && 
          (pingError.response.data && typeof pingError.response.data === 'string' && 
           pingError.response.data.includes('CloudFront'))) {
        
        // Return a specific response for geo-restrictions
        return res.json({
          success: false,
          geoRestricted: true,
          message: 'Bybit API access is restricted in your region. The application will use simulated data.',
          status: {
            connected: false,
            authenticated: false,
            hasReadPermissions: false,
            hasWritePermissions: false,
            message: 'Bybit API access is geo-restricted in your region',
            details: {
              error: 'Geographic restriction detected (AWS CloudFront 403)',
              solution: 'The application will automatically use demo data for all operations'
            }
          },
          apiKeyHasWritePermissions: false,
          apiKeyHasReadPermissions: false
        });
      }
    }
    
    // If no geo-restriction, continue with the regular status check
    const status = await accountService.checkConnection();
    res.json({
      success: true,
      geoRestricted: false,
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
    // First check for geo-restrictions by attempting a simple ping
    try {
      await bybitService.ping();
    } catch (pingError: any) {
      // Check if the error is related to geo-restriction (CloudFront 403)
      if (pingError.response && pingError.response.status === 403 && 
          (pingError.response.data && typeof pingError.response.data === 'string' && 
           pingError.response.data.includes('CloudFront'))) {
        
        // Return a specific response for geo-restrictions
        return res.json({
          success: false,
          geoRestricted: true,
          hasReadPermissions: false,
          hasWritePermissions: false,
          message: 'Bybit API access is restricted in your region. The application will use simulated data.'
        });
      }
    }
    
    // If no geo-restriction, continue with the regular permissions check
    const status = await accountService.checkConnection();
    res.json({
      success: true,
      geoRestricted: false,
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
    // First check for geo-restrictions by attempting a simple ping
    let geoRestricted = false;
    try {
      await bybitService.ping();
    } catch (pingError: any) {
      // Check if the error is related to geo-restriction (CloudFront 403)
      if (pingError.response && pingError.response.status === 403 && 
          (pingError.response.data && typeof pingError.response.data === 'string' && 
           pingError.response.data.includes('CloudFront'))) {
        geoRestricted = true;
      }
    }
    
    res.json({
      success: true,
      geoRestricted,
      config: {
        baseUrl: bybitService.getBaseUrl(),
        isConfigured: bybitService.isConfigured(),
        isTestnet: bybitService.getBaseUrl().includes('testnet'),
        proxyEnabled: VPN_CONFIG.enabled,
        proxyType: VPN_CONFIG.type,
        proxyHost: VPN_CONFIG.host
      }
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Test proxy connection to a general API
 * GET /api/bybit/general-proxy-test
 */
router.get('/general-proxy-test', async (req: Request, res: Response) => {
  try {
    const proxyInstance = createProxyInstance();
    try {
      // Try to connect to a general API that should work worldwide
      const response = await proxyInstance.get('https://httpbin.org/ip', {
        timeout: 10000
      });
      
      res.json({
        success: true,
        generalProxyTest: {
          success: true,
          message: 'Successfully connected to httpbin.org via proxy',
          data: response.data
        },
        vpnConfig: {
          enabled: VPN_CONFIG.enabled,
          type: VPN_CONFIG.type,
          host: VPN_CONFIG.host,
          port: VPN_CONFIG.port
        }
      });
    } catch (error: any) {
      console.error('General proxy connection test failed:', error.message);
      res.json({
        success: true,
        generalProxyTest: {
          success: false,
          message: `General proxy connection error: ${error.message}`
        },
        vpnConfig: {
          enabled: VPN_CONFIG.enabled,
          type: VPN_CONFIG.type,
          host: VPN_CONFIG.host,
          port: VPN_CONFIG.port
        }
      });
    }
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * Test proxy connection to Bybit API
 * GET /api/bybit/proxy-test
 */
router.get('/proxy-test', async (req: Request, res: Response) => {
  try {
    // Test the proxy connection
    const proxyTest = await testProxyConnection();
    
    // Check if we should try a direct connection for comparison
    if (VPN_CONFIG.enabled && req.query.compareWithDirect === 'true') {
      try {
        // Try a direct connection to see if we're geo-restricted without proxy
        const directResponse = await axios.get('https://api.bybit.com/v5/market/time', {
          timeout: 10000
        });
        
        // If we get here, direct connection worked
        res.json({
          success: true,
          proxyTest,
          directTest: {
            success: true,
            message: 'Direct connection succeeded, you may not need a proxy',
            data: directResponse.data
          },
          vpnConfig: {
            enabled: VPN_CONFIG.enabled,
            type: VPN_CONFIG.type,
            host: VPN_CONFIG.host,
            port: VPN_CONFIG.port
          }
        });
      } catch (directError: any) {
        // Direct connection failed
        const isGeoRestricted = directError.response && 
                               directError.response.status === 403 && 
                               directError.response.data && 
                               typeof directError.response.data === 'string' && 
                               directError.response.data.includes('CloudFront');
        
        res.json({
          success: true,
          proxyTest,
          directTest: {
            success: false,
            geoRestricted: isGeoRestricted,
            message: isGeoRestricted 
              ? 'Direct connection failed due to geo-restrictions' 
              : `Direct connection failed: ${directError.message}`,
          },
          vpnConfig: {
            enabled: VPN_CONFIG.enabled,
            type: VPN_CONFIG.type,
            host: VPN_CONFIG.host,
            port: VPN_CONFIG.port
          }
        });
      }
    } else {
      // Just return the proxy test results
      res.json({
        success: true,
        proxyTest,
        vpnConfig: {
          enabled: VPN_CONFIG.enabled,
          type: VPN_CONFIG.type,
          host: VPN_CONFIG.host,
          port: VPN_CONFIG.port
        }
      });
    }
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