/**
 * User-specific Trading API Routes
 * 
 * These routes handle user-specific trading operations that require API keys.
 * Authentication is required for all routes in this file.
 */

import express from 'express';
import { userTradingService } from '../../services/user-trading-service';
import { ensureAuthenticated } from '../../middleware/auth';

const router = express.Router();

// Ensure all routes require authentication
router.use(ensureAuthenticated);

/**
 * Initialize user trading session
 * @route POST /api/user-trading/initialize
 * @access Private
 */
router.post('/initialize', async (req, res) => {
  try {
    const userId = req.user!.id;
    const initialized = await userTradingService.initializeUserTrading(userId);
    
    if (!initialized) {
      return res.status(400).json({
        success: false,
        message: 'Failed to initialize user trading. API keys may be missing.'
      });
    }
    
    res.json({
      success: true,
      message: 'User trading initialized successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error initializing user trading',
      error: error.message
    });
  }
});

/**
 * Get user positions
 * @route GET /api/user-trading/positions
 * @access Private
 */
router.get('/positions', async (req, res) => {
  try {
    const userId = req.user!.id;
    const positions = await userTradingService.refreshUserPositions(userId);
    
    res.json({
      success: true,
      count: positions.length,
      data: positions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting user positions',
      error: error.message
    });
  }
});

/**
 * Get user orders
 * @route GET /api/user-trading/orders
 * @access Private
 */
router.get('/orders', (req, res) => {
  try {
    const userId = req.user!.id;
    const orders = userTradingService.getUserOrders(userId);
    
    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting user orders',
      error: error.message
    });
  }
});

/**
 * Place a new order
 * @route POST /api/user-trading/order
 * @access Private
 */
router.post('/order', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { symbol, side, type, quantity, price } = req.body;
    
    // Validate required parameters
    if (!symbol || !side || !type || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }
    
    // Validate side
    if (side !== 'BUY' && side !== 'SELL') {
      return res.status(400).json({
        success: false,
        message: 'Invalid side. Must be BUY or SELL'
      });
    }
    
    // Validate type
    if (type !== 'MARKET' && type !== 'LIMIT') {
      return res.status(400).json({
        success: false,
        message: 'Invalid type. Must be MARKET or LIMIT'
      });
    }
    
    // Validate price for LIMIT orders
    if (type === 'LIMIT' && !price) {
      return res.status(400).json({
        success: false,
        message: 'Price is required for LIMIT orders'
      });
    }
    
    const order = await userTradingService.placeOrder(
      userId,
      symbol,
      side,
      type,
      quantity,
      price
    );
    
    if (!order) {
      return res.status(500).json({
        success: false,
        message: 'Failed to place order'
      });
    }
    
    res.json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error placing order',
      error: error.message
    });
  }
});

/**
 * Cancel an order
 * @route DELETE /api/user-trading/order/:orderId
 * @access Private
 */
router.delete('/order/:orderId', async (req, res) => {
  try {
    const userId = req.user!.id;
    const orderId = req.params.orderId;
    const exchange = req.query.exchange as 'binance' | 'okx';
    
    if (!exchange || (exchange !== 'binance' && exchange !== 'okx')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid exchange. Must be binance or okx'
      });
    }
    
    const canceled = await userTradingService.cancelOrder(userId, orderId, exchange);
    
    if (!canceled) {
      return res.status(500).json({
        success: false,
        message: 'Failed to cancel order'
      });
    }
    
    res.json({
      success: true,
      message: 'Order canceled successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error canceling order',
      error: error.message
    });
  }
});

/**
 * Execute automated trades based on ML predictions
 * @route POST /api/user-trading/automated
 * @access Private
 */
router.post('/automated', async (req, res) => {
  try {
    const userId = req.user!.id;
    const { riskLevel } = req.body;
    
    // Validate risk level
    if (riskLevel && !['low', 'medium', 'high'].includes(riskLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid risk level. Must be low, medium, or high'
      });
    }
    
    const orders = await userTradingService.executeAutomatedTrades(
      userId, 
      riskLevel || 'low'
    );
    
    res.json({
      success: true,
      message: `Executed ${orders.length} automated trades`,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error executing automated trades',
      error: error.message
    });
  }
});

/**
 * Close user trading session
 * @route POST /api/user-trading/close
 * @access Private
 */
router.post('/close', (req, res) => {
  try {
    const userId = req.user!.id;
    userTradingService.closeUserSession(userId);
    
    res.json({
      success: true,
      message: 'Trading session closed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error closing trading session',
      error: error.message
    });
  }
});

export default router;