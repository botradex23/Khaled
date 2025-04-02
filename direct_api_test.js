// This script directly tests the existing API endpoints without importing any server modules

import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Use Node.js built-in fetch (available in Node.js 18+)
// No need to import node-fetch

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'http://localhost:3000';

async function testTradeLogsAPI() {
  console.log('Testing Trade Logs API...');
  
  try {
    // Create a trade log
    const tradeLogData = {
      symbol: 'BTCUSDT',
      action: 'BUY',
      entry_price: '50000',
      quantity: '0.1',
      trade_source: 'TEST_SCRIPT',
      status: 'EXECUTED',
      predicted_confidence: '0.85',
      reason: null,
      user_id: 1
    };
    
    console.log('Attempting to create trade log with POST to', `${BASE_URL}/api/trade-logs`);
    console.log('Request data:', JSON.stringify(tradeLogData, null, 2));
    
    const createResponse = await fetch(`${BASE_URL}/api/trade-logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(tradeLogData)
    });
    
    console.log('Response status:', createResponse.status);
    console.log('Response headers:', createResponse.headers);
    
    // Try to parse the response as JSON
    try {
      const responseText = await createResponse.text();
      console.log('Response text (first 500 chars):', responseText.substring(0, 500));
      
      try {
        const responseJson = JSON.parse(responseText);
        console.log('Response parsed as JSON:', responseJson);
      } catch (parseError) {
        console.log('Failed to parse response as JSON. Got HTML?');
      }
    } catch (textError) {
      console.error('Error getting response text:', textError);
    }
    
    console.log('Test completed!');
  } catch (error) {
    console.error('API test failed:', error);
  }
}

testTradeLogsAPI();