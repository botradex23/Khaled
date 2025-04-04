#!/usr/bin/env node

/**
 * Development server launcher
 * 
 * This script starts the original server implementation from index.js
 */

const fs = require('fs');
const { exec, spawn } = require('child_process');

console.log('Starting development server with original implementation...');

// Make the server script executable
try {
  fs.chmodSync('./index.js', 0o755);
  console.log('Made index.js executable');
} catch (err) {
  console.error('Could not make index.js executable:', err.message);
}

console.log('Development server started');

// Start the original server
const serverProcess = spawn('node', ['./index.js'], { 
  stdio: 'inherit',
  detached: false
});

// Handle process exit
serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle signals
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  serverProcess.kill('SIGTERM');
});