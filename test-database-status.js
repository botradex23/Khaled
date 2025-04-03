/**
 * Database Status API Test
 * 
 * This script tests the database status API endpoint to verify MongoDB connectivity.
 */

async function checkDatabaseStatus() {
  try {
    console.log('Checking database status through API endpoint...');
    
    // Make request to the database status endpoint
    // Use port 5000 since that's where our Express server is running
    const baseUrl = 'http://localhost:5000';
    console.log(`Using base URL: ${baseUrl}`);
    
    const response = await fetch(`${baseUrl}/api/database-status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
    }
    
    // Just get the text to see what's being returned
    const responseText = await response.text();
    console.log('Raw response:', responseText);
    
    // Try to parse it if it's JSON
    let data;
    try {
      data = JSON.parse(responseText);
      console.log('Database status response:', JSON.stringify(data, null, 2));
      
      // Check status
      if (data.connected) {
        console.log('✅ Database is connected');
        if (data.isSimulated) {
          console.log('⚠️ Using simulated in-memory storage');
        }
      } else {
        console.log('❌ Database is not connected');
        
        if (data.error) {
          console.log(`Error: ${data.error}`);
        }
        
        if (data.description) {
          console.log(`Description: ${data.description}`);
        }
      }
      
      return data.connected;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.log('Received HTML instead of JSON. The server may be returning a web page.');
      return false;
    }
  } catch (error) {
    console.error('Error checking database status:', error);
    return false;
  } finally {
    console.log('\nDatabase status check completed.');
  }
}

// Run the check
checkDatabaseStatus().then(isConnected => {
  console.log(isConnected ? 'Database is connected and operational' : 'Database is not connected properly');
});