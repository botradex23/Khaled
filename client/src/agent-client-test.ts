/**
 * Agent Client Test (TypeScript Version)
 * 
 * This script tests the AgentClient methods using the direct file operations endpoints.
 */

import { agentClient } from './agent-client';

// Test file paths and content
const TEST_FILE_PATH = 'agent_ts_test_output.txt';
const TEST_FILE_CONTENT = `Hello from TypeScript Agent Client! ${new Date().toISOString()}`;

/**
 * Test getting the agent status
 */
async function testAgentStatus() {
  try {
    const result = await agentClient.getStatus();
    console.log('✅ Agent API Status:', result);
    return result.status === 'ok';
  } catch (error: any) {
    console.error('❌ Agent API status check failed:', error.message);
    return false;
  }
}

/**
 * Test writing a file
 */
async function testWriteFile() {
  try {
    const result = await agentClient.writeFile(TEST_FILE_PATH, TEST_FILE_CONTENT);
    console.log('✅ Write file result:', result);
    return result.success;
  } catch (error: any) {
    console.error('❌ Write file test failed:', error.message);
    return false;
  }
}

/**
 * Test reading a file
 */
async function testReadFile() {
  try {
    const result = await agentClient.readFile(TEST_FILE_PATH);
    console.log('✅ Read file result:', result);
    
    if (result.content === TEST_FILE_CONTENT) {
      console.log('✅ File content matches what was written');
    } else {
      console.log('❌ File content does not match!');
      console.log('Expected:', TEST_FILE_CONTENT);
      console.log('Received:', result.content);
    }
    
    return result.success;
  } catch (error: any) {
    console.error('❌ Read file test failed:', error.message);
    return false;
  }
}

/**
 * Test listing files
 */
async function testListFiles() {
  try {
    const result = await agentClient.listFiles('.');
    console.log('✅ List files result (showing first 5 files):');
    const first5Files = result.files.slice(0, 5);
    console.table(first5Files);
    return result.success;
  } catch (error: any) {
    console.error('❌ List files test failed:', error.message);
    return false;
  }
}

/**
 * Run all tests in sequence
 */
async function runTests() {
  console.log('🚀 Starting TypeScript Agent Client Tests');
  
  // First check if agent API is available
  const statusOk = await testAgentStatus();
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