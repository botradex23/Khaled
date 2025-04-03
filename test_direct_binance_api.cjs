/**
 * Test Direct Binance API Access
 * 
 * This script tests the direct Binance API endpoints without going through the frontend
 */
const https = require('https');
const http = require('http');

// Simple fetch implementation using Node.js http/https modules
function fetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const lib = isHttps ? https : http;
    
    const req = lib.request(url, options, (res) => {
      const statusCode = res.statusCode;
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          status: statusCode,
          json: () => Promise.resolve(JSON.parse(data)),
          text: () => Promise.resolve(data)
        });
      });
    });
    
    req.on('error', (e) => {
      reject(e);
    });
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testDirectBinanceAPI() {
  console.log('=== Testing Direct Binance API endpoints ===');
  
  try {
    // Test the Express direct API endpoints
    console.log('\n1. Testing demo account balance endpoint...');
    const demoBalanceResponse = await fetch('http://localhost:5000/direct-api/binance/demo-balance');
    const demoBalance = await demoBalanceResponse.json();
    
    console.log('Demo Account Balance API response success:', demoBalance.success);
    console.log('Total portfolio value:', demoBalance.total_value_usd);
    console.log('Assets:');
    demoBalance.balances.forEach(balance => {
      console.log(`  ${balance.currency}: ${balance.total} (${balance.value_usd} USD)`);
    });
    
    // Test connection endpoint (unauthenticated, should return 401)
    console.log('\n2. Testing unauthenticated connection endpoint (should fail with 401)...');
    try {
      const connectionResponse = await fetch('http://localhost:5000/direct-api/binance/connection-test');
      if (connectionResponse.status === 401) {
        console.log('Authentication check working correctly (received 401 as expected)');
      } else {
        const connectionData = await connectionResponse.json();
        console.log('Unexpected successful response from connection test:', connectionData);
      }
    } catch (error) {
      console.log('Connection test failed as expected (authentication required):', error.message);
    }
    
    // Test the Python service endpoints
    console.log('\n3. Testing Python Binance service status...');
    const statusResponse = await fetch('http://localhost:5001/api/status');
    const status = await statusResponse.json();
    
    console.log('Python Binance service status:', status.success ? 'running' : 'error');
    console.log('Version:', status.version);
    
    // Test Python price endpoint
    console.log('\n4. Testing Python Binance price endpoint for BTC...');
    const btcPriceResponse = await fetch('http://localhost:5001/api/binance/price/BTCUSDT');
    const btcPrice = await btcPriceResponse.json();
    
    console.log('BTC price API response success:', btcPrice.success);
    if (btcPrice.success) {
      const priceData = btcPrice.price;
      if (typeof priceData === 'object' && priceData.price) {
        console.log('BTC price:', priceData.price, 'USD');
      } else if (typeof priceData === 'string') {
        console.log('BTC price:', priceData, 'USD');
      } else {
        console.log('BTC price data:', priceData);
      }
    }
    
    // Test Python all prices endpoint
    console.log('\n5. Testing Python Binance all prices endpoint...');
    const allPricesResponse = await fetch('http://localhost:5001/api/binance/prices');
    const allPrices = await allPricesResponse.json();
    
    console.log('All prices API response success:', allPrices.success);
    console.log('Number of cryptocurrencies:', allPrices.count || 'unknown');
    
    // Test connection status endpoint
    console.log('\n6. Testing Python Binance connection status endpoint...');
    const connectionStatusResponse = await fetch('http://localhost:5001/api/binance/connection-status');
    const connectionStatus = await connectionStatusResponse.json();
    
    console.log('Connection status API response success:', connectionStatus.success);
    if (connectionStatus.connection) {
      console.log('Connection status:', connectionStatus.connection.status);
      console.log('Direct API access:', connectionStatus.connection.direct_api_access);
      console.log('Using fallback data:', connectionStatus.connection.using_fallback_data);
      if (connectionStatus.connection.error) {
        console.log('Connection error:', connectionStatus.connection.error);
      }
    }
    
    console.log('\n=== Direct Binance API tests completed ===');
  } catch (error) {
    console.error('Error during Direct Binance API testing:', error);
  }
}

// Run the tests
testDirectBinanceAPI();