/**
 * Test script for direct agent chat endpoint
 * 
 * This script tests the direct agent chat endpoint that bypasses Vite middleware
 */

import axios from 'axios';

async function testDirectAgentChat() {
  try {
    console.log('Testing direct agent chat endpoint...');
    
    // First test the health check endpoint
    const healthResponse = await axios.get('http://localhost:5000/direct-check/agent-health-direct-check-123456789.json');
    console.log('Health check response:', healthResponse.data);
    
    if (!healthResponse.data.success) {
      console.error('Health check failed. Aborting test.');
      return;
    }
    
    // Test the validate OpenAI key endpoint
    const validateResponse = await axios.get('http://localhost:5000/direct-check/validate-openai-key-24680.json', {
      headers: {
        'X-Test-Admin': 'true'
      }
    });
    console.log('Validate key response:', validateResponse.data);
    
    if (!validateResponse.data.success) {
      console.error('OpenAI key validation failed. Aborting test.');
      return;
    }
    
    // Test the direct chat endpoint
    const chatResponse = await axios.post('http://localhost:5000/direct-check/agent-direct-chat-13579.json', 
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
    
  } catch (error) {
    console.error('Error testing direct agent chat:', error.message);
    
    // Show more detailed error information
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Headers:', error.response.headers);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received. Request:', error.request);
    }
  }
}

// Run the test
testDirectAgentChat();