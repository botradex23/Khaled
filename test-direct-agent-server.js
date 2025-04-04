/**
 * Test Direct Agent Server
 * 
 * This script tests the standalone direct agent server
 */

import axios from 'axios';

const SERVER_URL = 'http://localhost:5002';

async function testDirectAgentServer() {
  try {
    console.log('Testing direct agent server...');
    
    // Test health endpoint
    console.log('\nTesting health endpoint...');
    const healthResponse = await axios.get(`${SERVER_URL}/health`);
    console.log('Health response:', healthResponse.data);
    
    // Test OpenAI key validation endpoint
    console.log('\nTesting OpenAI key validation endpoint...');
    const validateResponse = await axios.get(`${SERVER_URL}/validate-openai-key`, {
      headers: {
        'X-Test-Admin': 'true'
      }
    });
    console.log('Validate response:', validateResponse.data);
    
    // Test chat endpoint
    console.log('\nTesting chat endpoint...');
    const chatResponse = await axios.post(`${SERVER_URL}/chat`, 
      {
        prompt: 'Say hello and tell me what you can do in 1-2 sentences',
        systemPrompt: 'You are a helpful AI assistant for a cryptocurrency trading platform.'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        }
      }
    );
    console.log('Chat response success:', chatResponse.data.success);
    console.log('Chat response message:', chatResponse.data.response);
    
    // Test list files endpoint
    console.log('\nTesting list files endpoint...');
    const filesResponse = await axios.post(`${SERVER_URL}/files`,
      {
        directory: '.'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        }
      }
    );
    console.log('Files response success:', filesResponse.data.success);
    console.log('Number of files found:', filesResponse.data.files.length);
    
    // Test read file endpoint
    console.log('\nTesting read file endpoint...');
    const readFileResponse = await axios.post(`${SERVER_URL}/read-file`,
      {
        filePath: 'direct-agent-server.js'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Test-Admin': 'true'
        }
      }
    );
    console.log('Read file response success:', readFileResponse.data.success);
    console.log('File content length:', readFileResponse.data.content.length);
    
    console.log('\nAll tests completed successfully!');
  } catch (error) {
    console.error('Error testing direct agent server:', error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Is the server running?');
    }
  }
}

// Run the test
testDirectAgentServer();