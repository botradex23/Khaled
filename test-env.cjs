/**
 * Test script to verify environment variables are being loaded correctly
 * Using CommonJS format (.cjs)
 */

console.log('== Environment Variable Test - Node.js Process Environment ==');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 'N/A');
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);

// List environment variables that contain MONGO
const mongoVars = Object.keys(process.env).filter(key => key.includes('MONGO'));
console.log('Mongo-related variables:', mongoVars);

// List all environment variables
console.log('All environment variables:');
Object.keys(process.env)
  .filter(key => !key.includes('KEY') && !key.includes('SECRET') && !key.includes('PASSWORD'))
  .forEach(key => {
    console.log(`- ${key}: ${key.includes('URI') ? process.env[key].substring(0, 15) + '...' : 'Value exists'}`);
  });