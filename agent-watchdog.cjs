/**
 * Agent Server Watchdog
 * 
 * This script monitors the agent server process and restarts it if it fails.
 * It's designed to run as a CommonJS module for compatibility with cron jobs.
 */

const fs = require('fs');
const { spawn, exec } = require('child_process');

// Constants
const PID_FILE = './agent-server.pid';
const LOG_FILE = './agent-server.log';
const START_SCRIPT = 'node start-agent-server.js';

/**
 * Check if the server process is running
 * @returns {boolean} True if the process is running, false otherwise
 */
function isServerRunning() {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, 'utf8'));
      
      // Check if process is running
      try {
        process.kill(pid, 0);
        console.log(`[Watchdog] Agent server is running with PID ${pid}`);
        return true;
      } catch (e) {
        console.log(`[Watchdog] Found stale PID file. Server is not running.`);
        return false;
      }
    }
  } catch (error) {
    console.error(`[Watchdog] Error checking server status:`, error);
  }
  
  console.log(`[Watchdog] No PID file found. Server is not running.`);
  return false;
}

/**
 * Start the agent server
 */
function startServer() {
  try {
    console.log(`[Watchdog] Starting agent server...`);
    
    // Execute the start script
    exec(START_SCRIPT, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Watchdog] Error starting server: ${error.message}`);
        return;
      }
      
      if (stderr) {
        console.error(`[Watchdog] Server stderr: ${stderr}`);
      }
      
      console.log(`[Watchdog] Server started: ${stdout}`);
    });
    
  } catch (error) {
    console.error(`[Watchdog] Exception starting server:`, error);
  }
}

/**
 * Clean up stale PID file if needed
 */
function cleanupStalePidFile() {
  try {
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
      console.log(`[Watchdog] Removed stale PID file`);
    }
  } catch (error) {
    console.error(`[Watchdog] Error cleaning up PID file:`, error);
  }
}

/**
 * Main watchdog function
 */
function watchdog() {
  console.log(`[Watchdog] Running agent server watchdog check at ${new Date().toISOString()}`);
  
  if (!isServerRunning()) {
    console.log(`[Watchdog] Agent server is not running. Cleaning up and restarting...`);
    cleanupStalePidFile();
    startServer();
  }
}

// Run the watchdog check
watchdog();

// If this script is run directly (not imported)
if (require.main === module) {
  console.log(`[Watchdog] Running in standalone mode`);
  
  // Set up recurring check if needed
  if (process.argv.includes('--watch')) {
    const interval = 60000; // 1 minute
    console.log(`[Watchdog] Setting up recurring check every ${interval/1000} seconds`);
    setInterval(watchdog, interval);
  }
}