#!/usr/bin/env node

/**
 * Start Minimal Workflow for Cryptocurrency Trading Platform
 * 
 * This script is meant to be used as the Replit workflow command to start
 * the minimal server without relying on complex npm scripts.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const projectRoot = process.cwd();
console.log('Working directory:', projectRoot);

// Server script path
const serverScript = path.join(projectRoot, 'minimal_server.cjs');

// Check if server script exists
if (!fs.existsSync(serverScript)) {
  console.error(`Error: Server script not found at ${serverScript}`);
  process.exit(1);
}

console.log('Starting minimal cryptocurrency trading platform...');

// Run server using node directly (no npm required)
const serverProcess = spawn('node', [serverScript], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: process.env.PORT || '5000',
    HOST: '0.0.0.0' // Ensure it's accessible from Replit
  }
});

// Handle server process exit
serverProcess.on('exit', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code);
});

// Handle errors
serverProcess.on('error', (err) => {
  console.error('Failed to start server process:', err);
  process.exit(1);
});

// Handle SIGINT (Ctrl+C) gracefully
process.on('SIGINT', () => {
  console.log('Received SIGINT. Shutting down gracefully...');
  serverProcess.kill('SIGINT');
});