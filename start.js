/**
 * Start Script for Replit
 * 
 * This script starts the application in a Replit-friendly way.
 */

import { spawn } from 'child_process';

console.log('Starting Crypto Trading Platform...');

// Start the Node.js server
const server = spawn('node', ['index.js'], { stdio: 'inherit' });

server.on('close', (code) => {
  console.log(`Main server process exited with code ${code}`);
  process.exit(code);
});

// Handle termination signals
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down...');
  server.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down...');
  server.kill('SIGTERM');
});