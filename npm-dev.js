/**
 * Custom npm dev script for Cryptocurrency Trading Platform
 * This script is designed to be run by npm run dev in Replit workflows
 */

// Import required modules
const { spawn } = require('child_process');
const path = require('path');

// Log startup
console.log('Cryptocurrency Trading Platform - Starting from npm-dev.js...');

// Execute the start.cjs script
const startProcess = spawn('node', ['start.cjs'], { 
  stdio: 'inherit',
  shell: true
});

// Handle errors
startProcess.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Forward process exit
startProcess.on('exit', (code) => {
  process.exit(code || 0);
});