import { storage } from './server/storage.js';

async function testTradeLogAPI() {
  console.log('Testing Trade Logs API...');
  
  try {
    // Create a trade log
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'ML_MODEL',
      status: 'EXECUTED',
      predicted_confidence: '0.85'
    };
    
    console.log('Creating trade log with data:', tradeLogData);
    const createdTradeLog = await storage.createTradeLog(tradeLogData);
    console.log('Trade log created:', createdTradeLog);
    
    // Get trade log by ID
    const tradeLogById = await storage.getTradeLog(createdTradeLog.id);
    console.log('Trade log retrieved by ID:', tradeLogById);
    
    // Get trade logs by symbol
    const tradeLogsBySymbol = await storage.getTradeLogsBySymbol('BTCUSDT');
    console.log('Trade logs by symbol:', tradeLogsBySymbol);
    
    // Get trade logs by source
    const tradeLogsBySource = await storage.getTradeLogsBySource('ML_MODEL');
    console.log('Trade logs by source:', tradeLogsBySource);
    
    // Search trade logs
    const searchResults = await storage.searchTradeLogs({
      symbol: 'BTCUSDT',
      action: 'BUY'
    });
    console.log('Search results:', searchResults);
    
    console.log('Trade Logs API test completed successfully!');
  } catch (error) {
    console.error('Error testing Trade Logs API:', error);
  }
}

testTradeLogAPI();