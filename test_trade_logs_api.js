/**
 * Test script for verifying the Trade Logs API endpoints
 * This script tests all the direct API endpoints we've implemented
 */

// Using the global fetch API available in Node.js

// Configuration
// Using the Replit URL for testing
const API_BASE_URL = 'https://19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev/api/trade-logs';
const DEBUG = true;

// Utility function to log debug messages
function log(message) {
  if (DEBUG) {
    console.log(`[${new Date().toISOString()}] ${message}`);
  }
}

/**
 * Make a request to the API
 * @param {string} endpoint - The API endpoint to call
 * @param {object} options - Additional fetch options
 * @returns {Promise<object>} The API response
 */
async function makeRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  log(`Making ${options.method || 'GET'} request to ${url}`);
  
  try {
    // Ensure content-type header is set for POST/PATCH requests
    if (options.method === 'POST' || options.method === 'PATCH') {
      options.headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      };
    }
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    // First check if the response is OK
    if (!response.ok) {
      const text = await response.text();
      log(`Error response: ${response.status} ${response.statusText}`);
      log(`Response body: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
      throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
    }
    
    // Try to parse as JSON
    let data;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      log(`Received non-JSON response: ${contentType}`);
      log(`Response body: ${text.substring(0, 500)}${text.length > 500 ? '...' : ''}`);
      throw new Error('Response is not JSON');
    }
    
    // Log the response status and data
    log(`Response status: ${response.status}`);
    log(`Response: ${JSON.stringify(data, null, 2).substring(0, 500)}${JSON.stringify(data).length > 500 ? '...' : ''}`);
    
    return { status: response.status, data };
  } catch (error) {
    log(`Error making request to ${url}: ${error.message}`);
    throw error;
  }
}

/**
 * Test creating a new trade log
 */
async function testCreateTradeLog() {
  log('=== Testing Create Trade Log ===');
  
  const payload = {
    symbol: 'BTCUSDT',
    action: 'BUY',
    entry_price: '69000.50',
    quantity: '0.1',
    trade_source: 'TEST_API',
    predicted_confidence: '0.85',
    status: 'EXECUTED',
    reason: 'Test API call'
  };
  
  const { status, data } = await makeRequest('', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  
  if (status === 201) {
    log('✅ Successfully created trade log');
    return data;
  } else {
    log('❌ Failed to create trade log');
    return null;
  }
}

/**
 * Test getting all trade logs
 */
async function testGetAllTradeLogs() {
  log('=== Testing Get All Trade Logs ===');
  
  const { status, data } = await makeRequest('');
  
  if (status === 200) {
    log(`✅ Successfully retrieved ${data.length} trade logs`);
  } else {
    log('❌ Failed to get trade logs');
  }
  
  return data;
}

/**
 * Test getting a trade log by ID
 */
async function testGetTradeLogById(id) {
  log(`=== Testing Get Trade Log by ID: ${id} ===`);
  
  const { status, data } = await makeRequest(`/${id}`);
  
  if (status === 200) {
    log('✅ Successfully retrieved trade log by ID');
  } else {
    log('❌ Failed to get trade log by ID');
  }
  
  return data;
}

/**
 * Test getting trade logs by symbol
 */
async function testGetTradeLogsBySymbol(symbol) {
  log(`=== Testing Get Trade Logs by Symbol: ${symbol} ===`);
  
  const { status, data } = await makeRequest(`/symbol/${symbol}`);
  
  if (status === 200) {
    log(`✅ Successfully retrieved ${data.length} trade logs for symbol ${symbol}`);
  } else {
    log('❌ Failed to get trade logs by symbol');
  }
  
  return data;
}

/**
 * Test getting trade logs by source
 */
async function testGetTradeLogsBySource(source) {
  log(`=== Testing Get Trade Logs by Source: ${source} ===`);
  
  const { status, data } = await makeRequest(`/source/${source}`);
  
  if (status === 200) {
    log(`✅ Successfully retrieved ${data.length} trade logs for source ${source}`);
  } else {
    log('❌ Failed to get trade logs by source');
  }
  
  return data;
}

/**
 * Test searching trade logs
 */
async function testSearchTradeLogs(params) {
  log('=== Testing Search Trade Logs ===');
  
  // Convert the params object to query string
  const queryString = Object.entries(params)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&');
  
  const { status, data } = await makeRequest(`/search?${queryString}`);
  
  if (status === 200) {
    log(`✅ Successfully searched trade logs. Found ${data.length} results.`);
  } else {
    log('❌ Failed to search trade logs');
  }
  
  return data;
}

/**
 * Test updating a trade log
 */
async function testUpdateTradeLog(id, updates) {
  log(`=== Testing Update Trade Log: ${id} ===`);
  
  const { status, data } = await makeRequest(`/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
  
  if (status === 200) {
    log('✅ Successfully updated trade log');
  } else {
    log('❌ Failed to update trade log');
  }
  
  return data;
}

/**
 * Run all tests in sequence
 */
async function runTests() {
  try {
    // First create a new trade log
    const createdLog = await testCreateTradeLog();
    
    if (!createdLog) {
      throw new Error('Failed to create a trade log, cannot continue testing');
    }
    
    // Get the ID of the created log for further tests
    const logId = createdLog.id;
    
    // Get all trade logs
    await testGetAllTradeLogs();
    
    // Get the trade log by ID
    await testGetTradeLogById(logId);
    
    // Get trade logs by symbol
    await testGetTradeLogsBySymbol('BTCUSDT');
    
    // Get trade logs by source
    await testGetTradeLogsBySource('TEST_API');
    
    // Search trade logs
    await testSearchTradeLogs({
      symbol: 'BTCUSDT',
      source: 'TEST_API'
    });
    
    // Update the trade log
    await testUpdateTradeLog(logId, {
      status: 'UPDATED',
      reason: 'Updated via API test'
    });
    
    // Verify the update by getting the trade log again
    await testGetTradeLogById(logId);
    
    log('🎉 All tests completed successfully!');
  } catch (error) {
    log(`❌ Error running tests: ${error.message}`);
  }
}

// Run the tests
runTests();