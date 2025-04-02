/**
 * Test Mixpanel Integration Script
 * 
 * This script tests direct communication with Mixpanel API to verify our implementation.
 */

import https from 'https';
import crypto from 'crypto';
import { promisify } from 'util';

// Mixpanel credentials
const MIXPANEL_TOKEN = '39cb139a24b909196bd231e9fadb8dd4';
const API_SECRET = '022ec591d2928d676cac6989fd14c7f0';
const API_ENDPOINT = 'https://api.mixpanel.com/track';

/**
 * Send a test event to Mixpanel
 */
async function sendTestEvent() {
  try {
    console.log('==== Mixpanel Test Script ====');
    console.log('Sending test event to Mixpanel...');
    
    // Create an event
    const eventData = {
      event: 'test_script_event',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'test-user-' + Date.now(),
        time: Math.floor(Date.now() / 1000),
        test_property: 'test_value',
        source: 'direct_test_script'
      }
    };
    
    // Encode the data
    const encodedData = Buffer.from(JSON.stringify(eventData)).toString('base64');
    
    // Generate the signature
    const signature = crypto
      .createHash('sha256')
      .update(encodedData + API_SECRET)
      .digest('hex');
    
    // Create the URL
    const url = new URL(API_ENDPOINT);
    url.searchParams.append('data', encodedData);
    url.searchParams.append('sig', signature);
    
    // Send the request
    const result = await sendHttpRequest(url.toString());
    
    if (result) {
      console.log('✅ Success! Event was sent to Mixpanel successfully.');
      console.log('Event details:');
      console.log(JSON.stringify(eventData, null, 2));
    } else {
      console.log('❌ Failed to send event to Mixpanel.');
    }
    
    // Test importing data to Mixpanel
    console.log('\nTesting Mixpanel Import API...');
    await testImportAPI();
    
  } catch (error) {
    console.error('Error in test script:', error);
  }
}

/**
 * Send an HTTP request and get the result
 */
function sendHttpRequest(url) {
  return new Promise((resolve) => {
    https.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        console.log(`Response status: ${response.statusCode}`);
        console.log(`Response body: ${data}`);
        resolve(response.statusCode === 200);
      });
    }).on('error', (error) => {
      console.error('HTTP request error:', error);
      resolve(false);
    });
  });
}

/**
 * Test Mixpanel Import API
 */
async function testImportAPI() {
  try {
    const importUrl = 'https://api.mixpanel.com/import';
    
    // Create a sample event for import
    const importEvent = {
      event: 'test_import_event',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'import-test-user-' + Date.now(),
        time: Math.floor(Date.now() / 1000),
        import: true,
        source: 'import_api_test'
      }
    };
    
    // Options for HTTP request
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(API_SECRET + ':').toString('base64')}`
      }
    };
    
    // Send the request
    const result = await sendPostRequest(importUrl, JSON.stringify([importEvent]), options);
    
    if (result) {
      console.log('✅ Success! Event was imported to Mixpanel successfully.');
    } else {
      console.log('❌ Failed to import event to Mixpanel.');
    }
    
  } catch (error) {
    console.error('Error testing import API:', error);
  }
}

/**
 * Send a POST request
 */
function sendPostRequest(url, data, options) {
  return new Promise((resolve) => {
    const req = https.request(url, options, (response) => {
      let responseData = '';
      
      response.on('data', (chunk) => {
        responseData += chunk;
      });
      
      response.on('end', () => {
        console.log(`Import response status: ${response.statusCode}`);
        console.log(`Import response body: ${responseData}`);
        resolve(response.statusCode === 200);
      });
    });
    
    req.on('error', (error) => {
      console.error('HTTP request error:', error);
      resolve(false);
    });
    
    req.write(data);
    req.end();
  });
}

// Run the test
sendTestEvent();