/**
 * MongoDB Status API Check
 * 
 * This script makes a direct HTTP request to the MongoDB status API endpoint
 * and displays the response.
 */

async function checkMongoDBStatus() {
  try {
    console.log('Making API request to MongoDB status endpoint...');
    const response = await fetch('http://localhost:5000/api/mongodb/status');
    
    // Log the response status
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    // Check content type header
    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType}`);
    
    // Get the response text
    const responseText = await response.text();
    console.log('\nResponse body:');
    console.log(responseText);
    
    // Try to parse as JSON
    try {
      const responseJson = JSON.parse(responseText);
      console.log('\nParsed JSON:');
      console.log(JSON.stringify(responseJson, null, 2));
    } catch (parseError) {
      console.error('Error parsing response as JSON:', parseError.message);
      console.log('Response is not valid JSON. Content starts with:');
      console.log(responseText.substring(0, 200) + '...');
    }
  } catch (error) {
    console.error('Error making API request:', error.message);
  }
}

// Run the check
checkMongoDBStatus();