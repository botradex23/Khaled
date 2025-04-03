#!/usr/bin/env node

/**
 * Server launcher that uses node to run the minimal server
 * instead of relying on tsx which is failing to install
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const projectRoot = process.cwd();
console.log('Working directory:', projectRoot);

// Path to the minimal server
const minimalServerPath = path.join(projectRoot, 'minimal_server.cjs');

// Verify minimal_server.cjs exists
if (!fs.existsSync(minimalServerPath)) {
  console.error(`Error: minimal_server.cjs not found at ${minimalServerPath}`);
  process.exit(1);
}

console.log('Starting cryptocurrency trading platform with minimal server...');

// Run the minimal server script
const serverProcess = spawn('node', [minimalServerPath], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: process.env.PORT || '5000',
    HOST: '0.0.0.0' // Make sure it's accessible from Replit
  },
  stdio: 'inherit' // Pass stdio/stderr to parent process
});

// Handle process exit
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

console.log('Server startup script is running...');