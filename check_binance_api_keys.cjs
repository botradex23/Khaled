/**
 * Check Binance API keys directly
 * 
 * This script tests whether the Binance API keys from the .env file
 * can successfully connect to the Binance API through the proxies.
 */

const https = require('https');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load environment variables manually
function loadEnvVars() {
  try {
    const envContent = fs.readFileSync('.env', 'utf8');
    const envVars = {};
    
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim().startsWith('#') || !line.trim()) return;
      
      // Split by first equals sign
      const equalIndex = line.indexOf('=');
      if (equalIndex > 0) {
        const key = line.substring(0, equalIndex).trim();
        let value = line.substring(equalIndex + 1).trim();
        
        // Handle quoted values
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.substring(1, value.length - 1);
        }
        
        // Handle variable substitution like ${VAR}
        if (value.includes('${') && value.includes('}')) {
          const matches = value.match(/\${([^}]+)}/g);
          if (matches) {
            matches.forEach(match => {
              const varName = match.slice(2, -1);
              if (envVars[varName]) {
                value = value.replace(match, envVars[varName]);
              } else if (process.env[varName]) {
                value = value.replace(match, process.env[varName]);
              }
            });
          }
        }
        
        envVars[key] = value;
        
        // Set environment variable
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
    
    console.log('Environment variables loaded successfully');
    return true;
  } catch (error) {
    console.error('Error loading environment variables:', error.message);
    return false;
  }
}

loadEnvVars();

// API credentials from environment
let API_KEY = process.env.BINANCE_API_KEY;
let API_SECRET = process.env.BINANCE_SECRET_KEY;

// Proxy settings from environment
let PROXY_IP = process.env.PROXY_IP || process.env.NEW_PROXY_IP;
let PROXY_PORT = process.env.PROXY_PORT || process.env.NEW_PROXY_PORT;
let PROXY_USERNAME = process.env.PROXY_USERNAME || process.env.NEW_PROXY_USERNAME;
let PROXY_PASSWORD = process.env.PROXY_PASSWORD || process.env.NEW_PROXY_PASSWORD;
let USE_PROXY = process.env.USE_PROXY === 'true';
let USE_TESTNET = process.env.USE_TESTNET === 'true';

// API endpoints
const BASE_URL = USE_TESTNET 
  ? 'testnet.binance.vision' 
  : 'api.binance.com';

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    // Update variables from environment in case they were updated
    PROXY_IP = process.env.PROXY_IP || process.env.NEW_PROXY_IP;
    PROXY_PORT = process.env.PROXY_PORT || process.env.NEW_PROXY_PORT;
    PROXY_USERNAME = process.env.PROXY_USERNAME || process.env.NEW_PROXY_USERNAME;
    PROXY_PASSWORD = process.env.PROXY_PASSWORD || process.env.NEW_PROXY_PASSWORD;
    USE_PROXY = process.env.USE_PROXY === 'true';
    
    const options = {
      hostname: BASE_URL,
      path: url,
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': API_KEY
      }
    };
    
    if (USE_PROXY) {
      options.host = PROXY_IP;
      options.port = parseInt(PROXY_PORT);
      options.path = `http://${BASE_URL}${url}`;
      
      // Add proxy authentication if provided
      if (PROXY_USERNAME && PROXY_PASSWORD) {
        const auth = `${PROXY_USERNAME}:${PROXY_PASSWORD}`;
        const encoded = Buffer.from(auth).toString('base64');
        options.headers['Proxy-Authorization'] = `Basic ${encoded}`;
      }
      
      console.log(`Using proxy: ${PROXY_IP}:${PROXY_PORT}`);
    }
    
    const protocol = USE_PROXY ? http : https;
    
    const req = protocol.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Add a timeout of 5 seconds
    req.setTimeout(5000, () => {
      req.abort();
      reject(new Error('Request timed out after 5 seconds'));
    });
    
    req.end();
  });
}

// Check if API keys exist
function checkApiKeysExist() {
  if (!API_KEY || !API_SECRET) {
    console.error('❌ Binance API keys not found in environment variables');
    console.log('Please make sure BINANCE_API_KEY and BINANCE_SECRET_KEY are set in .env file');
    return false;
  }
  
  console.log('✅ Binance API keys found in environment variables');
  return true;
}

