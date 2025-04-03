// Server startup script that bypasses the tsx requirement
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting Binance Trading Platform...');

// Start the Python Binance API server
console.log('1. Starting Python Binance API Server...');
const pythonProcess = spawn('python', ['binance_api_server.py']);

// Log Python server output
pythonProcess.stdout.on('data', (data) => {
  console.log(`Python server: ${data}`);
});

pythonProcess.stderr.on('data', (data) => {
  console.error(`Python server error: ${data}`);
});

pythonProcess.on('close', (code) => {
  console.log(`Python server process exited with code ${code}`);
});

// Wait for Python server to start
console.log('Waiting for Python server to start...');
setTimeout(() => {
  console.log('2. Python server should be running. Starting web server...');
  
  // Instead of using tsx, we need to use Node directly with the compiled JS
  try {
    // Create a simple Express server that serves static files and proxies API requests
    const expressServerProcess = spawn('node', ['server/simple_index.js']);
    
    expressServerProcess.stdout.on('data', (data) => {
      console.log(`Express server: ${data}`);
    });
    
    expressServerProcess.stderr.on('data', (data) => {
      console.error(`Express server error: ${data}`);
    });
    
    expressServerProcess.on('close', (code) => {
      console.log(`Express server process exited with code ${code}`);
    });
    
    console.log('3. Services started successfully!');
    console.log('   - Python Binance API Server: http://localhost:5001');
    console.log('   - Express Server: http://localhost:5000');
    console.log('\nPress Ctrl+C to stop all services.');
  } catch (error) {
    console.error('Failed to start the Express server:', error);
  }
}, 10000); // Give the Python server 10 seconds to start