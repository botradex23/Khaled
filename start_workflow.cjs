// Startup script for Replit workflow
const { spawn } = require('child_process');
const http = require('http');

console.log('Starting Crypto Trading Platform...');

// Start the minimal server
const serverProcess = spawn('node', ['minimal_server.cjs'], {
  detached: true,
  stdio: 'inherit'
});

// Log process ID for debugging
console.log(`Server process started with PID: ${serverProcess.pid}`);

// Keep the script running
process.stdin.resume();

// Handle termination
process.on('SIGINT', () => {
  console.log('Shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  process.exit(0);
});