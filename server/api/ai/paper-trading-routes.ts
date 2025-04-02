/**
 * AI Paper Trading Routes
 * 
 * This file contains routes for integrating AI predictions with the paper trading system.
 * It provides endpoints for:
 * 1. Executing trades based on ML predictions
 * 2. Closing positions
 * 3. Getting account information, positions, and trade history
 * 4. Performance tracking and reporting
 */

import { Router, Request, Response } from 'express';
import { storage } from '../../storage';
import paperTradingApi from '../paper-trading/PaperTradingApi';
// Import the aiPaperTradingBridge from index.ts
import { aiPaperTradingBridge } from './paper-trading-bridge';
import { aiTradingSystem } from './AITradingSystem';
import { InsertPaperTradingTrade } from '@shared/schema';
import { TradingDecision } from './AIPaperTradingBridge';

const router = Router();

/**
 * Helper function to handle API errors consistently
 */
function handleApiError(err: any, res: Response): void {
  console.error('API Error:', err);
  res.status(500).json({
    success: false,
    message: err instanceof Error ? err.message : 'An unknown error occurred'
  });
}

/**
 * POST /api/ai/paper-trading/execute
 * Execute a trade based on ML prediction
 */
router.post('/execute', async (req: Request, res: Response) => {
  try {
    // Extract trading decision from request body
    const { symbol, action, confidence, price, timestamp } = req.body;
    
    if (!symbol || !action || !price) {
      return res.status(400).json({
        success: false,
        message: 'Symbol, action, and price are required'
      });
    }
    
    // Validate the action
    if (action !== 'BUY' && action !== 'SELL' && action !== 'HOLD') {
      return res.status(400).json({
        success: false,
        message: 'Action must be BUY, SELL, or HOLD'
      });
    }
    
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Create trading decision object
    const decision: TradingDecision = {
      symbol,
      action,
      confidence: confidence || 0.5,
      price: parseFloat(price),
      timestamp: timestamp || new Date().toISOString(),
      strategy: 'ML_PREDICTION',
      parameters: {
        confidence: confidence || 0.5
      },
      reason: 'API request initiated trade',
      tradingSignals: {},
      marketState: {},
      predictions: {}
    };
    
    // Execute the trading decision
    const result = await aiPaperTradingBridge.executeTrading(decision);
    
    return res.json({
      success: true,
      result
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/paper-trading/close-position
 * Close a paper trading position
 */
router.post('/close-position', async (req: Request, res: Response) => {
  try {
    const { positionId, exitPrice, metadata } = req.body;
    
    if (!positionId || !exitPrice) {
      return res.status(400).json({
        success: false,
        message: 'Position ID and exit price are required'
      });
    }
    
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Get the position to verify ownership
    const position = await storage.getPaperTradingPosition(positionId);
    
    if (!position) {
      return res.status(404).json({
        success: false,
        message: 'Position not found'
      });
    }
    
    // Get the account to verify ownership
    const account = await storage.getPaperTradingAccount(position.accountId);
    
    if (!account || account.userId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to close this position'
      });
    }
    
    // Close the position
    const closedPosition = await storage.closePaperTradingPosition(positionId, exitPrice, metadata ? JSON.stringify(metadata) : undefined);
    
    if (!closedPosition) {
      return res.status(500).json({
        success: false,
        message: 'Failed to close position'
      });
    }
    
    return res.json({
      success: true,
      position: closedPosition
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/account
 * Get paper trading account information
 */
router.get('/account', async (req: Request, res: Response) => {
  try {
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Get the account
    const account = await storage.getUserPaperTradingAccount(userId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Paper trading account not found'
      });
    }
    
    return res.json({
      success: true,
      account
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/positions
 * Get open paper trading positions
 */
router.get('/positions', async (req: Request, res: Response) => {
  try {
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Get the account
    const account = await storage.getUserPaperTradingAccount(userId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Paper trading account not found'
      });
    }
    
    // Get open positions
    const positions = await storage.getAccountPaperTradingPositions(account.id);
    
    return res.json({
      success: true,
      positions
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/trades
 * Get paper trading trade history
 */
router.get('/trades', async (req: Request, res: Response) => {
  try {
    // Get limit parameter
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Get the account
    const account = await storage.getUserPaperTradingAccount(userId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Paper trading account not found'
      });
    }
    
    // Get trades
    const trades = await storage.getAccountPaperTradingTrades(account.id, limit);
    
    return res.json({
      success: true,
      trades
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * GET /api/ai/paper-trading/performance
 * Get paper trading performance metrics
 */
router.get('/performance', async (req: Request, res: Response) => {
  try {
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Set the user for paper trading
    if (!(await aiPaperTradingBridge.setUser(userId))) {
      return res.status(500).json({
        success: false,
        message: 'Failed to set user for paper trading'
      });
    }
    
    // Get performance stats
    const stats = await aiPaperTradingBridge.getPerformanceStats();
    
    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Failed to get performance stats'
      });
    }
    
    return res.json({
      success: true,
      stats
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/paper-trading/set-user
 * Set the user for paper trading
 */
router.post('/set-user', async (req: Request, res: Response) => {
  try {
    // Get user ID from request body, authenticated user, or test header
    let userId: number | null = null;
    
    if (req.body.userId) {
      userId = parseInt(req.body.userId);
    } else if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID not provided'
      });
    }
    
    // Set the user for paper trading
    const success = await aiPaperTradingBridge.setUser(userId);
    
    return res.json({
      success,
      message: success ? 'User set successfully' : 'Failed to set user'
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

/**
 * POST /api/ai/paper-trading/manual-trade
 * Create a manual trade in the paper trading system
 */
router.post('/manual-trade', async (req: Request, res: Response) => {
  try {
    const { symbol, action, quantity, price, isAiGenerated, aiConfidence } = req.body;
    
    if (!symbol || !action || !quantity || !price) {
      return res.status(400).json({
        success: false,
        message: 'Symbol, action, quantity, and price are required'
      });
    }
    
    // Validate the action
    if (action !== 'BUY' && action !== 'SELL') {
      return res.status(400).json({
        success: false,
        message: 'Action must be BUY or SELL'
      });
    }
    
    // Get user ID - prefer authenticated user, fall back to test user
    let userId: number | null = null;
    
    if (req.user?.id) {
      userId = req.user.id;
    } else if (req.header('X-Test-User-Id') === 'admin') {
      userId = 1; // Test user ID for development
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated or test user ID not provided'
      });
    }
    
    // Get or create account
    const account = await storage.getUserPaperTradingAccount(userId);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        message: 'Paper trading account not found'
      });
    }
    
    // Create a new position
    const position = await storage.createPaperTradingPosition({
      accountId: account.id,
      symbol,
      entryPrice: price.toString(),
      quantity: quantity.toString(),
      direction: action === 'BUY' ? 'LONG' : 'SHORT'
    });
    
    // Create a new trade
    const tradeData: InsertPaperTradingTrade = {
      accountId: account.id,
      positionId: position.id,
      symbol,
      entryPrice: price.toString(),
      quantity: quantity.toString(),
      direction: action === 'BUY' ? 'LONG' : 'SHORT',
      status: 'OPEN',
      type: 'MARKET',
      isAiGenerated: !!isAiGenerated,
      aiConfidence: aiConfidence ? aiConfidence.toString() : null
    };
    
    const trade = await storage.createPaperTradingTrade(tradeData);
    
    return res.json({
      success: true,
      position,
      trade
    });
  } catch (err) {
    handleApiError(err, res);
  }
});

export default router;