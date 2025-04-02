/**
 * Test script for direct storage access to trade logs
 * This script tests the direct storage approach instead of using fetch()
 */

import { storage } from './server/storage.js';

async function testDirectStorageAccess() {
  console.log('===== Testing Direct Storage Access for Trade Logs =====');
  
  try {
    // Create a trade log
    console.log('Creating a trade log...');
    
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'DIRECT_TEST',
      status: 'EXECUTED',
      predicted_confidence: '0.85',
      reason: 'Test direct storage access'
    };
    
    const createdTradeLog = await storage.createTradeLog(tradeLogData);
    console.log('Trade log created successfully:', createdTradeLog);
    
    // Get trade logs by symbol
    console.log('\nGetting trade logs by symbol (BTCUSDT)...');
    
    const symbolTradeLogs = await storage.getTradeLogsBySymbol('BTCUSDT', 100);
    console.log(`Found ${symbolTradeLogs.length} trade logs for BTCUSDT:`, symbolTradeLogs);
    
    // Get trade logs by source
    console.log('\nGetting trade logs by source (DIRECT_TEST)...');
    
    const sourceTradeLogs = await storage.getTradeLogsBySource('DIRECT_TEST', 100);
    console.log(`Found ${sourceTradeLogs.length} trade logs from DIRECT_TEST source:`, sourceTradeLogs);
    
    // Search trade logs with filtering
    console.log('\nSearching trade logs with filters...');
    
    const searchFilter = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      source: 'DIRECT_TEST',
      status: 'EXECUTED'
    };
    
    const searchResults = await storage.searchTradeLogs(searchFilter, 100);
    console.log(`Search found ${searchResults.length} matching trade logs:`, searchResults);
    
    // Get a specific trade log by ID (using the one we just created)
    if (createdTradeLog && createdTradeLog.id) {
      console.log(`\nGetting trade log by ID (${createdTradeLog.id})...`);
      
      const tradeLog = await storage.getTradeLog(createdTradeLog.id);
      console.log('Retrieved trade log:', tradeLog);
      
      // Update the trade log
      console.log('\nUpdating trade log...');
      
      const updates = {
        reason: 'Updated via direct storage',
        status: 'COMPLETED'
      };
      
      const updatedTradeLog = await storage.updateTradeLog(createdTradeLog.id, updates);
      console.log('Trade log updated successfully:', updatedTradeLog);
    }
    
    console.log('\n===== Direct Storage Access Test Completed Successfully =====');
  } catch (error) {
    console.error('Error during direct storage access test:', error);
  }
}

testDirectStorageAccess();