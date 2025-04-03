/**
 * MongoDB Status API Endpoints Test
 * 
 * This script tests all the MongoDB status API endpoints to verify their functionality.
 * It checks each endpoint individually and provides a summary of the results.
 */

import axios from 'axios';

// Base URL for the API
const BASE_URL = 'http://localhost:5000';

// List of all MongoDB status endpoints to test
const endpoints = [
  { path: '/api/mongodb-status', name: 'Main MongoDB Status' },
  { path: '/api/mongodb/status', name: 'Dedicated MongoDB Status' },
  { path: '/api/mongodb/detailed-status', name: 'Detailed MongoDB Status' },
  { path: '/api/mongodb-status-direct-check.json', name: 'Direct MongoDB Status Check' },
  { path: '/api/database/status', name: 'Database Status' }
];

/**
 * Tests a specific endpoint and returns the result
 * 
 * @param {string} url - The endpoint URL to test
 * @param {string} name - The name of the endpoint
 * @returns {Object} The test result
 */
async function testEndpoint(url, name) {
  console.log(`Testing ${name} endpoint: ${url}`);
  
  try {
    // Make the request
    const response = await axios.get(url, {
      validateStatus: false, // Allow any status code
      timeout: 10000 // 10 second timeout
    });
    
    // Check the response
    const result = {
      endpoint: name,
      url,
      status: response.status,
      statusText: response.statusText,
      time: new Date().toISOString(),
      success: response.status >= 200 && response.status < 300,
      data: response.data,
      isConnected: response.data?.connected || 
                  response.data?.status?.connected || 
                  response.data?.mongodb?.connected ||
                  false,
      globalFlagStatus: response.data?.globalFlagStatus !== undefined 
                        ? response.data.globalFlagStatus 
                        : 'Not reported'
    };
    
    console.log(`  Status: ${result.status} ${result.statusText}`);
    console.log(`  Connected: ${result.isConnected}`);
    console.log(`  Global flag: ${result.globalFlagStatus}`);
    
    return result;
  } catch (error) {
    console.error(`  Error testing ${name}: ${error.message}`);
    
    return {
      endpoint: name,
      url,
      success: false,
      error: error.message,
      time: new Date().toISOString(),
      isConnected: false,
      globalFlagStatus: 'Error'
    };
  }
}

/**
 * Main test function that tests all endpoints
 */
async function runTests() {
  console.log('=== MongoDB Status API Endpoints Test ===');
  console.log(`Started at ${new Date().toISOString()}`);
  console.log('');
  
  const results = [];
  
  // Test each endpoint
  for (const endpoint of endpoints) {
    const result = await testEndpoint(`${BASE_URL}${endpoint.path}`, endpoint.name);
    results.push(result);
    console.log(''); // Add a blank line between tests
  }
  
  // Print summary
  console.log('=== Test Summary ===');
  console.log(`Total endpoints tested: ${results.length}`);
  
  const successful = results.filter(r => r.success).length;
  const connected = results.filter(r => r.isConnected).length;
  
  console.log(`Successful responses: ${successful}/${results.length}`);
  console.log(`Connected endpoints: ${connected}/${results.length}`);
  
  // Check if all endpoints report the same connection status
  const allSameStatus = results.every(r => r.isConnected === results[0].isConnected);
  
  if (allSameStatus) {
    console.log(`All endpoints report the same connection status: ${results[0].isConnected}`);
  } else {
    console.log('WARNING: Endpoints report inconsistent connection status!');
    results.forEach(r => {
      console.log(`  ${r.endpoint}: ${r.isConnected}`);
    });
  }
  
  // Check global flag reporting
  const endpointsWithGlobalFlag = results.filter(r => r.globalFlagStatus !== 'Not reported' && r.globalFlagStatus !== 'Error');
  
  if (endpointsWithGlobalFlag.length > 0) {
    const allSameGlobalFlag = endpointsWithGlobalFlag.every(r => r.globalFlagStatus === endpointsWithGlobalFlag[0].globalFlagStatus);
    
    if (allSameGlobalFlag) {
      console.log(`All endpoints with global flag report the same status: ${endpointsWithGlobalFlag[0].globalFlagStatus}`);
    } else {
      console.log('WARNING: Endpoints report inconsistent global flag status!');
      endpointsWithGlobalFlag.forEach(r => {
        console.log(`  ${r.endpoint}: ${r.globalFlagStatus}`);
      });
    }
  } else {
    console.log('No endpoints report global flag status');
  }
  
  console.log('');
  console.log(`Test completed at ${new Date().toISOString()}`);
}

// Run the tests
runTests().catch(error => {
  console.error('Error running tests:', error);
});