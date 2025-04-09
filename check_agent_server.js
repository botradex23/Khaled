import http from 'http';

// Check Agent Server Health
function checkAgentServerHealth() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3021,
      path: '/agent-api/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          console.log('Agent Server Health Check:', result);
          resolve(result);
        } catch (e) {
          console.error('Error parsing Agent Server response:', e.message);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Agent Server Check Error:', error.message);
      reject(error);
    });
    
    req.setTimeout(2000, () => {
      req.abort();
      console.error('Agent Server Check Timeout');
      reject(new Error('Request timeout'));
    });
    
    req.end();
  });
}

// Make a simple chat test request to the agent
function testAgentChat() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      prompt: 'What trading features are available in the platform?',
      systemPrompt: 'You are a helpful AI assistant for a trading platform.'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3021,
      path: '/agent-api/agent-chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error(`Error response: Status ${res.statusCode}`);
            console.error('Response data:', data);
            reject(new Error(`Status code: ${res.statusCode}`));
            return;
          }
          
          const result = JSON.parse(data);
          console.log('Agent Chat Test:');
          console.log(`Status: ${res.statusCode}`);
          console.log(`Response: ${result.message.substring(0, 100)}...`);
          resolve(result);
        } catch (e) {
          console.error('Error parsing Agent Chat response:', e.message);
          reject(e);
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Agent Chat Test Error:', error.message);
      reject(error);
    });
    
    req.write(postData);
    req.end();
  });
}

// Run checks
async function main() {
  try {
    console.log('Checking Agent Server Health...');
    await checkAgentServerHealth();
    
    console.log('\nTesting Agent Chat...');
    await testAgentChat();
    
  } catch (error) {
    console.error('Agent Server check failed:', error.message);
    
    // Suggest a fix
    console.log('\nSuggested fixes:');
    console.log('1. Make sure the agent-server.js is running on port 3021');
    console.log('2. Check if there are any errors in the agent server logs');
    console.log('3. Try restarting the agent server with: node server/standalone-agent-server.js');
  }
}

main();