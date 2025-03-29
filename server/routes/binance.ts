import { Router, Request, Response } from 'express';
import { createBinanceService } from '../api/binance';
import { storage } from '../storage';
import { ensureAuthenticated } from '../auth';
import { VPN_CONFIG, testProxyConnection } from '../api/binance/proxy-config';

// Extend Express Request type to include binanceApiKeys
declare global {
  namespace Express {
    interface Request {
      binanceApiKeys?: {
        apiKey: string;
        secretKey: string;
        testnet: boolean;
      };
    }
  }
}

const router = Router();

// Utility function to mask sensitive strings
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
}

// Middleware to get user's Binance API keys
async function getBinanceApiKeys(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const apiKeys = await storage.getUserBinanceApiKeys(req.user.id);
    
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      // Just for debugging
      console.log(`User ${req.user.id} does not have Binance API keys configured. API Keys status:`, apiKeys);
      
      return res.status(400).json({ 
        error: 'Binance API keys not configured',
        message: 'Please configure your Binance API keys first'
      });
    }
    
    // Log for debugging
    console.log(`Retrieved Binance API keys for user ${req.user.id}`);
    
    // Attach the keys to the request object for use in routes
    req.binanceApiKeys = {
      apiKey: apiKeys.binanceApiKey,
      secretKey: apiKeys.binanceSecretKey,
      testnet: false // Using live environment as per user requirement
    };
    
    next();
  } catch (error) {
    console.error('Error retrieving Binance API keys:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: 'Failed to retrieve API keys'
    });
  }
}

// Get account balances
router.get('/account/balances', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    // Access binanceApiKeys safely using type assertion
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    // Test connection first
    const connectionTest = await binanceService.testConnectivity();
    
    if (!connectionTest.success) {
      return res.status(400).json({
        error: 'Binance API connection failed',
        message: connectionTest.message || 'Could not connect to Binance API with the provided credentials'
      });
    }
    
    const balances = await binanceService.getAccountBalancesWithUSD();
    
    // Sort balances by USD value (descending)
    balances.sort((a, b) => (b.valueUSD || 0) - (a.valueUSD || 0));
    
    res.json(balances);
  } catch (error: any) {
    console.error('Error fetching Binance account balances:', error);
    res.status(500).json({
      error: 'Failed to fetch balances',
      message: error.message
    });
  }
});

// Get recent trades
router.get('/trades/:symbol', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    // Access binanceApiKeys safely using type assertion
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const symbol = req.params.symbol.toUpperCase();
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const trades = await binanceService.getRecentTrades(symbol, limit);
    res.json(trades);
  } catch (error: any) {
    console.error('Error fetching Binance trades:', error);
    res.status(500).json({
      error: 'Failed to fetch trades',
      message: error.message
    });
  }
});

// Get market tickers (public endpoint, no auth required)
router.get('/market/tickers', async (req: Request, res: Response) => {
  try {
    // Check if we should use fallback data due to geographical restrictions
    if (req.query.useFallback === 'true') {
      console.log('Using fallback data for Binance tickers due to geographical restrictions');
      
      // Return mock ticker data that resembles Binance format
      // This is only used when the direct connection fails due to geographical restrictions
      const fallbackTickers = [
        { symbol: 'BTCUSDT', price: '82800.00' },
        { symbol: 'ETHUSDT', price: '1858.50' },
        { symbol: 'BNBUSDT', price: '607.20' },
        { symbol: 'SOLUSDT', price: '126.40' },
        { symbol: 'ADAUSDT', price: '0.6770' },
        { symbol: 'XRPUSDT', price: '2.1370' },
        { symbol: 'DOGEUSDT', price: '0.1725' }
      ];
      
      return res.json(fallbackTickers);
    }
    
    // Use dummy credentials for public endpoint (only read-only access)
    console.log('Creating Binance service for /market/tickers endpoint');
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    const tickers = await binanceService.getAllTickers();
    res.json(tickers);
  } catch (error: any) {
    console.error('Error fetching Binance tickers:', error);
    
    // If error is related to geographical restrictions, recommend using fallback
    if (error.message && error.message.includes('restricted location')) {
      console.log('Geographical restriction detected, suggesting fallback mode');
      return res.status(500).json({
        error: 'Failed to fetch tickers',
        message: error.message,
        useFallback: true
      });
    }
    
    res.status(500).json({
      error: 'Failed to fetch tickers',
      message: error.message
    });
  }
});

