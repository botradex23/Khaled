/**
 * Test script for trade logs API endpoints
 * This file directly tests the trade logs API on the correct port (5000)
 */

async function testTradeLogsAPI() {
  console.log('===== Testing Trade Logs API =====');
  
  // Use the local development server URL
  const API_URL = 'http://localhost:3000/api/trade-logs';
  
  try {
    // Create a trade log
    console.log('Creating a trade log...');
    
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'TEST_SCRIPT',
      status: 'EXECUTED',
      predicted_confidence: '0.85',
      reason: 'Test API endpoint'
    };
    
    const createResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tradeLogData)
    });
    
    if (!createResponse.ok) {
      throw new Error(`Failed to create trade log: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    const createdTradeLog = await createResponse.json();
    console.log('Trade log created successfully:', createdTradeLog);
    
    // Get trade logs by symbol
    console.log('\nGetting trade logs by symbol (BTCUSDT)...');
    
    const symbolResponse = await fetch(`${API_URL}/symbol/BTCUSDT`);
    
    if (!symbolResponse.ok) {
      throw new Error(`Failed to get trade logs by symbol: ${symbolResponse.status} ${symbolResponse.statusText}`);
    }
    
    const symbolTradeLogs = await symbolResponse.json();
    console.log(`Found ${symbolTradeLogs.length} trade logs for BTCUSDT`);
    
    // Get trade logs by source
    console.log('\nGetting trade logs by source (TEST_SCRIPT)...');
    
    const sourceResponse = await fetch(`${API_URL}/source/TEST_SCRIPT`);
    
    if (!sourceResponse.ok) {
      throw new Error(`Failed to get trade logs by source: ${sourceResponse.status} ${sourceResponse.statusText}`);
    }
    
    const sourceTradeLogs = await sourceResponse.json();
    console.log(`Found ${sourceTradeLogs.length} trade logs from TEST_SCRIPT source`);
    
    // Search trade logs with filtering
    console.log('\nSearching trade logs with filters...');
    
    const searchParams = new URLSearchParams({
      symbol: 'BTCUSDT',
      action: 'BUY',
      source: 'TEST_SCRIPT',
      status: 'EXECUTED'
    });
    
    const searchResponse = await fetch(`${API_URL}/search?${searchParams.toString()}`);
    
    if (!searchResponse.ok) {
      throw new Error(`Failed to search trade logs: ${searchResponse.status} ${searchResponse.statusText}`);
    }
    
    const searchResults = await searchResponse.json();
    console.log(`Search found ${searchResults.length} matching trade logs`);
    
    // Get a specific trade log by ID (using the one we just created)
    if (createdTradeLog && createdTradeLog.id) {
      console.log(`\nGetting trade log by ID (${createdTradeLog.id})...`);
      
      const getResponse = await fetch(`${API_URL}/${createdTradeLog.id}`);
      
      if (!getResponse.ok) {
        throw new Error(`Failed to get trade log by ID: ${getResponse.status} ${getResponse.statusText}`);
      }
      
      const tradeLog = await getResponse.json();
      console.log('Retrieved trade log:', tradeLog);
      
      // Update the trade log
      console.log('\nUpdating trade log...');
      
      const updates = {
        reason: 'Updated via test script',
        status: 'EXECUTED'
      };
      
      const updateResponse = await fetch(`${API_URL}/${createdTradeLog.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });
      
      if (!updateResponse.ok) {
        throw new Error(`Failed to update trade log: ${updateResponse.status} ${updateResponse.statusText}`);
      }
      
      const updatedTradeLog = await updateResponse.json();
      console.log('Trade log updated successfully:', updatedTradeLog);
    }
    
    console.log('\n===== Trade Logs API Test Completed Successfully =====');
  } catch (error) {
    console.error('Error during API test:', error.message);
    
    // Additional error handling for network issues
    if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to the server. Make sure the application is deployed and running on Replit.');
    }
  }
}

testTradeLogsAPI();