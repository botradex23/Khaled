// Using global fetch since we're in Node.js environment

async function testTradeLogs() {
  console.log('Testing Trade Logs API directly...');
  
  try {
    // Create a trade log
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'ML_MODEL',
      status: 'EXECUTED',
      predicted_confidence: '0.85',
      reason: null,
      user_id: 1
    };
    
    console.log('Creating trade log with data:', tradeLogData);
    
    const createResponse = await fetch('http://localhost:3000/api/trade-logs', {
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
    console.log('Trade log created:', createdTradeLog);
    
    // Get all trade logs
    const getResponse = await fetch('http://localhost:3000/api/trade-logs');
    
    if (!getResponse.ok) {
      throw new Error(`Failed to get trade logs: ${getResponse.status} ${getResponse.statusText}`);
    }
    
    const tradeLogs = await getResponse.json();
    console.log('All trade logs:', tradeLogs);
    
    console.log('Trade Logs API test completed successfully!');
  } catch (error) {
    console.error('Error testing Trade Logs API:', error);
  }
}

testTradeLogs();