/**
 * Direct test for OpenAI API key
 * 
 * This script directly tests the OpenAI API key without using Express.
 * It's a standalone test script to diagnose issues with the OpenAI API key.
 */

import axios from 'axios';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

// Load .env file manually
try {
  const dotenvContent = readFileSync('./.env', 'utf-8');
  dotenvContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, ...values] = line.split('=');
      if (key && values.length) {
        process.env[key.trim()] = values.join('=').trim();
      }
    }
  });
  console.log('Loaded environment variables from .env file');
} catch (error) {
  console.log('No .env file found or error reading it, using existing environment variables');
}

async function testOpenAIApiKey() {
  try {
    console.log('Testing OpenAI API key');
    
    // Check if key exists
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY environment variable is not set');
      console.log('Available environment variables:', Object.keys(process.env).join(', '));
      return false;
    }
    
    console.log(`API key found with length: ${apiKey.length}, starts with: ${apiKey.substring(0, 3)}...`);
    
    // Try a simple API call
    console.log('Making test request to OpenAI API...');
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 10,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('OpenAI API response:', response.data);
    console.log('Test successful! The OpenAI API key is valid and working.');
    return true;
  } catch (error) {
    console.error('Error testing OpenAI API key:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Response error data:', error.response.data);
      console.error('Response status:', error.response.status);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from OpenAI API');
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    return false;
  }
}

// Run the test
testOpenAIApiKey().then(success => {
  if (!success) {
    console.log('OpenAI API key test failed. Please check the logs above for details.');
    process.exit(1);
  }
});