/**
 * Direct API Test Client
 * 
 * This script tests API endpoints on both the main server and the direct API server.
 */

// Using the built-in fetch API available in Node.js

async function testApiEndpoint(endpoint, port = 5000) {
  try {
    console.log(`Testing API endpoint on port ${port}: ${endpoint}`);
    const response = await fetch(`http://localhost:${port}${endpoint}`);
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
    console.error(`Error testing ${endpoint} on port ${port}:`, error.message);
    return null;
  }
}

async function runMainServerTests() {
  console.log('===== MAIN SERVER TESTS (PORT 5000) =====');
  console.log('Testing API endpoints on the main server with Vite middleware');
  console.log('=========================================\n');
  
  // Test basic health endpoint
  await testApiEndpoint('/api/health');
  console.log('\n');
  
  // Test agent status endpoint
  await testApiEndpoint('/api/agent/status');
  console.log('\n');
  
  // Test my-agent status endpoint
  await testApiEndpoint('/api/my-agent/status');
  console.log('\n');
}

async function runDirectApiServerTests() {
  console.log('===== DIRECT API SERVER TESTS (PORT 5002) =====');
  console.log('Testing API endpoints on the direct API server without Vite middleware');
  console.log('==============================================\n');
  
  // Test basic health endpoint
  await testApiEndpoint('/health', 5002);
  console.log('\n');
  
  // Test agent status endpoint
  await testApiEndpoint('/agent/status', 5002);
  console.log('\n');
  
  // Test my-agent status endpoint
  await testApiEndpoint('/my-agent/status', 5002);
  console.log('\n');
}

async function runTests() {
  // First test the main server
  await runMainServerTests();
  
  console.log('\n');
  
  // Then test the direct API server
  try {
    await runDirectApiServerTests();
  } catch (error) {
    console.error("Failed to test direct API server. Make sure it's running with 'node run-direct-api.js'");
    console.error(error.message);
  }
  
  console.log('\n===== TESTS COMPLETE =====');
}

// Run the tests
runTests();