/**
 * Quick diagnostic script to test the trade logs API directly (CommonJS version)
 */
const fetch = require('node-fetch');

async function testApiEndpoint() {
  try {
    console.log('Testing Trade Logs API endpoint directly...');
    
    // First, test with a direct GET request to the API endpoint
    const getResponse = await fetch('http://localhost:5000/api/trade-logs');
    const contentType = getResponse.headers.get('content-type');
    
    console.log('Response status:', getResponse.status);
    console.log('Content-Type:', contentType);
    
    if (contentType && contentType.includes('application/json')) {
      const data = await getResponse.json();
      console.log('API returned JSON data (first 3 items):');
      console.log(JSON.stringify(data.slice(0, 3), null, 2));
    } else if (contentType && contentType.includes('text/html')) {
      console.error('ERROR: API returned HTML instead of JSON!');
      const htmlContent = await getResponse.text();
      console.log('HTML snippet:', htmlContent.slice(0, 200) + '...');
    } else {
      const rawContent = await getResponse.text();
      console.log('Raw response:', rawContent.slice(0, 200));
    }
    
    // Now, try creating a trade log
    console.log('\nTesting trade log creation...');
    const createResponse = await fetch('http://localhost:5000/api/trade-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol: 'BTC-USDT',
        action: 'BUY',
        entry_price: '68000',
        quantity: '0.1',
        trade_source: 'TEST'
      }),
    });
    
    const createContentType = createResponse.headers.get('content-type');
    console.log('Create response status:', createResponse.status);
    console.log('Create Content-Type:', createContentType);
    
    if (createContentType && createContentType.includes('application/json')) {
      const data = await createResponse.json();
      console.log('Create API returned JSON data:');
      console.log(JSON.stringify(data, null, 2));
    } else {
      const rawContent = await createResponse.text();
      console.log('Create raw response:', rawContent.slice(0, 200));
    }
    
  } catch (error) {
    console.error('Error testing API endpoint:', error);
  }
}

testApiEndpoint();