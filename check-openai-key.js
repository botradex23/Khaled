// Simple script to check if OPENAI_API_KEY is available in environment
console.log('Checking environment variables...');
console.log('OPENAI_API_KEY present:', process.env.OPENAI_API_KEY ? 'Yes (value hidden)' : 'No');

// Show environment variables related to OpenAI
console.log('\nEnvironment variables related to OpenAI:');
Object.keys(process.env).forEach(key => {
  if (key.includes('OPENAI') || key.includes('API_KEY')) {
    console.log(`${key}: ${key === 'OPENAI_API_KEY' ? '[HIDDEN]' : process.env[key]}`);
  }
});