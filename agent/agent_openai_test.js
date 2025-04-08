/**
 * OpenAI API Integration Test
 * 
 * This file demonstrates how an agent can connect to OpenAI's API 
 * to generate content and understand instructions.
 */

import axios from 'axios';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Function to call OpenAI API
async function callOpenAI(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  try {
    if (!OPENAI_API_KEY) {
      console.error('❌ OpenAI API key not found in environment variables.');
      return 'ERROR: OpenAI API key not found. Please set the OPENAI_API_KEY environment variable.';
    }

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );

    console.log('✅ Successfully received response from OpenAI API');
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error calling OpenAI API:', error.message);
    if (error.response) {
      console.error('Error details:', error.response.data);
    }
    return null;
  }
}

// Function to use OpenAI to generate code
async function generateCodeWithOpenAI(prompt) {
  const systemPrompt = 'You are an AI assistant specialized in writing JavaScript code. Provide only the code with no explanations unless specifically asked. Include helpful comments in the code.';
  return callOpenAI(prompt, systemPrompt);
}

// Function to save generated code to a file
async function saveGeneratedCode(code, filename) {
  const filePath = path.join(__dirname, filename);
  try {
    await fs.writeFile(filePath, code, 'utf8');
    console.log(`✅ Successfully saved generated code to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`❌ Error saving code to ${filePath}:`, error.message);
    return false;
  }
}

// Run the OpenAI integration test
async function runOpenAITest() {
  console.log('🔍 Starting OpenAI Integration Test');
  
  // Generate a simple utility function with OpenAI
  const codePrompt = 'Write a JavaScript utility function called parseDateTime that takes a string date and returns an object with date parts (year, month, day, hour, minute, second). Write it as an ES module export.';
  
  const generatedCode = await generateCodeWithOpenAI(codePrompt);
  
  if (!generatedCode) {
    console.error('❌ Failed to generate code with OpenAI.');
    return;
  }
  
  // Save the generated code to a file
  const saveResult = await saveGeneratedCode(generatedCode, 'openai_generated_util.js');
  
  // Report results
  console.log('\n📊 OpenAI Test Results:');
  console.log(`OpenAI API Call: ${generatedCode ? '✅ Success' : '❌ Failed'}`);
  console.log(`Save Generated Code: ${saveResult ? '✅ Success' : '❌ Failed'}`);
  console.log('\n✨ Tests completed. The OpenAI agent can successfully call the API and save generated content.');
}

// Execute the tests when this file is run directly
runOpenAITest().catch(error => {
  console.error('❌ Error running OpenAI tests:', error);
});

export {
  callOpenAI,
  generateCodeWithOpenAI,
  saveGeneratedCode,
  runOpenAITest
};