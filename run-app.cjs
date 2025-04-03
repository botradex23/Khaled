/**
 * Simple script to run the minimal server
 */

// Import required modules
const { execSync, spawn } = require('child_process');

console.log('Starting the minimal crypto trading platform...');

try {
  // Run the Node.js minimal server (this executes and keeps running)
  const nodeProcess = spawn('node', ['minimal_server.cjs'], { 
    stdio: 'inherit',
    shell: true
  });

  // Log when server starts
  nodeProcess.on('spawn', () => {
    console.log('Server process started successfully!');
  });

  // Handle errors
  nodeProcess.on('error', (err) => {
    console.error('Failed to start server:', err);
  });

  // Handle process exit
  nodeProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`Server process exited with code ${code} and signal ${signal}`);
    }
  });

  // Handle clean shutdown on SIGINT
  process.on('SIGINT', () => {
    console.log('Shutting down server...');
    nodeProcess.kill('SIGINT');
    process.exit(0);
  });

} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}