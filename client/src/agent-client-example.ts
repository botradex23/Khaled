/**
 * Agent Client Usage Example
 * 
 * This example demonstrates how to use the agent client to interact with
 * the OpenAI-powered agent functionality directly from code, bypassing
 * the Express routes and Vite middleware.
 */

import { agentClient } from './agent-client';

/**
 * Example 1: Get agent status
 */
async function demoGetStatus() {
  console.log('=== Demo: Get Agent Status ===');
  const status = agentClient.getStatus();
  console.log('Agent Status:', status);
  console.log('\n');
}

/**
 * Example 2: Verify OpenAI API key
 */
async function demoVerifyApiKey() {
  console.log('=== Demo: Verify OpenAI API Key ===');
  const keyResult = await agentClient.verifyOpenAIKey();
  console.log('API Key Verification Result:', keyResult);
  console.log('\n');
}

/**
 * Example 3: Get a chat response
 */
async function demoChatResponse() {
  console.log('=== Demo: Get Chat Response ===');
  const prompt = 'What features does the Tradeliy platform offer?';
  console.log(`Asking: "${prompt}"`);
  
  const response = await agentClient.getChatResponse(prompt);
  
  console.log('Chat Response:');
  if (response.success) {
    console.log(response.response);
  } else {
    console.log('Error:', response.message);
  }
  console.log('\n');
}

/**
 * Example 4: Smart Analyze and Edit
 */
async function demoSmartAnalyzeAndEdit() {
  console.log('=== Demo: Smart Analyze and Edit ===');
  const task = 'Find all files related to market data collection and explain how they work together';
  console.log(`Task: "${task}"`);
  
  const result = await agentClient.smartAnalyzeAndEdit(task);
  
  console.log('Analysis Result:');
  if (result.success) {
    console.log(JSON.stringify(result.result, null, 2));
  } else {
    console.log('Error:', result.message);
  }
  console.log('\n');
}

/**
 * Example 5: File Operation
 */
async function demoFileOperation() {
  console.log('=== Demo: File Operation (List Files) ===');
  const result = await agentClient.executeFileOperation('listFiles', { 
    directory: './src/services' 
  });
  
  console.log('Files in src/services:');
  if (result.success) {
    console.log(result.files);
  } else {
    console.log('Error:', result.message);
  }
  console.log('\n');
}

/**
 * Main function to run all demos
 */
async function runAllDemos() {
  console.log('=== AGENT CLIENT USAGE EXAMPLES ===\n');
  
  try {
    await demoGetStatus();
    await demoVerifyApiKey();
    await demoChatResponse();
    await demoSmartAnalyzeAndEdit();
    await demoFileOperation();
    
    console.log('=== ALL DEMOS COMPLETED SUCCESSFULLY ===');
  } catch (error: any) {
    console.error('Error running demos:', error.message);
  }
}

// To run this example: npx tsx src/agent-client-example.ts
// In ESM, we don't have access to require.main, so we'll run automatically
runAllDemos();

// Export functions for potential use in other modules
export {
  demoGetStatus,
  demoVerifyApiKey,
  demoChatResponse,
  demoSmartAnalyzeAndEdit,
  demoFileOperation,
  runAllDemos
};