// Get 24hr ticker data for all symbols (public endpoint)
router.get('/market/24hr', async (req: Request, res: Response) => {
  try {
    // Check if we should use fallback data due to geographical restrictions
    if (req.query.useFallback === 'true') {
      console.log('Using fallback data for Binance 24hr tickers due to geographical restrictions');
      
      // Return mock 24hr ticker data that resembles Binance format
      const fallback24hrTickers = [
        { 
          symbol: 'BTCUSDT', 
          priceChange: '1200.00',
          priceChangePercent: '1.45',
          weightedAvgPrice: '82100.00',
          prevClosePrice: '81600.00',
          lastPrice: '82800.00',
          lastQty: '0.12',
          bidPrice: '82790.00',
          bidQty: '1.5',
          askPrice: '82810.00', 
          askQty: '0.8',
          openPrice: '81600.00',
          highPrice: '83200.00',
          lowPrice: '80900.00',
          volume: '12450.8',
          quoteVolume: '1021500000.00',
          openTime: Date.now() - 24*60*60*1000,
          closeTime: Date.now(),
          firstId: 123456,
          lastId: 654321,
          count: 530865
        },
        // Add similar structure for other major coins
        { 
          symbol: 'ETHUSDT', 
          priceChange: '28.50',
          priceChangePercent: '1.56',
          weightedAvgPrice: '1845.00',
          prevClosePrice: '1830.00',
          lastPrice: '1858.50',
          lastQty: '2.5',
          bidPrice: '1858.00',
          bidQty: '10.5',
          askPrice: '1859.00', 
          askQty: '8.2',
          openPrice: '1830.00',
          highPrice: '1865.00',
          lowPrice: '1820.00',
          volume: '245600.5',
          quoteVolume: '453100000.00',
          openTime: Date.now() - 24*60*60*1000,
          closeTime: Date.now(),
          firstId: 223456,
          lastId: 754321,
          count: 430865
        }
      ];
      
      return res.json(fallback24hrTickers);
    }
    
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    // Get 24hr ticker data for all symbols
    const data = await binanceService.getAllTickers24hr();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching Binance 24hr data:', error);
    
    // If error is related to geographical restrictions, recommend using fallback
    if (error.message && error.message.includes('restricted location')) {
      return res.status(500).json({
        error: 'Failed to fetch 24hr ticker data',
        message: error.message,
        useFallback: true
      });
    }
    
    res.status(500).json({
      error: 'Failed to fetch 24hr ticker data',
      message: error.message
    });
  }
});

// Get 24hr ticker for specific symbol (public endpoint)
router.get('/market/ticker/:symbol', async (req: Request, res: Response) => {
  try {
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    const symbol = req.params.symbol.toUpperCase();
    const ticker = await binanceService.get24hrTicker(symbol);
    res.json(ticker);
  } catch (error: any) {
    console.error('Error fetching Binance ticker:', error);
    res.status(500).json({
      error: 'Failed to fetch ticker',
      message: error.message
    });
  }
});

// Get current price for a specific symbol (public endpoint)
router.get('/market/price', async (req: Request, res: Response) => {
  try {
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    const { symbol } = req.query;
    
    if (!symbol || typeof symbol !== 'string') {
      return res.status(400).json({ error: 'Symbol parameter is required' });
    }
    
    const price = await binanceService.getSymbolPrice(symbol.toUpperCase());
    return res.json(price);
  } catch (error: any) {
    console.error('Error fetching Binance symbol price:', error);
    return res.status(500).json({
      error: 'Failed to fetch price',
      message: error.message
    });
  }
});

