/**
 * Verify Binance API connection through the Python Flask server
 */

const fetch = require('node-fetch');

// Configuration
const PYTHON_SERVER = 'http://localhost:5001';

async function testBinanceApiConnection() {
  try {
    console.log('Testing Binance API connection...');
    const response = await fetch();
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    return data.success === true;
  } catch (error) {
    console.error('Error testing Binance API connection:', error.message);
    return false;
  }
}

async function testProxyStatus() {
  try {
    console.log('\nChecking proxy status...');
    const response = await fetch();
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    return data.proxy && data.proxy.working;
  } catch (error) {
    console.error('Error checking proxy status:', error.message);
    return false;
  }
}

async function testTickerPrice() {
  try {
    const symbol = 'BTCUSDT';
    console.log();
    const response = await fetch();
    const data = await response.json();
    
    console.log('Response:', JSON.stringify(data, null, 2));
    return data.symbol === symbol && data.price;
  } catch (error) {
    console.error('Error getting ticker price:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting Binance API verification tests\n');
  
  // Test 1: Binance API Connection
  const connectionResult = await testBinanceApiConnection();
  console.log();
  
  // Test 2: Proxy Status
  const proxyResult = await testProxyStatus();
  console.log();
  
  // Test 3: Ticker Price
  const tickerResult = await testTickerPrice();
  console.log();
  
  // Overall result
  const allPassed = connectionResult && proxyResult && tickerResult;
  console.log();
  
  return allPassed;
}

runTests().then(result => {
  console.log();
}).catch(error => {
  console.error('Error running tests:', error);
});
