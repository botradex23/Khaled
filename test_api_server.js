/**
 * Test script for trade logs API via Express API
 * This works via the Express port directly (5000) rather than the Vite port (3000)
 */

async function testTradeLogsViaExpress() {
  console.log('===== Testing Trade Logs API via Express Server =====');
  
  // Use the direct Express port (5000) which is where the actual API runs
  const API_URL = 'http://localhost:5000/api/trade-logs';
  
  try {
    // Create a trade log
    console.log('Creating a trade log...');
    
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'VITE_TEST',
      status: 'EXECUTED',
      predicted_confidence: '0.85',
      reason: 'Test via Vite dev server'
    };
    
    const createResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tradeLogData)
    });
    
    console.log('Response status:', createResponse.status);
    
    // Get the raw response text first to see what's actually being returned
    const responseText = await createResponse.text();
    console.log('Raw response body:', responseText);
    
    if (!createResponse.ok) {
      console.error('Error response body:', responseText);
      throw new Error(`Failed to create trade log: ${createResponse.status} ${createResponse.statusText}`);
    }
    
    // Now we need to parse the text manually since we already consumed the response
    let createdTradeLog;
    try {
      createdTradeLog = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse JSON response:', parseError.message);
      throw new Error('Server returned a non-JSON response');
    }
    console.log('Trade log created successfully:', createdTradeLog);
    
    // Get all trade logs
    console.log('\nGetting all trade logs...');
    
    const getResponse = await fetch(API_URL);
    console.log('GET response status:', getResponse.status);
    
    // Get the raw response text first
    const getResponseText = await getResponse.text();
    console.log('Raw GET response body:', getResponseText);
    
    if (!getResponse.ok) {
      console.error('Error GET response body:', getResponseText);
      throw new Error(`Failed to get trade logs: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    // Parse the text manually
    let tradeLogs;
    try {
      tradeLogs = JSON.parse(getResponseText);
    } catch (parseError) {
      console.error('Failed to parse GET JSON response:', parseError.message);
      throw new Error('Server returned a non-JSON response for GET request');
    }
    console.log(`Found ${tradeLogs.length} trade logs`);
    
    console.log('\n===== Trade Logs API Test Completed Successfully =====');
  } catch (error) {
    console.error('Error testing Trade Logs API:', error.message);
    
    // Additional error handling for network issues
    if (error.code === 'ECONNREFUSED') {
      console.error('Could not connect to the server. Make sure the Vite dev server is running on port 3000.');
    }
  }
}

testTradeLogsViaExpress();