// Simple script to test the API endpoint using native fetch
async function testMyAgentApi() {
  try {
    console.log('Testing AI Agent API endpoint...');
    
    // Using browser-based URLSearchParams to observe logs
    const url = new URL('http://localhost:5000/api/my-agent/health');
    url.searchParams.append('_t', Date.now()); // Cache buster
    
    console.log('URL:', url.toString());
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    
    const text = await response.text();
    console.log('Response text:', text.substring(0, 500) + '...');
    
    // Try to parse as JSON if possible
    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Not valid JSON, response is likely HTML');
    }
    
  } catch (error) {
    console.error('Error testing AI Agent API:', error);
  }
}

testMyAgentApi();
