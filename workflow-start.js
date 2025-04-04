// Simple wrapper script for Replit workflow
// This is expected to be run directly by the Replit workflow

const { spawn } = require('child_process');

console.log('Starting server via workflow-start.js');

// Execute our main start script
const server = spawn('node', ['start.cjs'], {
  stdio: 'inherit',
  shell: true
});

server.on('error', (err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});

// Keep the process running
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.kill();
  process.exit(0);
});