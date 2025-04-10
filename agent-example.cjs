/**
 * Agent Client Usage Example (CommonJS)
 * 
 * This script demonstrates how to use the agent client from CommonJS code.
 */

// Import the agent client using CommonJS require
const { agentClient } = require('./agent-client.cjs');

/**
 * Example 1: Get agent status
 * This shows you the current state of the agent, including API key validity
 */
async function demoGetStatus() {
  console.log('=== Demo: Get Agent Status ===');
  const status = agentClient.getStatus();
  console.log('Agent Status:', status);
  console.log('\n');
}

/**
 * Example 2: Verify OpenAI API key
 * This checks if the configured OpenAI API key is valid
 */
async function demoVerifyApiKey() {
  console.log('=== Demo: Verify OpenAI API Key ===');
  const keyResult = await agentClient.verifyOpenAIKey();
  console.log('API Key Verification Result:', keyResult);
  console.log('\n');
}

/**
 * Example 3: Get a chat response
 * This demonstrates getting a natural language response from the agent
 */
async function demoChatResponse() {
  console.log('=== Demo: Get Chat Response ===');
  const prompt = 'What features does the Tradeliy platform offer?';
  console.log(`Asking: "${prompt}"`);
  
  const response = await agentClient.getChatResponse(prompt);
  
  if (response.success) {
    console.log('Chat Response:');
    console.log(response.response);
  } else {
    console.log('Error getting chat response:', response.message);
  }
  console.log('\n');
}

/**
 * Example 4: Smart Analyze and Edit
 * This demonstrates the agent's ability to analyze the codebase and provide insights
 */
async function demoSmartAnalyzeAndEdit() {
  console.log('=== Demo: Smart Analyze and Edit ===');
  const task = 'Find all files related to market data collection and explain how they work together';
  console.log(`Task: "${task}"`);
  
  const result = await agentClient.smartAnalyzeAndEdit(task);
  
  if (result.success) {
    console.log('Analysis Result:');
    console.log(JSON.stringify(result.result, null, 2));
  } else {
    console.log('Error performing analysis:', result.message);
  }
  console.log('\n');
}

/**
 * Example 5: File Operation
 * This demonstrates how to use the agent to list files in a directory
 */
async function demoFileOperation() {
  console.log('=== Demo: File Operation (List Files) ===');
  const result = await agentClient.executeFileOperation('listFiles', { 
    directory: './src/services' 
  });
  
  if (result.success) {
    console.log('Files in src/services:');
    console.log(result.files);
  } else {
    console.log('Error listing files:', result.message);
  }
  console.log('\n');
}

/**
 * Run all demos
 */
async function runAllDemos() {
  console.log('=== AGENT CLIENT USAGE EXAMPLES (CommonJS) ===\n');
  
  try {
    await demoGetStatus();
    await demoVerifyApiKey();
    await demoChatResponse();
    await demoSmartAnalyzeAndEdit();
    await demoFileOperation();
    
    console.log('=== ALL DEMOS COMPLETED SUCCESSFULLY ===');
  } catch (error) {
    console.error('Error running demos:', error);
  }
}

// Run the demos
runAllDemos();