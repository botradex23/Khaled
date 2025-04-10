/**
 * Agent API Client Test
 * 
 * This script tests the direct agent API client functionality
 * without relying on Express routes or Vite middleware.
 */

import { agentApiClient } from './src/agent-api-client';

async function testAgentClient() {
  console.log('===== AGENT API CLIENT TEST =====');
  console.log('Testing direct access to agent controller functionality');
  console.log('=================================\n');
  
  // Test getStatus
  console.log('Testing getStatus()...');
  const status = agentApiClient.getStatus();
  console.log('Status result:', JSON.stringify(status, null, 2));
  console.log('\n');
  
  // Test verifyOpenAIKey
  console.log('Testing verifyOpenAIKey()...');
  const keyStatus = await agentApiClient.verifyOpenAIKey();
  console.log('OpenAI Key Status:', JSON.stringify(keyStatus, null, 2));
  console.log('\n');
  
  // Test getChatResponse
  console.log('Testing getChatResponse()...');
  const chatResponse = await agentApiClient.getChatResponse('Hello, who are you?');
  console.log('Chat Response:', JSON.stringify({
    success: chatResponse.success,
    message: chatResponse.message ? chatResponse.message : 'Success',
    responseLength: chatResponse.response ? chatResponse.response.length : 0
  }, null, 2));
  console.log('\n');
  
  // Test smart analyze and edit
  console.log('Testing smartAnalyzeAndEdit()...');
  const smartEditResponse = await agentApiClient.smartAnalyzeAndEdit(
    'What files handle market data collection in this project?'
  );
  console.log('Smart Analyze Response:', JSON.stringify({
    success: smartEditResponse.success,
    message: smartEditResponse.message ? smartEditResponse.message : 'Success',
    responseLength: smartEditResponse.result ? JSON.stringify(smartEditResponse.result).length : 0
  }, null, 2));
  
  console.log('\n===== TEST COMPLETE =====');
}

// Run the tests
testAgentClient().catch(error => {
  console.error('Error running tests:', error.message);
});