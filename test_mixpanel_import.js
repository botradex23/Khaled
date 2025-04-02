/**
 * Mixpanel Import API Test
 * 
 * This script tests sending events to Mixpanel's Import API
 * which allows bulk importing of historical data.
 */

import https from 'https';
import crypto from 'crypto';

// Mixpanel credentials
const MIXPANEL_TOKEN = '39cb139a24b909196bd231e9fadb8dd4';
const API_SECRET = '022ec591d2928d676cac6989fd14c7f0';
const API_ENDPOINT = 'api.mixpanel.com';

/**
 * Send test historical events to Mixpanel
 */
function sendHistoricalEvents() {
  console.log('==== Mixpanel Import API Test ====');
  console.log('Sending historical events to Mixpanel...');
  
  // Create a batch of historical events
  const events = [
    {
      event: 'historical_signup',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'historical-user-1',
        time: Math.floor(Date.now() / 1000) - 86400, // 1 day ago
        source: 'import_api_test',
        campaign: 'spring_promo'
      }
    },
    {
      event: 'historical_bot_created',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'historical-user-1',
        time: Math.floor(Date.now() / 1000) - 86300, // 23.9 hours ago
        source: 'import_api_test',
        bot_type: 'ai_grid',
        investment: 1000
      }
    },
    {
      event: 'historical_trade',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'historical-user-1',
        time: Math.floor(Date.now() / 1000) - 86200, // 23.9 hours ago
        source: 'import_api_test',
        trade_type: 'BUY',
        symbol: 'BTCUSDT',
        amount: 0.05
      }
    }
  ];
  
  // Convert events to a string
  const eventsData = JSON.stringify(events);
  
  // Set up the request options with auth header
  const options = {
    hostname: API_ENDPOINT,
    port: 443,
    path: '/import',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(eventsData),
      'Authorization': 'Basic ' + Buffer.from(API_SECRET + ':').toString('base64')
    }
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
      
      if (res.statusCode === 200) {
        console.log('✅ Success! Historical events were imported to Mixpanel successfully.');
        console.log('Events imported:');
        console.log(JSON.stringify(events, null, 2));
      } else {
        console.log('❌ Failed to import historical events to Mixpanel.');
        console.log('Response headers:', res.headers);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('Error sending request:', error);
  });
  
  req.write(eventsData);
  req.end();
}

// Run the test
sendHistoricalEvents();