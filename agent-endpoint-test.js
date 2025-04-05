/**
 * Agent Endpoint Test
 * 
 * This script tests all the agent API endpoints to ensure they're working correctly
 */

async function testAgentEndpoints() {
  console.log('\n--- AGENT ENDPOINT TEST ---\n');

  // Test the health endpoint
  console.log('Testing: /api/agent/direct-health');
  try {
    const healthResponse = await fetch('http://localhost:5000/api/agent/direct-health');
    const healthData = await healthResponse.json();
    console.log('✅ direct-health endpoint:', healthResponse.status, healthData.success ? 'SUCCESS' : 'FAILED');
    console.log('  Details:', JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.log('❌ direct-health endpoint FAILED:', error.message);
  }

  // Test the files endpoint
  console.log('\nTesting: /api/agent/files');
  try {
    const filesResponse = await fetch('http://localhost:5000/api/agent/files', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      },
      body: JSON.stringify({
        directory: './'
      })
    });
    
    const filesData = await filesResponse.json();
    console.log('✅ files endpoint:', filesResponse.status, filesData.success ? 'SUCCESS' : 'FAILED');
    console.log('  Files found:', filesData.files ? filesData.files.length : 0);
    if (filesData.files && filesData.files.length > 0) {
      console.log('  Sample files:', filesData.files.slice(0, 3));
    } else {
      console.log('  Files response:', filesData);
    }
  } catch (error) {
    console.log('❌ files endpoint FAILED:', error.message);
  }

  // Test the read file endpoint
  console.log('\nTesting: /api/agent/read-file');
  try {
    const readFileResponse = await fetch('http://localhost:5000/api/agent/read-file', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Test-Admin': 'true'
      },
      body: JSON.stringify({
        filePath: '.env.example'
      })
    });
    
    const readFileData = await readFileResponse.json();
    console.log('✅ readfile endpoint:', readFileResponse.status, readFileData.success ? 'SUCCESS' : 'FAILED');
    if (readFileData.content) {
      console.log('  Content preview:', readFileData.content.substring(0, 100) + '...');
    } else {
      console.log('  ReadFile response:', readFileData);
    }
  } catch (error) {
    console.log('❌ readfile endpoint FAILED:', error.message);
  }

  // Test the chat endpoint
  console.log('\nTesting: /api/agent/chat');
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

  console.log('\n--- END OF AGENT ENDPOINT TEST ---\n');
}

// Run the test
testAgentEndpoints();