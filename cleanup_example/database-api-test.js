/**
 * Database Status API Test - Direct Simplified Version
 * 
 * This script makes a direct API call to the database status endpoint
 * and checks the response format.
 */

async function testDbStatus() {
  try {
    console.log('Making direct fetch request to database status API...');
    
    // Make request directly to the API endpoint
    const endpoint = 'http://localhost:5000/api/database-status';
    console.log(`Endpoint: ${endpoint}`);
    
    const response = await fetch(endpoint);
    console.log(`Response status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', response.headers);
    
    // Get the raw text response first
    const text = await response.text();
    console.log(`Response length: ${text.length} characters`);
    
    // Check if it's HTML or JSON
    if (text.trim().startsWith('<!DOCTYPE html>') || text.trim().startsWith('<html>')) {
      console.log('Received HTML response instead of JSON');
      console.log('First 100 characters:', text.substring(0, 100));
    } else {
      // Try to parse as JSON
      try {
        const data = JSON.parse(text);
        console.log('Parsed JSON response:', JSON.stringify(data, null, 2));
      } catch (parseError) {
        console.error('Failed to parse response as JSON:', parseError);
        console.log('Raw response:', text);
      }
    }
  } catch (error) {
    console.error('Error making API request:', error);
  }
}

// Run the test
testDbStatus();