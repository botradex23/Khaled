// Simple script to run the server directly with Node.js
// This avoids the need for tsx using CommonJS

const { execSync } = require('child_process');

try {
  console.log('Starting minimal server...');
  execSync('node minimal_server.cjs', { stdio: 'inherit' });
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}