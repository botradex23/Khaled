/**
 * OpenAI Agent - File Operation Example
 * 
 * This script shows how to use the OpenAI agent to perform the file operations
 * as per the requirements:
 * 1. Create a new test file called agent_test_output.txt
 * 2. Write "Hello from the OpenAI agent!" to the file
 * 3. Read the contents back and confirm they were saved correctly
 * 
 * Note: This example assumes the agent-terminal-server.js is running on port 5002.
 * For a direct test without server dependency, use direct-file-test.js instead.
 */

import fetch from 'node-fetch';

// Configuration
const SERVER_URL = 'http://localhost:5002';
const TEST_FILE_PATH = 'agent_test_output2.txt';
const TEST_CONTENT = 'Hello from the OpenAI agent!';

// Make API requests to the agent server
async function makeRequest(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Admin': 'true'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  try {
    const response = await fetch(`${SERVER_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error making request to ${endpoint}:`, error);
    throw error;
  }
}

// Check if the server is running
async function checkServerStatus() {
  try {
    const response = await makeRequest('/health');
    console.log('Server status:', response.status);
    return true;
  } catch (error) {
    console.error('Server is not running:', error.message);
    console.error('Please start the agent-terminal-server.js first.');
    return false;
  }
}

// Step 1 & 2: Create a file with content
async function createFileWithContent() {
  console.log(`\nCreating file "${TEST_FILE_PATH}" with content:`);
  console.log(`"${TEST_CONTENT}"`);
  
  const response = await makeRequest('/agent-file-operation', 'POST', {
    action: 'writeFile',
    filePath: TEST_FILE_PATH,
    content: TEST_CONTENT
  });
  
  console.log('Response:', response);
  return response.success;
}

// Step 3: Read the file content
async function readFileContent() {
  console.log(`\nReading content from file "${TEST_FILE_PATH}":`);
  
  const response = await makeRequest('/agent-file-operation', 'POST', {
    action: 'readFile',
    filePath: TEST_FILE_PATH
  });
  
  if (response.success) {
    console.log('File content:', response.content);
    
    // Verify the content matches what we wrote
    if (response.content === TEST_CONTENT) {
      console.log('✅ Content verification passed!');
      return true;
    } else {
      console.log('❌ Content verification failed!');
      console.log(`Expected: "${TEST_CONTENT}"`);
      console.log(`Actual: "${response.content}"`);
      return false;
    }
  } else {
    console.error('Failed to read file:', response.message);
    return false;
  }
}

// Run all the steps
async function runTest() {
  console.log('======================================');
  console.log('OpenAI Agent File Operation Test');
  console.log('======================================');
  
  // Step 0: Check if the server is running
  const serverRunning = await checkServerStatus();
  if (!serverRunning) {
    return;
  }
  
  try {
    // Step 1 & 2: Create file with content
    const fileCreated = await createFileWithContent();
    
    if (fileCreated) {
      // Step 3: Read and verify file content
      const contentVerified = await readFileContent();
      
      console.log('\n======================================');
      console.log('Test Result:', contentVerified ? '✅ PASSED' : '❌ FAILED');
      console.log('======================================');
    } else {
      console.error('Failed to create file');
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
runTest();