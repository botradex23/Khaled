import express from 'express';
import { z } from 'zod';
import { storage } from '../../storage';
import { insertTradeLogSchema } from '@shared/schema';
import { ensureAuthenticated } from '../../auth';

const router = express.Router();

/**
 * Get all trade logs
 * GET /api/trade-logs
 */
router.get('/', async (req, res) => {
  try {
    console.log('GET /api/trade-logs endpoint hit');
    console.log('Request Headers:', req.headers);
    
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const tradeLogs = await storage.getAllTradeLogs(limit);
    
    console.log(`Returning ${tradeLogs.length} trade logs`);
    console.log('Response will be:', JSON.stringify(tradeLogs).substring(0, 100) + '...');
    
    return res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching all trade logs:', error);
    // Force the content type to be JSON
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
});

/**
 * Create a new trade log
 * POST /api/trade-logs
 */
router.post('/', async (req, res) => {
  try {
    // Validate request body against schema
    const validatedData = insertTradeLogSchema.parse(req.body);
    
    // Create the trade log
    const tradeLog = await storage.createTradeLog(validatedData);
    
    // Return the created trade log
    res.status(201).json(tradeLog);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid request data', details: error.errors });
    } else {
      console.error('Error creating trade log:', error);
      res.status(500).json({ error: 'Failed to create trade log' });
    }
  }
});

/**
 * Get trade logs by symbol
 * GET /api/trade-logs/symbol/:symbol
 */
router.get('/symbol/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const tradeLogs = await storage.getTradeLogsBySymbol(symbol, limit);
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching trade logs by symbol:', error);
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
});

/**
 * Get trade logs by source
 * GET /api/trade-logs/source/:source
 */
router.get('/source/:source', async (req, res) => {
  try {
    const { source } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const tradeLogs = await storage.getTradeLogsBySource(source, limit);
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching trade logs by source:', error);
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
});

/**
 * Get trade logs for current user
 * GET /api/trade-logs/user
 */
router.get('/user', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const tradeLogs = await storage.getTradeLogsByUserId(userId, limit);
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching user trade logs:', error);
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
});

/**
 * Search trade logs with filtering
 * GET /api/trade-logs/search
 */
router.get('/search', async (req, res) => {
  try {
    const filter: {
      symbol?: string;
      action?: string;
      source?: string;
      status?: string;
      fromDate?: Date;
      toDate?: Date;
      userId?: number;
    } = {};
    
    // Apply filters from query parameters
    if (req.query.symbol) filter.symbol = req.query.symbol as string;
    if (req.query.action) filter.action = req.query.action as string;
    if (req.query.source) filter.source = req.query.source as string;
    if (req.query.status) filter.status = req.query.status as string;
    
    // Convert string dates to Date objects
    if (req.query.fromDate) {
      filter.fromDate = new Date(req.query.fromDate as string);
    }
    
    if (req.query.toDate) {
      filter.toDate = new Date(req.query.toDate as string);
    }
    
    // Add userId filter only if user is authenticated
    if (req.user && req.query.onlyMine === 'true') {
      filter.userId = req.user.id;
    }
    
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    
    const tradeLogs = await storage.searchTradeLogs(filter, limit);
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error searching trade logs:', error);
    res.status(500).json({ error: 'Failed to search trade logs' });
  }
});

/**
 * Get a specific trade log by ID
 * GET /api/trade-logs/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid trade log ID' });
    }
    
    const tradeLog = await storage.getTradeLog(id);
    
    if (!tradeLog) {
      return res.status(404).json({ error: 'Trade log not found' });
    }
    
    res.json(tradeLog);
  } catch (error) {
    console.error('Error fetching trade log:', error);
    res.status(500).json({ error: 'Failed to fetch trade log' });
  }
});

/**
 * Update a trade log
 * PATCH /api/trade-logs/:id
 */
router.patch('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid trade log ID' });
    }
    
    // Get existing trade log
    const existingTradeLog = await storage.getTradeLog(id);
    
    if (!existingTradeLog) {
      return res.status(404).json({ error: 'Trade log not found' });
    }
    
    // Update the trade log
    const updatedTradeLog = await storage.updateTradeLog(id, req.body);
    
    res.json(updatedTradeLog);
  } catch (error) {
    console.error('Error updating trade log:', error);
    res.status(500).json({ error: 'Failed to update trade log' });
  }
});

export default router;