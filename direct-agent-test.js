/**
 * Direct Agent Client Test
 * 
 * This script tests the direct file operations implemented in the integrated-agent-routes.ts file.
 * It verifies reading, writing, and listing files through the API endpoints.
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Base URL for agent API
const API_BASE_URL = 'http://localhost:5000/api/agent';

// Test file paths and content
const TEST_FILE_PATH = 'agent_test_output.txt';
const TEST_FILE_CONTENT = 'Hello from the Direct Agent Client! ' + new Date().toISOString();

// Helper function to make API requests
async function makeRequest(endpoint, method = 'GET', data = null) {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const options = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    
    if (data) {
      options.data = data;
    }
    
    console.log(`Making ${method} request to ${url}`);
    const response = await axios(options);
    return response.data;
  } catch (error) {
    console.error('API request error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

// Check the status of the agent API
async function checkAgentStatus() {
  try {
    const result = await makeRequest('/status');
    console.log('✅ Agent API Status:', result);
    return result.status === 'ok';
  } catch (error) {
    console.error('❌ Agent API status check failed:', error.message);
    return false;
  }
}

// Test writing a file
async function testWriteFile() {
  try {
    const result = await makeRequest('/api/direct-write-file', 'POST', {
      path: TEST_FILE_PATH,
      content: TEST_FILE_CONTENT
    });
    
    console.log('✅ Write file result:', result);
    return result.success;
  } catch (error) {
    console.error('❌ Write file test failed:', error.message);
    return false;
  }
}

// Test reading a file
async function testReadFile() {
  try {
    const result = await makeRequest(`/api/direct-read-file?path=${TEST_FILE_PATH}`);
    
    console.log('✅ Read file result:', result);
    if (result.content === TEST_FILE_CONTENT) {
      console.log('✅ File content matches what was written');
    } else {
      console.log('❌ File content does not match!');
      console.log('Expected:', TEST_FILE_CONTENT);
      console.log('Received:', result.content);
    }
    
    return result.success;
  } catch (error) {
    console.error('❌ Read file test failed:', error.message);
    return false;
  }
}

// Test listing files in a directory
async function testListFiles() {
  try {
    const result = await makeRequest('/api/direct-list-files?directory=.');
    
    console.log('✅ List files result (showing first 5 files):');
    const first5Files = result.files.slice(0, 5);
    console.table(first5Files);
    
    return result.success;
  } catch (error) {
    console.error('❌ List files test failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting Direct Agent Client Tests');
  
  // First check if agent API is available
  const statusOk = await checkAgentStatus();
  if (!statusOk) {
    console.error('❌ Agent API not available. Please start the server first.');
    return;
  }
  
  // Run the tests in sequence
  console.log('\n🔍 Testing file write operation');
  const writeSuccess = await testWriteFile();
  
  if (writeSuccess) {
    console.log('\n🔍 Testing file read operation');
    await testReadFile();
  }
  
  console.log('\n🔍 Testing directory listing operation');
  await testListFiles();
  
  console.log('\n🎉 Tests completed!');
}

// Execute the tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
});