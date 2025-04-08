/**
 * Simple test script for the agent server
 */

import http from 'http';

// Try different connection options
const testConnections = [
  {
    hostname: 'localhost',
    port: 5021,
    label: 'localhost:5021'
  },
  {
    hostname: '127.0.0.1',
    port: 5021,
    label: '127.0.0.1:5021'
  },
  {
    hostname: '0.0.0.0',
    port: 5021,
    label: '0.0.0.0:5021'
  }
];

// Test each connection
async function testAllConnections() {
  for (const conn of testConnections) {
    await testConnection(conn);
  }
}

function testConnection(conn) {
  return new Promise((resolve) => {
    console.log(`Testing connection to ${conn.label}...`);
    
    const options = {
      hostname: conn.hostname,
      port: conn.port,
      path: '/health',
      method: 'GET',
      headers: {
        'X-Test-Admin': 'true'
      }
    };
    
    const req = http.request(options, (res) => {
      console.log(`${conn.label} - Status Code: ${res.statusCode}`);
      
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const response = Buffer.concat(chunks).toString();
        console.log(`${conn.label} - Response:`);
        console.log(response);
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error(`${conn.label} - Error:`, error.message);
      resolve();
    });
    
    req.setTimeout(3000, () => {
      console.error(`${conn.label} - Timeout after 3 seconds`);
      req.abort();
      resolve();
    });
    
    req.end();
  });
}

testAllConnections();