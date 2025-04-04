/**
 * Test Direct Agent Standalone Server
 * 
 * This script tests the standalone direct agent server running on port 5002.
 */

import http from 'http';

const BASE_URL = {
  hostname: '0.0.0.0',
  port: 5002
};

/**
 * Make a request to the direct agent server
 */
async function makeRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL.hostname,
      port: BASE_URL.port,
      path: endpoint,
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Admin': 'true'
      }
    };
    
    const req = http.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        try {
          const body = Buffer.concat(chunks).toString();
          const data = JSON.parse(body);
          resolve(data);
        } catch (error) {
          console.error('Error parsing response:', error);
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error making request to ${endpoint}:`, error);
      reject(error);
    });
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    
    req.end();
  });
}

/**
 * Test the health endpoint
 */
async function testHealth() {
  console.log('Testing health endpoint...');
  const result = await makeRequest('/health');
  console.log('Health result:', result);
  return result;
}

/**
 * Test the validate OpenAI API key endpoint
 */
async function testValidateOpenAIKey() {
  console.log('Testing validate OpenAI API key endpoint...');
  const result = await makeRequest('/validate-openai-key');
  console.log('Validate OpenAI API key result:', result);
  return result;
}

/**
 * Test the chat endpoint
 */
async function testChat() {
  console.log('Testing chat endpoint...');
  const result = await makeRequest('/chat', 'POST', {
    prompt: 'Hello, how are you?',
    systemPrompt: 'You are a helpful assistant.'
  });
  console.log('Chat result:', result);
  return result;
}

/**
 * Test the list files endpoint
 */
async function testListFiles() {
  console.log('Testing list files endpoint...');
  const result = await makeRequest('/files', 'POST', {
    directory: '.'
  });
  console.log('List files result:', result);
  return result;
}

/**
 * Test the read file endpoint
 */
async function testReadFile() {
  console.log('Testing read file endpoint...');
  const result = await makeRequest('/read-file', 'POST', {
    filePath: 'package.json'
  });
  console.log('Read file result:', result);
  return result;
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting tests for direct agent standalone server...');
  
  try {
    await testHealth();
    await testValidateOpenAIKey();
    await testChat();
    await testListFiles();
    await testReadFile();
    
    console.log('All tests completed.');
  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests();