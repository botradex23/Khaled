/**
 * Workflow Script for Starting the Cryptocurrency Trading Platform
 * 
 * This script is designed to be executed by the Replit workflow system.
 * It starts the application by running start.cjs, which initializes 
 * both the Node.js and Python components.
 */

const { spawn } = require('child_process');
const http = require('http');

console.log('Starting Cryptocurrency Trading Platform (Workflow Version)...');

// Execute the start.cjs script
try {
  const startProcess = spawn('node', ['start.cjs'], { 
    stdio: 'inherit',
    shell: true
  });

  startProcess.on('error', (err) => {
    console.error('Failed to start application:', err);
    process.exit(1);
  });

  startProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`Application process exited with code ${code} and signal ${signal}`);
      process.exit(code);
    }
  });

  // Handle clean shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down application...');
    startProcess.kill('SIGINT');
    process.exit(0);
  });

  // Create a simple HTTP server to listen for status checks
  const server = http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'running' }));
      return;
    }
    
    res.writeHead(404);
    res.end();
  });
  
  server.listen(5003, () => {
    console.log('Health check server running on port 5003');
  });

} catch (error) {
  console.error('Error starting the application:', error);
  process.exit(1);
}