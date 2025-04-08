/**
 * Run Servers Script
 * 
 * This script starts both the optimized Node.js server and the Python ML server.
 * It's designed to be used as a drop-in replacement for the default npm run dev command.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve, join } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Record start time for performance measurements
const startTime = Date.now();

console.log('Starting servers with optimized configuration...');
console.log(`Start time: ${new Date(startTime).toISOString()}`);

// Function to start the Node.js server with optimized settings
function startNodeServer() {
  // Use tsx to run TypeScript file
  const tsxPath = resolve(__dirname, 'node_modules', '.bin', 'tsx');
  const scriptToRun = resolve(__dirname, 'server', 'optimized-startup.ts');
  
  console.log(`Starting Node.js server with optimized settings...`);
  console.log(`Script: ${scriptToRun}`);
  
  // Start the server process
  const serverProcess = spawn(tsxPath, [scriptToRun], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_PATH: resolve(__dirname, 'node_modules')
    }
  });
  
  // Save the PID for later cleanup
  fs.writeFileSync(
    resolve(__dirname, 'node-server.pid'), 
    String(serverProcess.pid)
  );
  
  // Handle server events
  serverProcess.on('close', (code) => {
    console.log(`Node.js server process exited with code ${code}`);
    
    // Only exit the main process if the Python server is not running
    if (!pythonProcess || pythonProcess.exitCode !== null) {
      process.exit(code || 0);
    }
  });
  
  serverProcess.on('error', (err) => {
    console.error('Failed to start Node.js server process:', err);
    
    // Only exit the main process if the Python server is not running
    if (!pythonProcess || pythonProcess.exitCode !== null) {
      process.exit(1);
    }
  });
  
  return serverProcess;
}

// Function to start the Python ML server with deferred startup
function startPythonServer() {
  const pythonPath = 'python3'; // Use python3 to ensure we get the Python 3.x interpreter
  const scriptPath = resolve(__dirname, 'python_app', 'standalone.py');
  
  console.log(`Starting Python ML server with deferred initialization...`);
  console.log(`Script: ${scriptPath}`);
  
  // Start the Python server process with a flag to enable deferred initialization
  const pythonProcess = spawn(pythonPath, [scriptPath, '--deferred-init'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONPATH: __dirname, // Add the current directory to PYTHONPATH to help imports
      DEFERRED_INITIALIZATION: 'true',
      PYTHONUNBUFFERED: '1' // Ensure Python output is not buffered
    }
  });
  
  // Save the PID for later cleanup
  fs.writeFileSync(
    resolve(__dirname, 'python-server.pid'), 
    String(pythonProcess.pid)
  );
  
  // Handle Python server events
  pythonProcess.on('close', (code) => {
    console.log(`Python ML server process exited with code ${code}`);
    
    // Only exit the main process if the Node.js server is not running
    if (!nodeProcess || nodeProcess.exitCode !== null) {
      process.exit(code || 0);
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python ML server process:', err);
    
    // Only exit the main process if the Node.js server is not running
    if (!nodeProcess || nodeProcess.exitCode !== null) {
      process.exit(1);
    }
  });
  
  return pythonProcess;
}

// Start both servers
const nodeProcess = startNodeServer();
const pythonProcess = startPythonServer();

// Log startup completion
const startupTime = Date.now() - startTime;
console.log(`Both servers started in ${startupTime}ms`);

// Handle termination signals
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down all servers...');
  nodeProcess.kill('SIGINT');
  pythonProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down all servers...');
  nodeProcess.kill('SIGTERM');
  pythonProcess.kill('SIGTERM');
});