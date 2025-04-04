/**
 * OpenAI API Key Validation Test
 * 
 * This script tests if the OPENAI_API_KEY environment variable is set
 * and performs a small test request to validate it.
 */
require('dotenv').config();
const axios = require('axios');

async function checkOpenAIAPIKey() {
  console.log('==== OpenAI API Key Check ====');

  // Check if the key exists
  const apiKey = process.env.OPENAI_API_KEY;
  console.log('OPENAI_API_KEY present:', !!apiKey);
  
  if (!apiKey) {
    console.error('⛔ Error: OpenAI API key is not set in environment variables');
    console.log('Please make sure to set the OPENAI_API_KEY in your .env file');
    return false;
  }
  
  // Check if the key has a valid format (basic check)
  console.log('API key length:', apiKey.length);
  console.log('API key prefix:', apiKey.substring(0, 3) + '...');
  
  if (apiKey.length < 30) {
    console.error('⛔ Error: OpenAI API key appears to be invalid (too short)');
    return false;
  }
  
  // Try a simple API request to validate the key
  console.log('\nTesting API key with a minimal request...');
  
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    console.log('✅ API request successful!');
    console.log('Model:', response.data.model);
    console.log('Response:', response.data.choices[0].message.content);
    console.log('Finish reason:', response.data.choices[0].finish_reason);
    console.log('Usage:', JSON.stringify(response.data.usage, null, 2));
    
    return true;
  } catch (error) {
    console.error('⛔ API request failed:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('Error status:', error.response.status);
      console.error('Error data:', JSON.stringify(error.response.data, null, 2));
      
      if (error.response.data.error.type === 'invalid_request_error') {
        console.error('Invalid request error - check the API key format and permissions');
      } else if (error.response.data.error.type === 'insufficient_quota') {
        console.error('Quota exceeded - your API key has run out of credits');
      } else if (error.response.data.error.type === 'invalid_authentication') {
        console.error('Authentication error - your API key is invalid');
      }
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from OpenAI API');
      console.error('Request:', error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Error message:', error.message);
    }
    
    return false;
  }
}

checkOpenAIAPIKey().then((success) => {
  if (success) {
    console.log('\n✅✅✅ OpenAI API key is valid and working! ✅✅✅');
  } else {
    console.log('\n❌❌❌ OpenAI API key validation failed! ❌❌❌');
  }
});