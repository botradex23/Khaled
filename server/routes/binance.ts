import { Router, Request, Response } from 'express';
import { createBinanceService } from '../api/binance';
import { storage } from '../storage';
import { ensureAuthenticated } from '../auth';

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

// Middleware to get user's Binance API keys
async function getBinanceApiKeys(req: Request, res: Response, next: Function) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const apiKeys = await storage.getUserBinanceApiKeys(req.user.id);
    
    if (!apiKeys || !apiKeys.binanceApiKey || !apiKeys.binanceSecretKey) {
      return res.status(400).json({ 
        error: 'Binance API keys not configured',
        message: 'Please configure your Binance API keys first'
      });
    }
    
    // Attach the keys to the request object for use in routes
    req.binanceApiKeys = {
      apiKey: apiKeys.binanceApiKey,
      secretKey: apiKeys.binanceSecretKey,
      testnet: true // Default to testnet for safety
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
    
    const balances = await binanceService.getAccountBalances();
    
    // Sort balances by USD value (descending)
    balances.sort((a, b) => (b.usdValue || 0) - (a.usdValue || 0));
    
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
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    const tickers = await binanceService.getAllTickers();
    res.json(tickers);
  } catch (error: any) {
    console.error('Error fetching Binance tickers:', error);
    res.status(500).json({
      error: 'Failed to fetch tickers',
      message: error.message
    });
  }
});

// Get 24hr ticker data for all symbols (public endpoint)
router.get('/market/24hr', async (req: Request, res: Response) => {
  try {
    // Use dummy credentials for public endpoint (only read-only access)
    const binanceService = createBinanceService('dummy', 'dummy', true);
    
    // Get 24hr ticker data for all symbols
    const data = await binanceService.getAllTickers24hr();
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching Binance 24hr data:', error);
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

export default router;