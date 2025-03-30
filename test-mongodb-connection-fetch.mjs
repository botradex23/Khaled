// Test MongoDB Atlas connection using the Data API
// This requires the Data API to be enabled in your MongoDB Atlas cluster
import { Buffer } from 'buffer';

// Construct the Data API URL and app ID (based on your MongoDB Atlas configuration)
// You need to replace these with your actual values
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://Khaleddd:Khaled123.@cluster0.rh8kusi.mongodb.net/Binance_apis?retryWrites=true&w=majority&appName=Cluster0';

// Extract credentials from URI
function extractCredentials(uri) {
  try {
    // Extract username and password
    const match = uri.match(/mongodb\+srv:\/\/([^:]+):([^@]+)@/);
    if (match) {
      return {
        username: match[1],
        password: match[2],
        host: uri.match(/@([^\/]+)\//)[1],
        database: uri.match(/\/([^\?]+)/)[1]
      };
    }
    return null;
  } catch (err) {
    console.error('Error parsing MongoDB URI:', err);
    return null;
  }
}

// Simple function to test HTTP connection to MongoDB Atlas
async function testAtlasConnection() {
  const credentials = extractCredentials(MONGODB_URI);
  
  if (!credentials) {
    console.error('Failed to parse MongoDB URI');
    return;
  }
  
  console.log('Extracted connection details:');
  console.log('- Username:', credentials.username);
  console.log('- Password:', '*'.repeat(credentials.password.length));
  console.log('- Host:', credentials.host);
  console.log('- Database:', credentials.database);
  
  // Try to connect to MongoDB Atlas admin API (just to test connectivity)
  try {
    // Note: This is a basic HTTP request to Atlas to test network connectivity
    // It won't actually authenticate with your database
    const atlasHost = `https://${credentials.host}`;
    console.log(`Testing network connectivity to: ${atlasHost}`);
    
    // Create basic auth header
    const auth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    
    // Simple PING test to Atlas (this might fail with auth errors but will test connectivity)
    const response = await fetch(`${atlasHost}`, {
      method: 'HEAD',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    console.log('Network connectivity test result:');
    console.log('- Status:', response.status);
    console.log('- Status Text:', response.statusText);
    
    if (response.ok) {
      console.log('✅ Successfully connected to MongoDB Atlas host');
    } else {
      console.log('❌ Connection test failed with status:', response.status);
      if (response.status === 401) {
        console.log('This is an authentication error, but the network connectivity works');
        console.log('This may be expected as we\'re not using the proper Atlas API endpoints');
      }
    }
  } catch (err) {
    console.error('❌ Error connecting to MongoDB:', err);
  }
}

// Run the test
console.log('Testing MongoDB Atlas Connection');
await testAtlasConnection();
console.log('Test completed.');