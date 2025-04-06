// Test MongoDB connection directly using the server code
require('dotenv').config();

async function testMongoDBConnection() {
  try {
    // Dynamically import the MongoDB connection module
    const { testMongoDBConnection } = require('./server/storage/mongodb');
    
    console.log('Testing MongoDB connection...');
    console.log('MongoDB URI:', process.env.MONGO_URI ? 'Configured in .env' : 'Not configured');
    
    // Test the connection
    const result = await testMongoDBConnection();
    
    // Print the result
    console.log('\nMongoDB Connection Test Result:');
    console.log('Connected:', result.connected);
    console.log('Simulated:', result.isSimulated);
    console.log('Description:', result.description);
    console.log('Error:', result.error);
    
    return result.connected;
  } catch (error) {
    console.error('Error testing MongoDB connection:', error);
    return false;
  }
}

// Run the test
testMongoDBConnection()
  .then(connected => {
    console.log('\nConnection test completed. MongoDB is', connected ? 'connected' : 'not connected');
    process.exit(connected ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during MongoDB connection test:', error);
    process.exit(1);
  });