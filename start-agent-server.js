/**
 * Start Agent Terminal Server
 * 
 * This script starts the agent-terminal-server.js in the background
 * and saves the process ID for easy shutdown.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Configuration
const SERVER_SCRIPT = 'agent-terminal-server.js';
const PID_FILE = 'agent-terminal-server.pid';

// Function to check if server is already running
function isServerRunning() {
  if (fs.existsSync(PID_FILE)) {
    try {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf-8').trim());
      
      // Check if process with this PID exists
      process.kill(pid, 0);
      return true;
    } catch (error) {
      // Process doesn't exist or we don't have permission
      return false;
    }
  }
  return false;
}

// Start the server if not already running
function startServer() {
  if (isServerRunning()) {
    console.log('Agent Terminal Server is already running');
    return;
  }
  
  console.log(`Starting ${SERVER_SCRIPT}...`);
  
  // Spawn the server process
  const server = spawn('node', [SERVER_SCRIPT], {
    detached: true,
    stdio: ['ignore', 'inherit', 'inherit']
  });
  
  // Save the process ID
  fs.writeFileSync(PID_FILE, server.pid.toString());
  
  console.log(`Agent Terminal Server started with PID ${server.pid}`);
  console.log(`To stop the server, run: node stop-agent-server.js`);
  
  // Unref to allow this script to exit while server keeps running
  server.unref();
}

// Run the start function
startServer();