/**
 * Test Client-Side Mixpanel Integration
 * 
 * This script simulates client-side requests to our server-side Mixpanel track endpoint
 * to verify the full flow from browser to Mixpanel.
 */

import https from 'https';

// Configuration
const API_ENDPOINT = 'http://localhost:3000/api/analytics/mixpanel/track';
const MIXPANEL_TOKEN = '39cb139a24b909196bd231e9fadb8dd4';

/**
 * Send a test event through our API endpoint
 */
async function testClientSideTracking() {
  try {
    console.log('==== Client-Side Mixpanel Test ====');
    console.log('Sending test event through server endpoint...');
    
    // Create event data similar to what the client would send
    const eventData = {
      event: 'client_test_event',
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'client-test-user-' + Date.now(),
        time: Math.floor(Date.now() / 1000),
        test_property: 'client_test_value',
        source: 'client_simulation_test',
        button_clicked: 'test_button',
        page: '/test-page',
        user_id: 123
      }
    };
    
    // Send the request
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    });
    
    const responseData = await response.json();
    
    console.log(`Response status: ${response.status}`);
    console.log('Response body:', responseData);
    
    if (response.status === 200 && responseData.success) {
      console.log('✅ Success! Event was sent to Mixpanel through our API.');
      console.log('Event details:');
      console.log(JSON.stringify(eventData, null, 2));
    } else {
      console.log('❌ Failed to send event to Mixpanel through our API.');
    }
    
    // Test specific event types
    await testSpecificEventTypes();
    
  } catch (error) {
    console.error('Error in client-side test:', error);
  }
}

/**
 * Test specific event types that might be missing in Mixpanel
 */
async function testSpecificEventTypes() {
  console.log('\n==== Testing Specific Event Types ====');
  
  const eventTypes = [
    { name: 'bot_creation', properties: { bot_type: 'ai_grid', initial_investment: 1000 } },
    { name: 'paper_trade_executed', properties: { symbol: 'BTCUSDT', amount: 0.1, direction: 'BUY' } },
    { name: 'button_click', properties: { button_name: 'create_first_bot', page: '/dashboard' } },
    { name: 'api_setup_completed', properties: { broker: 'binance', test_mode: true } }
  ];
  
  for (const eventType of eventTypes) {
    console.log(`\nTesting event type: ${eventType.name}`);
    
    const eventData = {
      event: eventType.name,
      properties: {
        token: MIXPANEL_TOKEN,
        distinct_id: 'test-specific-events-' + Date.now(),
        time: Math.floor(Date.now() / 1000),
        ...eventType.properties
      }
    };
    
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      
      const responseData = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log('Response:', responseData.success ? 'Success' : 'Failed');
      
    } catch (error) {
      console.error(`Error testing ${eventType.name}:`, error);
    }
  }
}

// Run the test
testClientSideTracking();