#!/usr/bin/env node

/**
 * Agent Server Watchdog
 * 
 * This script monitors the agent server and ensures it's always running.
 * If the server crashes or becomes unresponsive, the watchdog automatically restarts it.
 * It can be run as a daemon using PM2 or a similar process manager.
 */

const { exec, spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Configuration
const AGENT_SERVER_SCRIPT = './agent-terminal-server.js';
const AGENT_SERVER_PORT = 5021;
const AGENT_SERVER_PID_FILE = 'agent-terminal-server.pid';
const CHECK_INTERVAL = 30000; // Check every 30 seconds
const LOG_FILE = 'logs/agent-watchdog.log';
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_COOLDOWN = 120000; // 2 minutes cooldown after max restarts

// Ensure logs directory exists
try {
  if (!fs.existsSync('logs')) {
    fs.mkdirSync('logs', { recursive: true });
  }
} catch (error) {
  console.error('Failed to create logs directory:', error);
}

// Setup logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  
  if (isError) {
    console.error(logMessage);
  } else {
    console.log(logMessage);
  }
  
  // Also write to log file
  try {
    fs.appendFileSync(LOG_FILE, logMessage);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

// Initialize restart tracking
let restartAttempts = 0;
let lastRestartTime = 0;

// Check if the server is running via PID file
function isServerRunningByPid() {
  try {
    if (fs.existsSync(AGENT_SERVER_PID_FILE)) {
      const pid = fs.readFileSync(AGENT_SERVER_PID_FILE, 'utf8').trim();
      
      try {
        // Check if process exists
        process.kill(pid, 0);
        return true;
      } catch (e) {
        // Process doesn't exist
        log(`Process with PID ${pid} not found, removing stale PID file`);
        fs.unlinkSync(AGENT_SERVER_PID_FILE);
        return false;
      }
    }
    return false;
  } catch (error) {
    log(`Error checking PID file: ${error.message}`, true);
    return false;
  }
}

// Check if the server is responding to HTTP requests
function checkServerHealth() {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port: AGENT_SERVER_PORT,
      path: '/health',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      if (res.statusCode === 200) {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            if (response && response.status === 'ok') {
              resolve(true);
            } else {
              resolve(false);
            }
          } catch (e) {
            log(`Error parsing server response: ${e.message}`, true);
            resolve(false);
          }
        });
      } else {
        resolve(false);
      }
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    
    req.end();
  });
}

// Start the server using the control script
function startServer() {
  return new Promise((resolve) => {
    exec('./agent-server-control.sh start', (error, stdout, stderr) => {
      if (error) {
        log(`Failed to start server: ${error.message}`, true);
        log(`stderr: ${stderr}`, true);
        resolve(false);
      } else {
        log(`Server start command output: ${stdout}`);
        resolve(true);
      }
    });
  });
}

// Start the server directly
function startServerDirect() {
  return new Promise((resolve) => {
    try {
      log('Starting agent server directly...');
      
      // Make sure we have Node.js environment
      process.env.AGENT_PORT = AGENT_SERVER_PORT.toString();
      
      // Start the server as a detached process
      const serverProcess = spawn('node', [AGENT_SERVER_SCRIPT], {
        detached: true,
        stdio: ['ignore', 
          fs.openSync('logs/agent-server-out.log', 'a'),
          fs.openSync('logs/agent-server-error.log', 'a')
        ],
        env: { ...process.env }
      });
      
      // Unref the child process so the parent can exit independently
      serverProcess.unref();
      
      log(`Started agent server with PID: ${serverProcess.pid}`);
      
      // Wait a moment to see if it starts successfully
      setTimeout(async () => {
        const isRunning = await checkServerHealth();
        if (isRunning) {
          log('Server started successfully and is responding to health checks');
          resolve(true);
        } else {
          log('Server started but is not responding to health checks', true);
          resolve(false);
        }
      }, 5000);
    } catch (error) {
      log(`Error starting server directly: ${error.message}`, true);
      resolve(false);
    }
  });
}

// Stop the server using the control script
function stopServer() {
  return new Promise((resolve) => {
    exec('./agent-server-control.sh stop', (error, stdout, stderr) => {
      if (error) {
        log(`Failed to stop server: ${error.message}`, true);
        log(`stderr: ${stderr}`, true);
        resolve(false);
      } else {
        log(`Server stop command output: ${stdout}`);
        resolve(true);
      }
    });
  });
}

// Restart the server
async function restartServer() {
  const now = Date.now();
  
  // Check if we're in the cooldown period
  if (restartAttempts >= MAX_RESTART_ATTEMPTS && (now - lastRestartTime) < RESTART_COOLDOWN) {
    log(`Reached maximum restart attempts (${MAX_RESTART_ATTEMPTS}). In cooldown period, skipping restart.`, true);
    return false;
  }
  
  // If we've passed the cooldown period, reset the counter
  if ((now - lastRestartTime) > RESTART_COOLDOWN) {
    restartAttempts = 0;
  }
  
  restartAttempts++;
  lastRestartTime = now;
  
  log(`Attempting to restart server (attempt ${restartAttempts}/${MAX_RESTART_ATTEMPTS})...`);
  
  // First try to stop the server properly
  await stopServer();
  
  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Try to start using control script first
  let result = await startServer();
  
  // If that fails, try direct approach
  if (!result) {
    log('Failed to start server using control script, trying direct approach...', true);
    result = await startServerDirect();
  }
  
  return result;
}

// Main monitoring function
async function monitorServer() {
  log('Agent server watchdog started');
  
  // Main monitoring loop
  while (true) {
    try {
      const isPidRunning = isServerRunningByPid();
      const isHealthy = await checkServerHealth();
      
      if (!isPidRunning || !isHealthy) {
        log(`Server check failed. PID check: ${isPidRunning}, Health check: ${isHealthy}`, true);
        const restartResult = await restartServer();
        log(`Server restart ${restartResult ? 'successful' : 'failed'}`);
      } else {
        log('Server is running properly');
      }
    } catch (error) {
      log(`Error in monitoring: ${error.message}`, true);
    }
    
    // Wait for the next check
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// Start the monitoring
monitorServer().catch(error => {
  log(`Fatal error in watchdog: ${error.message}`, true);
  process.exit(1);
});