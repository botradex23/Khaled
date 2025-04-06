/**
 * Agent Chat Endpoint Test
 * 
 * This script tests just the chat endpoint to avoid timeouts
 */

async function testAgentChat() {
  console.log('\n--- AGENT CHAT TEST ---\n');

  // Test the chat endpoint
  console.log('Testing: /api/agent/chat');
  try {
    const chatResponse = await fetch('http://localhost:5000/api/agent/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      },
      body: JSON.stringify({
        prompt: 'Say hello in JSON format',
        systemPrompt: 'You are a helpful AI assistant that responds in JSON format.'
      })
    });
    
    const chatData = await chatResponse.json();
    console.log('✅ chat endpoint:', chatResponse.status, chatData.success ? 'SUCCESS' : 'FAILED');
    console.log('  Response snippet:', chatData.response.substring(0, 100) + '...');
  } catch (error) {
    console.log('❌ chat endpoint FAILED:', error.message);
  }

  console.log('\n--- END OF AGENT CHAT TEST ---\n');
}

// Run the test
testAgentChat();