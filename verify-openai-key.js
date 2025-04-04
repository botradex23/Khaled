/**
 * Verify OpenAI API Key availability in environment
 */

// Check if the OpenAI API key is set in the environment
const apiKey = process.env.OPENAI_API_KEY;
console.log('OPENAI_API_KEY present:', apiKey ? 'Yes (value hidden for security)' : 'No');

// Check all environment variables with names containing "OPENAI"
console.log('\nAll environment variables containing "OPENAI":');
Object.keys(process.env)
  .filter(key => key.includes('OPENAI'))
  .forEach(key => {
    console.log(`${key}: ${key === 'OPENAI_API_KEY' ? '[HIDDEN]' : process.env[key]}`);
  });

// Check environment loading mechanism
console.log('\nEnvironment loading check:');
try {
  const dotenv = require('dotenv');
  console.log('dotenv package is available');
  
  // Check if .env file exists
  const fs = require('fs');
  const envExists = fs.existsSync('.env');
  console.log('.env file exists:', envExists);

  // If it exists, check if it contains OPENAI_API_KEY
  if (envExists) {
    const envContent = fs.readFileSync('.env', 'utf8');
    const hasOpenAIKey = envContent.includes('OPENAI_API_KEY');
    console.log('.env file contains OPENAI_API_KEY:', hasOpenAIKey);
  }
} catch (error) {
  console.log('dotenv package not available or other error:', error.message);
}