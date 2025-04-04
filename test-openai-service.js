/**
 * Test Script for OpenAI Service
 * 
 * This script tests the OpenAI initialization and API key retrieval to diagnose issues with the agent.
 */
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Testing OpenAI API Key initialization...');
console.log('OPENAI_API_KEY from env:', process.env.OPENAI_API_KEY ? 'Set (value hidden)' : 'Not set');

// Mock the openaiService.ts functionality
function initializeOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.error('OPENAI_API_KEY environment variable is not set');
    return null;
  }
  
  try {
    console.log('OpenAI API key initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize OpenAI API:', error);
    return null;
  }
}

const result = initializeOpenAI();
console.log('Initialization result:', result);

console.log('\nFull Environment Variables:');
Object.keys(process.env).forEach(key => {
  if (key.includes('OPENAI') || key.includes('API_KEY')) {
    console.log(`${key}: ${key === 'OPENAI_API_KEY' ? '[HIDDEN]' : process.env[key]}`);
  }
});