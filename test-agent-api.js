const fetch = require('node-fetch');

async function testMyAgentApi() {
  try {
    console.log('Testing AI Agent API endpoint...');
    
    const response = await fetch('http://localhost:5000/api/my-agent/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', JSON.stringify(response.headers.raw(), null, 2));
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
    } else {
      console.log('Error response:', await response.text());
    }
    
  } catch (error) {
    console.error('Error testing AI Agent API:', error);
  }
}

testMyAgentApi();
