/**
 * Direct test for Binance API with proxy
 * This script tests direct API calls to Binance using axios with proxy configuration
 */

// ES module imports
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get current file directory for relative paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually
const envContent = fs.readFileSync('.env', 'utf8');
const envVars = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    envVars[key] = value;
    // Also set to process.env for compatibility
    process.env[key] = value;
  }
});

// Binance API configuration
const apiKey = process.env.BINANCE_API_KEY;
const apiSecret = process.env.BINANCE_SECRET_KEY;
const useTestnet = process.env.BINANCE_USE_TESTNET === 'true';
const baseUrl = useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';

// Proxy configuration
const proxyHost = process.env.BINANCE_PROXY_HOST;
const proxyPort = process.env.BINANCE_PROXY_PORT;
const proxyUsername = process.env.BINANCE_PROXY_USERNAME;
const proxyPassword = process.env.BINANCE_PROXY_PASSWORD;

/**
 * Generate a signature for Binance API request
 */
function generateSignature(queryString) {
  return crypto
    .createHmac('sha256', apiSecret)
    .update(queryString)
    .digest('hex');
}

/**
 * Make a request to Binance API with proxy
 */
async function makeRequest(endpoint, params = {}, method = 'GET', securityType = 'SIGNED') {
  // Configure request
  const timestamp = Date.now();
  let queryString = '';

  // Add timestamp if it's a signed request
  if (securityType === 'SIGNED') {
    params.timestamp = timestamp;
    
    // Convert params to query string
    const searchParams = new URLSearchParams();
    for (const key in params) {
      searchParams.append(key, params[key].toString());
    }
    queryString = searchParams.toString();
    
    // Generate signature
    const signature = generateSignature(queryString);
    queryString = `${queryString}&signature=${signature}`;
  } else if (Object.keys(params).length > 0) {
    // For public endpoints with params but no signature
    const searchParams = new URLSearchParams();
    for (const key in params) {
      searchParams.append(key, params[key].toString());
    }
    queryString = searchParams.toString();
  }

  const url = `${baseUrl}${endpoint}${queryString ? '?' + queryString : ''}`;
  
  console.log(`Making ${method} request to: ${url}`);
  
  // Set up Axios config with proxy if available
  const axiosConfig = {
    method,
    url,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'User-Agent': 'BinanceProxyTest/1.0.0'
    }
  };

  // Add proxy if configured
  if (proxyHost && proxyPort) {
    axiosConfig.proxy = {
      host: proxyHost,
      port: parseInt(proxyPort)
    };
    
    // Add proxy auth if provided
    if (proxyUsername && proxyPassword) {
      axiosConfig.proxy.auth = {
        username: proxyUsername,
        password: proxyPassword
      };
    }
    
    console.log(`Using proxy: ${proxyHost}:${proxyPort}`);
  } else {
    console.log('No proxy configured, using direct connection');
  }

  try {
    const response = await axios(axiosConfig);
    return response.data;
  } catch (error) {
    console.error('Binance API Error:', error.response ? error.response.data : error.message);
    throw new Error(error.response ? JSON.stringify(error.response.data) : error.message);
  }
}

/**
 * Check current IP address
 */
async function checkIp() {
  try {
    console.log('\nChecking IP address...');
    
    // First with default connection
    const defaultConfig = {
      method: 'GET',
      url: 'https://api.ipify.org?format=json'
    };
    
    const defaultResponse = await axios(defaultConfig);
    console.log(`Default connection IP: ${defaultResponse.data.ip}`);
    
    // Now with proxy
    if (proxyHost && proxyPort) {
      const proxyConfig = {
        method: 'GET',
        url: 'https://api.ipify.org?format=json',
        proxy: {
          host: proxyHost,
          port: parseInt(proxyPort)
        }
      };
      
      // Add proxy auth if provided
      if (proxyUsername && proxyPassword) {
        proxyConfig.proxy.auth = {
          username: proxyUsername,
          password: proxyPassword
        };
      }
      
      try {
        const proxyResponse = await axios(proxyConfig);
        console.log(`Proxy connection IP: ${proxyResponse.data.ip}`);
        console.log(`Proxy working: ${defaultResponse.data.ip !== proxyResponse.data.ip ? 'YES' : 'NO'}`);
      } catch (error) {
        console.error('Error checking IP via proxy:', error.message);
      }
    }
    
    return defaultResponse.data.ip;
  } catch (error) {
    console.error('Error checking IP:', error.message);
    return null;
  }
}

/**
 * Test Binance API ping
 */
async function testPing() {
  try {
    console.log('\nTesting Binance API ping...');
    const result = await makeRequest('/api/v3/ping', {}, 'GET', 'PUBLIC');
    console.log('Ping successful:', result);
    return true;
  } catch (error) {
    console.error('Ping failed:', error.message);
    return false;
  }
}

/**
 * Test getting ticker price
 */
async function testTickerPrice() {
  try {
    console.log('\nTesting getting BTCUSDT ticker price...');
    const result = await makeRequest('/api/v3/ticker/price', { symbol: 'BTCUSDT' }, 'GET', 'PUBLIC');
    console.log('BTCUSDT price:', result);
    return result;
  } catch (error) {
    console.error('Failed to get ticker price:', error.message);
    return null;
  }
}

/**
 * Test getting account information
 */
async function testAccountInfo() {
  if (!apiKey || !apiSecret) {
    console.log('\nSkipping account info test - API keys not provided');
    return null;
  }
  
  try {
    console.log('\nTesting getting account info...');
    const result = await makeRequest('/api/v3/account');
    console.log('Account info retrieved successfully!');
    console.log(`- Account type: ${result.accountType}`);
    console.log(`- Can trade: ${result.canTrade}`);
    console.log(`- Number of balances: ${result.balances.length}`);
    return result;
  } catch (error) {
    console.error('Failed to get account info:', error.message);
    return null;
  }
}

/**
 * Main test function
 */
async function runTests() {
  console.log('======= BINANCE API PROXY TEST =======');
  console.log('Environment:');
  console.log(`- API Key: ${apiKey ? '✓ Set' : '✗ Not set'}`);
  console.log(`- Secret Key: ${apiSecret ? '✓ Set' : '✗ Not set'}`);
  console.log(`- Using Testnet: ${useTestnet ? 'Yes' : 'No'}`);
  console.log(`- Binance URL: ${baseUrl}`);
  console.log(`- Proxy Host: ${proxyHost || 'Not set'}`);
  console.log(`- Proxy Port: ${proxyPort || 'Not set'}`);
  console.log(`- Proxy Auth: ${proxyUsername && proxyPassword ? 'Yes' : 'No'}`);
  
  // Check IP addresses
  await checkIp();
  
  // Test Binance API
  const pingSuccessful = await testPing();
  
  if (pingSuccessful) {
    await testTickerPrice();
    await testAccountInfo();
  }
  
  console.log('\n======= TEST COMPLETE =======');
}

// Run the tests
runTests().catch(error => {
  console.error('Test failed with error:', error);
});