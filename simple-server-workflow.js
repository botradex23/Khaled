/**
 * Simple Server Workflow for Replit
 * 
 * This script is meant to be executed by the Replit workflow system
 * to create a persistent simple server.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const serverScriptPath = path.join(__dirname, 'simple-server.js');
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
  detached: true,
  stdio: ['ignore', 
    fs.openSync(logFilePath, 'a'),
    fs.openSync(logFilePath, 'a')
  ]
});

// Log the process ID
console.log(`Simple server started with PID: ${serverProcess.pid}`);

// Detach the process so it keeps running even if the parent script exits
serverProcess.unref();

// Success message
console.log('Simple server is now running in the background');
console.log(`You can check the logs at ${logFilePath}`);