// Add test endpoint for proxy debugging
router.get('/test-proxy', async (req: Request, res: Response) => {
  try {
    // Debug proxy configuration
    console.log('Testing proxy configuration for Binance connection');
    console.log(`Proxy enabled: ${VPN_CONFIG.enabled}`);
    console.log(`Proxy type: ${VPN_CONFIG.type}`);
    console.log(`Proxy host: ${VPN_CONFIG.host}:${VPN_CONFIG.port}`);
    
    // Test the proxy connection directly
    const proxyTest = await testProxyConnection();
    console.log('Proxy connection test result:', proxyTest);
    
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    // Try to ping the Binance server
    console.log('Attempting to ping Binance API endpoint...');
    const pingResult = await binanceService.ping();
    
    if (pingResult) {
      return res.status(200).json({
        success: true,
        message: 'Binance connection successful via proxy',
        proxyEnabled: VPN_CONFIG.enabled,
        proxyConfig: {
          type: VPN_CONFIG.type,
          host: VPN_CONFIG.host,
          port: VPN_CONFIG.port
        }
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Binance connection failed via proxy',
        proxyEnabled: VPN_CONFIG.enabled,
        proxyConfig: {
          type: VPN_CONFIG.type,
          host: VPN_CONFIG.host,
          port: VPN_CONFIG.port
        }
      });
    }
  } catch (error: any) {
    console.error('Error testing Binance proxy connection:', error);
    
    return res.status(500).json({
      success: false,
      message: `Binance proxy connection failed: ${error.message}`,
      proxyEnabled: VPN_CONFIG.enabled,
      proxyConfig: {
        type: VPN_CONFIG.type,
        host: VPN_CONFIG.host,
        port: VPN_CONFIG.port
      },
      error: error.message,
      stack: error.stack
    });
  }
});

// Test Binance API connection with user's credentials
router.get('/test-connection', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    // Access binanceApiKeys safely using type assertion
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const result = await binanceService.testConnectivity();
    res.json(result);
  } catch (error: any) {
    console.error('Error testing Binance connection:', error);
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

// API Keys Management

// Get Binance API keys status
router.get('/api-keys/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    
    // Get the user's Binance API keys
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Could not retrieve API keys for this user' 
      });
    }
    
    // Check if keys are configured
    const hasApiKeys = !!(
      apiKeys.binanceApiKey && apiKeys.binanceApiKey.trim() !== '' &&
      apiKeys.binanceSecretKey && apiKeys.binanceSecretKey.trim() !== ''
    );
    
    res.status(200).json({
      configured: hasApiKeys,
      hasBinanceApiKey: !!apiKeys.binanceApiKey,
      hasBinanceSecretKey: !!apiKeys.binanceSecretKey,
    });
  } catch (error: any) {
    console.error('Error checking Binance API keys status:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to check API keys status'
    });
  }
});

// Get Binance API Keys (masked)
router.get('/api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not retrieve API keys for this user'
      });
    }
    
    // Only send back masked versions for security
    const maskedKeys = {
      binanceApiKey: apiKeys.binanceApiKey ? maskSecret(apiKeys.binanceApiKey) : null,
      binanceSecretKey: apiKeys.binanceSecretKey ? maskSecret(apiKeys.binanceSecretKey) : null,
      binanceAllowedIp: apiKeys.binanceAllowedIp || null
    };
    
    return res.status(200).json({
      success: true,
      apiKeys: maskedKeys,
      hasBinanceApiKey: !!apiKeys.binanceApiKey,
      hasBinanceSecretKey: !!apiKeys.binanceSecretKey,
      binanceAllowedIp: apiKeys.binanceAllowedIp || null
    });
  } catch (error: any) {
    console.error("Error retrieving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving Binance API keys'
    });
  }
});

// Get unmasked Binance API Keys (for actual use)
router.get('/api-keys/full', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userId = req.user.id;
    const apiKeys = await storage.getUserBinanceApiKeys(userId);
    
    if (!apiKeys) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not retrieve API keys for this user'
      });
    }
    
    // Return the actual keys (only for authenticated users)
    return res.status(200).json({
      success: true,
      apiKey: apiKeys.binanceApiKey || '',
      secretKey: apiKeys.binanceSecretKey || '',
      allowedIp: apiKeys.binanceAllowedIp || '185.199.228.220',
      message: 'API keys retrieved successfully'
    });
  } catch (error: any) {
    console.error("Error retrieving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while retrieving Binance API keys'
    });
  }
});

// Save/Update Binance API keys
router.post('/api-keys', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { apiKey, secretKey, testnet } = req.body;
    
    // Simple validation
    if (!apiKey || !secretKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'API Key and Secret Key are required'
      });
    }
    
    // Update the user's Binance API keys using our storage implementation
    const userId = req.user!.id;
    const { allowedIp } = req.body;
    
    console.log('Saving Binance API keys for user with allowed IP:', allowedIp);
    
    const updatedUser = await storage.updateUserBinanceApiKeys(userId, {
      binanceApiKey: apiKey,
      binanceSecretKey: secretKey,
      binanceAllowedIp: allowedIp || "185.199.228.220" // Default to our proxy IP if not specified
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        error: 'User not found',
        message: 'Could not update API keys for this user'
      });
    }
    
    console.log(`Binance API keys saved successfully for user ${userId} (Using testnet: ${testnet})`);
    
    return res.status(200).json({
      success: true,
      message: 'Binance API keys saved successfully'
    });
  } catch (error: any) {
    console.error("Error saving Binance API keys:", error);
    return res.status(500).json({
      error: 'Server error',
      message: 'An error occurred while saving Binance API keys'
    });
  }
});

