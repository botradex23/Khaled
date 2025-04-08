/**
 * Start Agent Server
 * 
 * This script starts the standalone agent server using Node.js
 * with proper setup for ES modules.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

// Constants
const SERVER_SCRIPT = './server/standalone-agent-server.js';
const LOG_FILE = './agent-server.log';
const PID_FILE = './agent-server.pid';

// Check if the server is already running
function isServerRunning() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      
      // Check if process is running
      try {
        process.kill(pid, 0);
        console.log(`Agent server is already running with PID ${pid}`);
        return true;
      } catch (e) {
        console.log(`Found stale PID file. Server is not running.`);
        fs.unlinkSync(PID_FILE);
        return false;
      }
    }
  } catch (error) {
    console.error(`Error checking server status:`, error);
  }
  
  return false;
}

// Start the agent server
function startServer() {
  try {
    // Create log file stream
    const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });
    
    // Start the server as a child process
    const server = spawn('node', [SERVER_SCRIPT], {
      detached: true,
      stdio: ['ignore', logStream, logStream]
    });
    
    // Detach the child process
    server.unref();
    
    console.log(`Agent server started with PID ${server.pid}`);
    console.log(`Logs are being written to ${LOG_FILE}`);
    
  } catch (error) {
    console.error(`Error starting agent server:`, error);
    process.exit(1);
  }
}

// Main execution
if (!isServerRunning()) {
  startServer();
}