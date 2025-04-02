/**
 * Simple Mixpanel Test
 * 
 * This script tests sending events directly to Mixpanel's API
 * without any dependencies on node-fetch or other libraries.
 */

import https from 'https';
import crypto from 'crypto';

// Mixpanel credentials
const MIXPANEL_TOKEN = '39cb139a24b909196bd231e9fadb8dd4';
const API_SECRET = '022ec591d2928d676cac6989fd14c7f0';
const API_ENDPOINT = 'api.mixpanel.com';

/**
 * Send a test event to Mixpanel
 */
function sendTestEvent() {
  console.log('==== Simple Mixpanel Test ====');
  console.log('Sending test event to Mixpanel...');
  
  // Create an event
  const eventData = {
    event: 'simple_test_event',
    properties: {
      token: MIXPANEL_TOKEN,
      distinct_id: 'simple-test-user-' + Date.now(),
      time: Math.floor(Date.now() / 1000),
      test_property: 'simple_test_value',
      source: 'simple_test_script'
    }
  };
  
  // Encode the data
  const encodedData = Buffer.from(JSON.stringify(eventData)).toString('base64');
  
  // Generate the signature
  const signature = crypto
    .createHash('sha256')
    .update(encodedData + API_SECRET)
    .digest('hex');
  
  // Set up the request options
  const options = {
    hostname: API_ENDPOINT,
    port: 443,
    path: `/track?data=${encodeURIComponent(encodedData)}&sig=${signature}`,
    method: 'GET'
  };
  
  // Send the request
  const req = https.request(options, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log(`Response status: ${res.statusCode}`);
      console.log(`Response body: ${data}`);
      
      if (res.statusCode === 200 && data.trim() === '1') {
        console.log('✅ Success! Event was sent to Mixpanel successfully.');
        console.log('Event details:');
        console.log(JSON.stringify(eventData, null, 2));
      } else {
        console.log('❌ Failed to send event to Mixpanel.');
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error sending request:', error);
  });
  
  req.end();
}

// Run the test
sendTestEvent();