/**
 * Start script for Cryptocurrency Trading Platform
 * 
 * This script starts the minimal server that handles both Node.js and Python components.
 */

// Import required modules
const { spawn } = require('child_process');

// Start the application
console.log('Starting Cryptocurrency Trading Platform...');

// Execute the run-app.cjs script
const appProcess = spawn('node', ['run-app.cjs'], { 
  stdio: 'inherit',
  shell: true
});

// Handle errors
appProcess.on('error', (err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});

// Handle process exit
appProcess.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Application process exited with code ${code} and signal ${signal}`);
    process.exit(code);
  }
});

// Handle clean shutdown
process.on('SIGINT', () => {
  console.log('Shutting down application...');
  appProcess.kill('SIGINT');
  process.exit(0);
});