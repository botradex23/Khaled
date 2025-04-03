/**
 * MongoDB Status Route Test
 * 
 * This script tests the three MongoDB status routes directly:
 * 1. /api/database/status (should already be working correctly)
 * 2. /api/mongodb/status (dynamic import route, may be failing)
 * 3. /api/mongodb-status-direct (direct require route, may be failing)
 */

import * as http from 'http';

// Simple function to make a GET request to an endpoint
async function testEndpoint(endpoint) {
  return new Promise((resolve, reject) => {
    console.log(`Testing endpoint: ${endpoint}...`);
    
    const options = {
      hostname: 'localhost',
      port: 5000, // The port the server is running on
      path: endpoint,
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
    };
    
    const req = http.request(options, (res) => {
      const contentType = res.headers['content-type'] || '';
      console.log(`Content-Type: ${contentType}`);
      console.log(`Status Code: ${res.statusCode}`);
      
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        // Check if content type contains json
        const isJsonResponse = contentType.includes('application/json');
        console.log(`Is JSON Response: ${isJsonResponse}`);
        
        // Try to parse as JSON if it's supposed to be JSON
        if (isJsonResponse) {
          try {
            const jsonResponse = JSON.parse(responseData);
            console.log('Response parsed as JSON successfully');
            resolve({
              success: true,
              statusCode: res.statusCode,
              contentType,
              isJsonResponse,
              data: jsonResponse
            });
          } catch (error) {
            console.error('Failed to parse JSON response:', error);
            resolve({
              success: false,
              statusCode: res.statusCode,
              contentType,
              isJsonResponse: false,
              error: 'JSON parse error',
              rawResponse: responseData.slice(0, 200) + '...' // Truncate long responses
            });
          }
        } else {
          // Handle non-JSON response
          console.log('Non-JSON response received');
          resolve({
            success: false,
            statusCode: res.statusCode,
            contentType,
            isJsonResponse: false,
            rawResponse: responseData.slice(0, 200) + '...' // Truncate long responses
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Request error: ${error.message}`);
      reject(error);
    });
    
    req.end();
  });
}

// Test all three endpoints
async function runTests() {
  console.log('===== MongoDB Status Route Test =====');
  
  try {
    // Test the working route first
    console.log('\n1. Testing /api/database/status (should work):');
    const dbResult = await testEndpoint('/api/database/status');
    console.log('Result:', JSON.stringify(dbResult, null, 2));
    
    // Test the dynamic import route
    console.log('\n2. Testing /api/mongodb/status (may fail):');
    const mongodbResult = await testEndpoint('/api/mongodb/status');
    console.log('Result:', JSON.stringify(mongodbResult, null, 2));
    
    // Test the direct require route
    console.log('\n3. Testing /api/mongodb-status-direct (may fail):');
    const directResult = await testEndpoint('/api/mongodb-status-direct');
    console.log('Result:', JSON.stringify(directResult, null, 2));
    
    console.log('\n===== All tests completed =====');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runTests();