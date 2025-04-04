// A simple test script to add the test admin header
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/my-agent/health',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Test-Admin': 'true'
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('Response:');
    try {
      const jsonData = JSON.parse(data);
      console.log(JSON.stringify(jsonData, null, 2));
    } catch (e) {
      console.log('Not JSON: First 200 chars -', data.substring(0, 200) + '...');
    }
  });
});

req.on('error', (error) => {
  console.error('Error:', error);
});

req.end();
