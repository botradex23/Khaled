import axios from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { config } from 'dotenv';
import fs from 'fs';

// Load environment variables from .env
const result = config();

// Get proxy settings from environment
const PROXY_IP = process.env.PROXY_IP;
const PROXY_PORT = process.env.PROXY_PORT;
const PROXY_USERNAME = process.env.PROXY_USERNAME;
const PROXY_PASSWORD = process.env.PROXY_PASSWORD;
const USE_PROXY = process.env.USE_PROXY === 'true';

// Output the actual .env file content for debugging
console.log('\nActual .env file content (proxy settings only):');
const envContent = fs.readFileSync('.env', 'utf8');
const proxySettings = envContent.split('\n').filter(line => 
  line.includes('PROXY_') || line.includes('USE_PROXY')
).slice(0, 6).join('\n');
console.log(proxySettings);

console.log('\nProxy settings loaded from environment variables:');
console.log(`USE_PROXY: ${USE_PROXY}`);
console.log(`PROXY_IP: ${PROXY_IP}`);
console.log(`PROXY_PORT: ${PROXY_PORT}`);
console.log(`PROXY_USERNAME: ${PROXY_USERNAME}`);
console.log(`PROXY_PASSWORD: ${PROXY_PASSWORD ? '****' : 'not set'}`);

// Configure proxy URL
const proxyUrl = USE_PROXY ? `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_IP}:${PROXY_PORT}` : null;
const httpsAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : null;

// Test Binance API
async function testBinanceAPI() {
  console.log('\nTesting Binance API connection with current settings...');
  
  try {
    // Test the ping endpoint first
    const pingOptions = {
      url: 'https://api.binance.com/api/v3/ping',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    };
    
    if (USE_PROXY && httpsAgent) {
      pingOptions.httpsAgent = httpsAgent;
      console.log('Using proxy for connection...');
    } else {
      console.log('Using direct connection (no proxy)...');
    }
    
    console.log('Testing ping endpoint...');
    const pingResponse = await axios(pingOptions);
    console.log(`✅ Ping successful: ${JSON.stringify(pingResponse.data)}`);
    
    // Now test the price ticker endpoint
    console.log('\nTesting BTC-USDT price endpoint...');
    const priceOptions = {
      url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    };
    
    if (USE_PROXY && httpsAgent) {
      priceOptions.httpsAgent = httpsAgent;
    }
    
    const priceResponse = await axios(priceOptions);
    console.log(`✅ Price data successful: ${JSON.stringify(priceResponse.data)}`);
    
    // Try to get all prices
    console.log('\nTesting all prices endpoint...');
    const allPricesOptions = {
      url: 'https://api.binance.com/api/v3/ticker/price',
      method: 'GET',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      }
    };
    
    if (USE_PROXY && httpsAgent) {
      allPricesOptions.httpsAgent = httpsAgent;
    }
    
    const allPricesResponse = await axios(allPricesOptions);
    console.log(`✅ All prices data successful: Retrieved ${allPricesResponse.data.length} price entries`);
    console.log(`First 3 prices: ${JSON.stringify(allPricesResponse.data.slice(0, 3))}`);
    
    return true;
  } catch (error) {
    console.log('❌ Binance API test failed');
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
      console.log(`Response data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`Error message: ${error.message}`);
    }
    return false;
  }
}

// Test our API endpoint
async function testOurAPIEndpoint() {
  console.log('\nTesting our Binance market prices API endpoint...');
  
  try {
    const response = await axios.get('http://localhost:5000/api/binance/market-prices');
    
    if (response.status === 200) {
      console.log(`✅ Our API endpoint successful`);
      console.log(`Data source: ${response.data.source}`);
      console.log(`Number of prices: ${response.data.count}`);
      if (response.data.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        console.log(`First 3 prices: ${JSON.stringify(response.data.data.slice(0, 3))}`);
      } else {
        console.log(`No price data available or unexpected data format`);
      }
      return true;
    } else {
      console.log(`❌ Our API returned unexpected status: ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log('❌ Our API endpoint test failed');
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
      console.log(`Response data: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`Error message: ${error.message}`);
    }
    return false;
  }
}

// Run the tests
async function runTests() {
  const binanceAPIResult = await testBinanceAPI();
  
  if (!binanceAPIResult) {
    console.log('\n⚠️ Direct Binance API test failed. Testing our API endpoint which has fallback mechanisms...');
  }
  
  await testOurAPIEndpoint();
}

runTests();
