/**
 * Database Status API Test
 * 
 * This script tests the database status API endpoint to verify MongoDB connectivity.
 */

async function checkDatabaseStatus() {
  try {
    console.log('Checking database status through API endpoint...');
    
    // Make request to the database status endpoint
    // Get the public URL from hostname
    const hostname = process.env.REPL_SLUG || 'localhost:5173';
    const isReplit = process.env.REPL_SLUG !== undefined;
    const protocol = isReplit ? 'https' : 'http';
    const baseUrl = isReplit ? `${protocol}://${hostname}.replit.app` : `${protocol}://${hostname}`;
    console.log(`Using base URL: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/database-status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log('Database status response:', JSON.stringify(data, null, 2));
    
    // Check MongoDB status
    if (data.mongodb && data.mongodb.connected) {
      console.log('✅ MongoDB is connected');
    } else {
      console.log('❌ MongoDB is not connected');
      
      if (data.mongodb && data.mongodb.error) {
        console.log(`Error: ${data.mongodb.error}`);
      }
      
      if (data.mongodb && data.mongodb.description) {
        console.log(`Description: ${data.mongodb.description}`);
      }
    }
    
    return !!data.mongodb?.connected;
  } catch (error) {
    console.error('Error checking database status:', error);
    return false;
  } finally {
    console.log('\nDatabase status check completed.');
  }
}

// Run the check
checkDatabaseStatus().then(isConnected => {
  console.log(isConnected ? 'MongoDB is connected' : 'MongoDB is not connected');
});