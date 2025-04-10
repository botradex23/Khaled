/**
 * Direct API Test Client
 * 
 * This script directly tests the agent API endpoints, bypassing the Vite middleware
 * that's causing HTML responses instead of JSON.
 */

const fetch = require('node-fetch');

async function testApiEndpoint(endpoint) {
  try {
    console.log(`Testing API endpoint: ${endpoint}`);
    const response = await fetch(`http://localhost:5000${endpoint}`);
    const contentType = response.headers.get('content-type');
    
    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${contentType}`);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      return data;
    } else {
      const text = await response.text();
      console.log(`Non-JSON response (first 150 chars): ${text.substring(0, 150)}...`);
      return null;
    }
  } catch (error) {
    console.error(`Error testing ${endpoint}:`, error.message);
    return null;
  }
}

async function runTests() {
  console.log('===== API TEST CLIENT =====');
  console.log('Testing various API endpoints to diagnose routing issues');
  console.log('==============================\n');
  
  // Test basic health endpoint
  await testApiEndpoint('/api/health');
  console.log('\n');
  
  // Test agent status endpoint
  await testApiEndpoint('/api/agent/status');
  console.log('\n');
  
  // Test my-agent status endpoint
  await testApiEndpoint('/api/my-agent/status');
  console.log('\n');
  
  // Test market data endpoint
  await testApiEndpoint('/api/market-data');
  console.log('\n');
  
  console.log('===== TESTS COMPLETE =====');
}

// Run the tests
runTests();