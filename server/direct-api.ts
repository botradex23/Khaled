import express from 'express';
import { storage } from './storage';

// Create a separate direct API router
const directRouter = express.Router();

/**
 * Trade Logs API Routes
 * IMPORTANT: Route order matters! More specific routes should be defined before generic ones.
 */

// Create a new trade log
directRouter.post('/trade-logs', async (req, res) => {
  try {
    console.log('DIRECT API: POST /direct-api/trade-logs endpoint hit');
    console.log('Request body:', req.body);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Basic validation
    if (!req.body.symbol || !req.body.action || !req.body.entry_price || !req.body.quantity || !req.body.trade_source) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        message: 'symbol, action, entry_price, quantity, and trade_source are required' 
      });
    }
    
    // Create the trade log
    const tradeLog = await storage.createTradeLog({
      symbol: req.body.symbol,
      action: req.body.action,
      entry_price: req.body.entry_price,
      quantity: req.body.quantity,
      trade_source: req.body.trade_source,
      predicted_confidence: req.body.predicted_confidence || null,
      status: req.body.status || 'EXECUTED',
      reason: req.body.reason || null,
      user_id: req.body.user_id,
      position_id: req.body.position_id,
      trade_id: req.body.trade_id
    });
    
    console.log(`DIRECT API: Created new trade log with ID ${tradeLog.id}`);
    
    // Return the created trade log
    return res.status(201).json(tradeLog);
  } catch (error) {
    console.error('DIRECT API: Error creating trade log:', error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to create trade log', details: String(error) });
  }
});

// Search trade logs with filtering - must come before the /:id route to not be captured by it
// Support both GET and POST requests for filtering trade logs
const searchTradeLogsHandler = async (req, res) => {
  try {
    const isPost = req.method === 'POST';
    console.log(`DIRECT API: ${req.method} /direct-api/trade-logs/search endpoint hit`);
    
    // Get parameters from either query string (GET) or request body (POST)
    const params = isPost ? req.body : req.query;
    console.log('Search parameters:', params);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const filter: {
      symbol?: string;
      action?: string;
      source?: string;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
      userId?: number;
    } = {};
    
    // Extract and validate parameters
    if (params.symbol) filter.symbol = params.symbol as string;
    if (params.action && params.action !== 'ALL') filter.action = params.action as string;
    if (params.source) filter.source = params.source as string;
    if (params.status && params.status !== 'ALL') filter.status = params.status as string;
    
    // Handle date filtering
    if (params.fromDate) {
      try {
        filter.fromDate = new Date(params.fromDate as string);
      } catch (error) {
        console.warn('Invalid fromDate format:', params.fromDate);
      }
    }
    
    if (params.toDate) {
      try {
        filter.toDate = new Date(params.toDate as string);
      } catch (error) {
        console.warn('Invalid toDate format:', params.toDate);
      }
    }
    
    // Handle user ID filtering
    if (params.userId) {
      const userId = parseInt(params.userId as string, 10);
      if (!isNaN(userId)) {
        filter.userId = userId;
      }
    }
    
    // Get limit parameter
    const limit = params.limit ? parseInt(params.limit as string, 10) : 100;
    
    // Search trade logs with filter
    const tradeLogs = await storage.searchTradeLogs(filter, limit);
    
    console.log(`DIRECT API: Returning ${tradeLogs.length} filtered trade logs`);
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error('DIRECT API: Error searching trade logs:', error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to search trade logs', details: String(error) });
  }
};

// Register both GET and POST handlers for the search endpoint
directRouter.get('/trade-logs/search', searchTradeLogsHandler);
directRouter.post('/trade-logs/search', searchTradeLogsHandler);

// Get trade logs by symbol - must come before the /:id route
directRouter.get('/trade-logs/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    console.log(`DIRECT API: GET /direct-api/trade-logs/symbol/${symbol} endpoint hit`);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const tradeLogs = await storage.getTradeLogsBySymbol(symbol, limit);
    
    console.log(`DIRECT API: Returning ${tradeLogs.length} trade logs for symbol ${symbol}`);
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error(`DIRECT API: Error fetching trade logs for symbol ${req.params.symbol}:`, error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade logs by symbol', details: String(error) });
  }
});

// Get trade logs by source - must come before the /:id route
directRouter.get('/trade-logs/source/:source', async (req, res) => {
  try {
    const { source } = req.params;
    console.log(`DIRECT API: GET /direct-api/trade-logs/source/${source} endpoint hit`);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const tradeLogs = await storage.getTradeLogsBySource(source, limit);
    
    console.log(`DIRECT API: Returning ${tradeLogs.length} trade logs for source ${source}`);
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error(`DIRECT API: Error fetching trade logs for source ${req.params.source}:`, error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade logs by source', details: String(error) });
  }
});

// Get trade logs by user ID - must come before the /:id route
directRouter.get('/trade-logs/user/:userId', async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID format' });
    }
    
    console.log(`DIRECT API: GET /direct-api/trade-logs/user/${userId} endpoint hit`);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const tradeLogs = await storage.getTradeLogsByUserId(userId, limit);
    
    console.log(`DIRECT API: Returning ${tradeLogs.length} trade logs for user ${userId}`);
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error(`DIRECT API: Error fetching trade logs for user ${req.params.userId}:`, error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade logs by user', details: String(error) });
  }
});

// Get a specific trade log by ID
directRouter.get('/trade-logs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    console.log(`DIRECT API: GET /direct-api/trade-logs/${id} endpoint hit`);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const tradeLog = await storage.getTradeLog(id);
    
    if (!tradeLog) {
      return res.status(404).json({ error: 'Trade log not found' });
    }
    
    return res.json(tradeLog);
  } catch (error) {
    console.error(`DIRECT API: Error fetching trade log with ID ${req.params.id}:`, error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade log', details: String(error) });
  }
});

// Get all trade logs (default route)
directRouter.get('/trade-logs', async (req, res) => {
  try {
    console.log('DIRECT API: GET /direct-api/trade-logs endpoint hit');
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const tradeLogs = await storage.getAllTradeLogs(limit);
    
    console.log(`DIRECT API: Returning ${tradeLogs.length} trade logs`);
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error('DIRECT API: Error fetching all trade logs:', error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade logs', details: String(error) });
  }
});

// Update a trade log
directRouter.patch('/trade-logs/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    console.log(`DIRECT API: PATCH /direct-api/trade-logs/${id} endpoint hit`);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Check if the trade log exists
    const existingLog = await storage.getTradeLog(id);
    if (!existingLog) {
      return res.status(404).json({ error: 'Trade log not found' });
    }
    
    // Update the trade log
    const updatedLog = await storage.updateTradeLog(id, req.body);
    
    if (!updatedLog) {
      return res.status(500).json({ error: 'Failed to update trade log' });
    }
    
    console.log(`DIRECT API: Updated trade log with ID ${id}`);
    
    // Return the updated trade log
    return res.json(updatedLog);
  } catch (error) {
    console.error(`DIRECT API: Error updating trade log with ID ${req.params.id}:`, error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to update trade log', details: String(error) });
  }
});

export default directRouter;