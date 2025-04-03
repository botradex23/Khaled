#!/usr/bin/env node

/**
 * Development server launcher
 * 
 * This script starts the minimal server implementation that doesn't
 * require express or other third-party dependencies.
 */

const fs = require('fs');
const { exec, spawn } = require('child_process');

console.log('Starting development server with minimal server implementation...');

// Make the server script executable
try {
  fs.chmodSync('./minimal_server.cjs', 0o755);
  console.log('Made minimal_server.cjs executable');
} catch (err) {
  console.error('Could not make minimal_server.cjs executable:', err.message);
}

console.log('Development server started');

// Start the minimal server
const serverProcess = spawn('node', ['./minimal_server.cjs'], { 
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