// Test connection to Binance
async function testConnectionToBinance() {
  try {
    console.log('\nTesting connection to Binance API...');
    const response = await makeRequest('/api/v3/ping');
    
    if (response.statusCode === 200) {
      console.log('✅ Successfully connected to Binance API');
      return true;
    } else if (response.statusCode === 451) {
      console.error('❌ Geographic Restriction Error (451)');
      console.log('This is expected when connecting from a restricted region. Proxy is needed.');
      return false;
    } else {
      console.error(`❌ Connection failed with status code: ${response.statusCode}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Connection failed with error:', error.message);
    return false;
  }
}

// Test proxy connection
async function testProxyConnection() {
  if (!USE_PROXY) {
    console.log('\nProxy is disabled. Skipping proxy test.');
    return null;
  }
  
  try {
    console.log('\nTesting proxy connection...');
    const response = await makeRequest('/api/v3/ping');
    
    if (response.statusCode === 200) {
      console.log(`✅ Successfully connected through proxy ${PROXY_IP}:${PROXY_PORT}`);
      return true;
    } else {
      console.error(`❌ Proxy connection failed with status code: ${response.statusCode}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Proxy connection failed with error:', error.message);
    return false;
  }
}

// Test a public endpoint
async function testPublicEndpoint() {
  try {
    console.log('\nTesting public endpoint (time)...');
    const response = await makeRequest('/api/v3/time');
    
    if (response.statusCode === 200 && response.data.serverTime) {
      const serverTime = new Date(response.data.serverTime);
      console.log(`✅ Binance server time: ${serverTime.toISOString()}`);
      return true;
    } else {
      console.error('❌ Public endpoint test failed');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Public endpoint test failed with error:', error.message);
    return false;
  }
}

// Verify Binance API keys
async function verifyBinanceApiKeys() {
  try {
    console.log('\nVerifying Binance API keys with account information request...');
    
    // Create timestamp and signature for authenticated request
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    const signature = crypto
      .createHmac('sha256', API_SECRET)
      .update(queryString)
      .digest('hex');
    
    const response = await makeRequest(`/api/v3/account?${queryString}&signature=${signature}`);
    
    if (response.statusCode === 200 && response.data.accountType) {
      console.log('✅ API keys are valid');
      console.log(`Account type: ${response.data.accountType}`);
      console.log(`Can trade: ${response.data.canTrade}`);
      console.log(`Can deposit: ${response.data.canDeposit}`);
      console.log(`Can withdraw: ${response.data.canWithdraw}`);
      return true;
    } else if (response.statusCode === 401) {
      console.error('❌ Invalid API keys (401 Unauthorized)');
      console.log('Response:', response.data);
      return false;
    } else {
      console.error(`❌ Verification failed with status code: ${response.statusCode}`);
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Verification failed with error:', error.message);
    return false;
  }
}

async function main() {
  console.log('🔑 Binance API Key Verification Tool');
  console.log('====================================');
  
  console.log(`Environment: ${USE_TESTNET ? 'TESTNET' : 'PRODUCTION'}`);
  console.log(`Proxy: ${USE_PROXY ? 'ENABLED' : 'DISABLED'}`);
  
  // Debug: print environment variables
  console.log('API Key:', API_KEY ? API_KEY.substring(0, 5) + '...' : 'undefined');
  console.log('Proxy IP:', PROXY_IP);
  console.log('Proxy Port:', PROXY_PORT);
  console.log('Proxy Username:', PROXY_USERNAME);
  console.log('Proxy Password:', PROXY_PASSWORD ? '****' : 'undefined');
  
  // Get environment variables from secrets
  if (!PROXY_IP || !PROXY_PORT) {
    console.log('Checking available secret environment variables...');
    console.log('NEW_PROXY_IP:', process.env.NEW_PROXY_IP);
    console.log('NEW_PROXY_PORT:', process.env.NEW_PROXY_PORT);
    console.log('NEW_PROXY_USERNAME:', process.env.NEW_PROXY_USERNAME);
    console.log('NEW_PROXY_PASSWORD:', process.env.NEW_PROXY_PASSWORD ? '****' : 'undefined');
  }
  
  // 1. Check if API keys exist
  if (!checkApiKeysExist()) {
    return;
  }
  
  // Try one of the working proxies that we verified earlier
  const WORKING_PROXIES = [
    { ip: '45.151.162.198', port: '6600', username: 'prjdumde', password: 'wt9fbfmhj43v' },
    { ip: '185.199.229.156', port: '7492', username: 'bbmlcqni', password: 'vkc3r9g1zyge' },
    { ip: '185.199.228.220', port: '7300', username: 'hrshxmge', password: 'khylv4s35d4z' },
    { ip: '161.123.152.115', port: '6360', username: 'xzwdlrlk', password: 'yrv2cpbyo1oa' }
  ];
  
  // Override proxy settings with first working proxy
  const workingProxy = WORKING_PROXIES[0];
  process.env.PROXY_IP = workingProxy.ip;
  process.env.PROXY_PORT = workingProxy.port;
  process.env.PROXY_USERNAME = workingProxy.username;
  process.env.PROXY_PASSWORD = workingProxy.password;
  
  console.log('Using known working proxy:', workingProxy.ip + ':' + workingProxy.port);
  
  // 2. Test connection to Binance
  const connectionResult = await testConnectionToBinance();
  
  // 3. Test proxy connection if enabled
  const proxyResult = USE_PROXY ? await testProxyConnection() : null;
  
  // 4. Test public endpoint
  const publicEndpointResult = await testPublicEndpoint();
  
  // 5. Verify API keys
  if (connectionResult && publicEndpointResult) {
    await verifyBinanceApiKeys();
  }
}

main().catch(console.error);