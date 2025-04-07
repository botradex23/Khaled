/**
 * Simple Server Workflow for Replit
 * 
 * This script is meant to be executed by the Replit workflow system
 * to create a persistent simple server.
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const serverScriptPath = path.join(__dirname, 'simple-server.cjs');
const logFilePath = path.join(__dirname, 'simple-server.log');

console.log(`Starting simple server from ${serverScriptPath}`);
console.log(`Logs will be written to ${logFilePath}`);

// Ensure the server script exists
if (!fs.existsSync(serverScriptPath)) {
  console.error(`Error: Server script not found at ${serverScriptPath}`);
  process.exit(1);
}

// Start the server process
const serverProcess = spawn('node', [serverScriptPath], {
  stdio: ['ignore', 'pipe', 'pipe']
});

// Handle stdout
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  console.log(`Server: ${output}`);
  fs.appendFileSync(logFilePath, `[STDOUT] ${output}`);
});

// Handle stderr
serverProcess.stderr.on('data', (data) => {
  const error = data.toString();
  console.error(`Server error: ${error}`);
  fs.appendFileSync(logFilePath, `[STDERR] ${error}`);
});

// Handle process exit
serverProcess.on('close', (code) => {
  const message = `Server process exited with code ${code}`;
  console.log(message);
  fs.appendFileSync(logFilePath, `[INFO] ${message}\n`);
  
  // Keep the workflow running to maintain logs visible
  console.log('Keeping workflow alive...');
});

// Log the process ID
console.log(`Simple server started with PID: ${serverProcess.pid}`);

// Success message
console.log('Simple server is now running. Check logs for details.');
console.log(`You can check the logs at ${logFilePath}`);

// Keep the process running
process.stdin.resume();