// Using built-in fetch API

async function testAgentApi() {
  console.log('Testing Agent API...');
  
  try {
    // Test the health endpoint
    const healthResponse = await fetch('http://localhost:5000/api/agent/health');
    const healthData = await healthResponse.json();
    console.log('Health check response:', healthData);
    
    if (healthData.success) {
      console.log('✅ Agent API health check passed');
    } else {
      console.log('❌ Agent API health check failed');
    }
    
    // Test agent chat
    const chatPayload = {
      message: 'Hello agent, can you help me?',
      sessionId: 'test-session-' + Date.now(),
      userId: 'test-user'
    };
    
    console.log('Sending test chat message...');
    const chatResponse = await fetch('http://localhost:5000/api/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Admin': 'true'  // Add test admin header for authentication
      },
      body: JSON.stringify(chatPayload)
    });
    
    const chatData = await chatResponse.json();
    console.log('Chat response:', chatData);
    
    if (chatData.success) {
      console.log('✅ Agent chat test passed');
      console.log('Agent replied:', chatData.response);
    } else {
      console.log('❌ Agent chat test failed');
    }
    
  } catch (error) {
    console.error('Error testing agent API:', error);
  }
}

testAgentApi();