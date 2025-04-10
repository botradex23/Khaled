/**
 * Test OpenAI Connection Script
 * 
 * This script verifies that the OpenAI API integration is working correctly
 * within the autonomous agent system.
 */

const axios = require('axios');

// Verify OpenAI API key directly 
async function testDirectOpenAIConnection() {
  console.log('Testing direct connection to OpenAI API...');
  
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      console.error('❌ OPENAI_API_KEY environment variable is not set');
      return false;
    }
    
    console.log(`OpenAI API Key found (length: ${apiKey.length})`);
    console.log(`Key prefix: ${apiKey.slice(0, 5)}...`);
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a test assistant.' },
          { role: 'user', content: 'Respond with the text "OpenAI connection successful" if you receive this message.' }
        ],
        max_tokens: 50
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const message = response.data.choices[0]?.message?.content;
    console.log('OpenAI Response:', message);
    
    if (message && message.includes('OpenAI connection successful')) {
      console.log('✅ Direct OpenAI API connection verified successfully');
      return true;
    } else {
      console.log('❌ Unexpected response from OpenAI API');
      return false;
    }
  } catch (error) {
    console.error('❌ Error connecting directly to OpenAI API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Test via the autonomous agent API
async function testAgentOpenAIConnection() {
  console.log('\nTesting OpenAI connection through autonomous agent API...');
  
  try {
    // Simple code analysis request to test the agent's OpenAI integration
    const response = await axios.post(
      'http://localhost:5000/api/agent/api/analyze-code',
      {
        task: 'This is a test task to verify OpenAI integration',
        filePath: 'server/agent/openai-service.ts'
      }
    );
    
    console.log('API Response Status:', response.status);
    
    if (response.data && response.data.success) {
      console.log('Analysis result length:', response.data.analysis.length);
      console.log('Analysis excerpt:', response.data.analysis.substring(0, 100) + '...');
      console.log('✅ Agent API connection to OpenAI verified successfully');
      return true;
    } else {
      console.log('❌ Agent API returned error or unexpected response');
      console.log('Response:', response.data);
      return false;
    }
  } catch (error) {
    console.error('❌ Error connecting to agent API:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    return false;
  }
}

// Run both tests
async function runTests() {
  console.log('=== OPENAI CONNECTION VERIFICATION ===\n');
  
  // Test 1: Direct connection
  const directSuccess = await testDirectOpenAIConnection();
  
  // Test 2: Agent API connection
  let agentSuccess = false;
  if (directSuccess) {
    // Only test the agent API if direct connection works
    agentSuccess = await testAgentOpenAIConnection();
  }
  
  // Overall result
  console.log('\n=== TEST RESULTS ===');
  console.log('Direct OpenAI connection:', directSuccess ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Agent API OpenAI integration:', agentSuccess ? '✅ SUCCESS' : '❌ FAILED');
  
  if (directSuccess && agentSuccess) {
    console.log('\n✅ OVERALL: All OpenAI integration tests PASSED');
  } else {
    console.log('\n❌ OVERALL: Some OpenAI integration tests FAILED');
    
    // Suggestions for fixing issues
    if (!directSuccess) {
      console.log('\nSuggestions for fixing direct OpenAI connection:');
      console.log('1. Verify that the OPENAI_API_KEY environment variable is correctly set');
      console.log('2. Check that the API key is valid and has not expired');
      console.log('3. Ensure network connectivity to api.openai.com');
    }
    
    if (directSuccess && !agentSuccess) {
      console.log('\nSuggestions for fixing agent API OpenAI connection:');
      console.log('1. Make sure the Express server is running on port 5000');
      console.log('2. Verify that the agent API is correctly passing the API key to OpenAI');
      console.log('3. Check that the agent-controller.ts is correctly importing and using openai-service.ts');
    }
  }
}

// Run the tests
console.log('Starting OpenAI integration tests...');
runTests().catch(err => {
  console.error('Error running tests:', err);
});