// Create order endpoints (for trading)
router.post('/order', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol, side, type, quantity, price, timeInForce, stopPrice } = req.body;
    
    // Basic validation
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Symbol, side, type, and quantity are required'
      });
    }
    
    // Validate side
    if (side !== 'BUY' && side !== 'SELL') {
      return res.status(400).json({
        error: 'Invalid side',
        message: 'Side must be BUY or SELL'
      });
    }
    
    // Validate order type and required parameters
    const validTypes = ['LIMIT', 'MARKET', 'STOP_LOSS', 'STOP_LOSS_LIMIT', 'TAKE_PROFIT', 'TAKE_PROFIT_LIMIT'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: 'Invalid order type',
        message: `Order type must be one of: ${validTypes.join(', ')}`
      });
    }
    
    // Price is required for LIMIT orders
    if ((type === 'LIMIT' || type.includes('LIMIT')) && !price) {
      return res.status(400).json({
        error: 'Missing price',
        message: 'Price is required for LIMIT orders'
      });
    }
    
    // Stop price is required for stop orders
    if ((type.includes('STOP') || type.includes('TAKE_PROFIT')) && !stopPrice) {
      return res.status(400).json({
        error: 'Missing stop price',
        message: 'Stop price is required for stop orders'
      });
    }
    
    // Create the order using the Binance service
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    // Test connection first to ensure API key is valid and has trading permissions
    const connectionTest = await binanceService.testConnectivity();
    if (!connectionTest.success) {
      return res.status(400).json({
        error: 'Binance API connection failed',
        message: connectionTest.message || 'Could not connect to Binance API with the provided credentials'
      });
    }
    
    // Create the order
    const order = await binanceService.createOrder(
      symbol,
      side as any,
      type as any,
      parseFloat(quantity),
      price ? parseFloat(price) : undefined,
      timeInForce as any,
      stopPrice ? parseFloat(stopPrice) : undefined
    );
    
    res.status(200).json({
      success: true,
      message: `Order created successfully (${side} ${type} order for ${symbol})`,
      order
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
});

// Cancel order
router.delete('/order/:orderId', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { symbol } = req.query;
    
    if (!orderId || !symbol || typeof symbol !== 'string') {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Order ID and symbol are required'
      });
    }
    
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const result = await binanceService.cancelOrder(symbol, parseInt(orderId));
    
    res.status(200).json({
      success: true,
      message: `Order ${orderId} for ${symbol} cancelled successfully`,
      result
    });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({
      error: 'Failed to cancel order',
      message: error.message
    });
  }
});

// Get open orders
router.get('/open-orders', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const orders = await binanceService.getOpenOrders(typeof symbol === 'string' ? symbol : undefined);
    
    res.status(200).json(orders);
  } catch (error: any) {
    console.error('Error fetching open orders:', error);
    res.status(500).json({
      error: 'Failed to fetch open orders',
      message: error.message
    });
  }
});

// Get order history
router.get('/order-history/:symbol', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const orders = await binanceService.getOrderHistory(symbol, limit);
    
    res.status(200).json(orders);
  } catch (error: any) {
    console.error('Error fetching order history:', error);
    res.status(500).json({
      error: 'Failed to fetch order history',
      message: error.message
    });
  }
});

// Get trade history
router.get('/trade-history/:symbol', ensureAuthenticated, getBinanceApiKeys, async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    
    const binanceApiKeys = req.binanceApiKeys as { apiKey: string; secretKey: string; testnet: boolean };
    const binanceService = createBinanceService(binanceApiKeys.apiKey, binanceApiKeys.secretKey, binanceApiKeys.testnet);
    
    const trades = await binanceService.getTradeHistory(symbol, limit);
    
    res.status(200).json(trades);
  } catch (error: any) {
    console.error('Error fetching trade history:', error);
    res.status(500).json({
      error: 'Failed to fetch trade history',
      message: error.message
    });
  }
});

export default router;