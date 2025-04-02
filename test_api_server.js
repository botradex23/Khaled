import express from 'express';
import { storage } from './server/storage.js';

const app = express();
const PORT = 4000;

app.use(express.json());

// Create route to add a trade log
app.post('/api/trade-logs', async (req, res) => {
  try {
    console.log('Received request to create trade log:', req.body);
    
    const tradeLogData = {
      symbol: req.body.symbol,
      action: req.body.action,
      entry_price: req.body.entry_price,
      quantity: req.body.quantity,
      trade_source: req.body.trade_source,
      status: req.body.status || 'EXECUTED',
      predicted_confidence: req.body.predicted_confidence,
      reason: req.body.reason,
      user_id: req.body.user_id
    };
    
    console.log('Creating trade log with data:', tradeLogData);
    const createdTradeLog = await storage.createTradeLog(tradeLogData);
    console.log('Trade log created:', createdTradeLog);
    
    res.status(201).json(createdTradeLog);
  } catch (error) {
    console.error('Error creating trade log:', error);
    res.status(500).json({ error: 'Failed to create trade log' });
  }
});

// Get all trade logs
app.get('/api/trade-logs', async (req, res) => {
  try {
    console.log('Fetching all trade logs');
    
    // There's no direct method to get all trade logs, so we'll use search with no filters
    const tradeLogs = await storage.searchTradeLogs({});
    console.log(`Found ${tradeLogs.length} trade logs`);
    
    res.json(tradeLogs);
  } catch (error) {
    console.error('Error fetching trade logs:', error);
    res.status(500).json({ error: 'Failed to fetch trade logs' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Test API server running on port ${PORT}`);
});

// Simple smoke test when the server starts
setTimeout(async () => {
  try {
    console.log('\n--- Running smoke test ---');
    
    // Create a test trade log
    const testData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'TEST',
      status: 'EXECUTED',
      predicted_confidence: '0.85'
    };
    
    console.log('Creating test trade log...');
    const createdLog = await storage.createTradeLog(testData);
    console.log('Test trade log created:', createdLog);
    
    // Search for trade logs
    console.log('Searching for trade logs...');
    const logs = await storage.searchTradeLogs({});
    console.log(`Found ${logs.length} trade logs in storage`);
    
    console.log('--- Smoke test complete ---\n');
  } catch (error) {
    console.error('Smoke test failed:', error);
  }
}, 1000);