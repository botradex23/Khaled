/**
 * Simple script to test the database connection status API endpoint
 */

async function checkDatabaseStatus() {
  try {
    console.log('Checking database status through API endpoint...');
    
    const response = await fetch('http://localhost:5000/api/database-status');
    
    if (!response.ok) {
      console.error(`Error: HTTP ${response.status} - ${response.statusText}`);
      return false;
    }
    
    const data = await response.json();
    
    console.log('Database Status Response:');
    console.log(JSON.stringify(data, null, 2));
    
    return data.mongodb && data.mongodb.connected;
  } catch (error) {
    console.error('Error checking database status:', error);
    return false;
  }
}

// Run the test
checkDatabaseStatus()
  .then(connected => {
    console.log('\nDatabase status check completed. MongoDB is', connected ? 'connected' : 'not connected');
    process.exit(connected ? 0 : 1);
  })
  .catch(error => {
    console.error('Unexpected error during database status check:', error);
    process.exit(1);
  });