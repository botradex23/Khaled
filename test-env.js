/**
 * Test script to verify environment variables are being loaded correctly
 */
import 'dotenv/config';

console.log('== Environment Variable Test ==');
console.log('MONGO_URI exists:', !!process.env.MONGO_URI);
console.log('MONGO_URI length:', process.env.MONGO_URI ? process.env.MONGO_URI.length : 'N/A');
console.log('MONGO_URI starts with:', process.env.MONGO_URI ? process.env.MONGO_URI.substring(0, 20) + '...' : 'N/A');

// Check for MONGODB_URI (alternate spelling)
console.log('MONGODB_URI exists:', !!process.env.MONGODB_URI);

// List all environment variables that contain 'MONGO'
const mongoVars = Object.keys(process.env).filter(key => key.includes('MONGO'));
console.log('All MONGO* variables:', mongoVars);

// Check some other common environment variables to verify .env loading is working
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('NODE_ENV exists:', !!process.env.NODE_ENV);
console.log('NODE_ENV value:', process.env.NODE_ENV);