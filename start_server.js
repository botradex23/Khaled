/**
 * Optimized Server Startup Script
 * 
 * This script launches the server with optimized startup handling
 * and better timeout management for Replit workflows.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Settings
const SERVER_START_TIMEOUT = 120000; // 120 seconds
const PORT = process.env.PORT || 5000;
const DEV_COMMAND = 'tsx';
const DEV_ARGS = ['server/index.ts'];

/**
 * Helper to log with timestamp
 */
function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

/**
 * Check if server is responding on health endpoint
 */
async function checkServerHealth() {
  try {
    const response = await fetch(`http://localhost:${PORT}/api/health`);
    if (response.ok) {
      const data = await response.json();
      log(`Server health check passed: ${JSON.stringify(data)}`);
      return true;
    }
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Start the server
 */
function startServer() {
  log('Starting server process...');
  
  // Use cross-platform path to node_modules/.bin
  const nodeModulesBin = resolve(__dirname, 'node_modules', '.bin');
  const command = resolve(nodeModulesBin, DEV_COMMAND);
  
  log(`Spawning process: ${command} ${DEV_ARGS.join(' ')}`);
  
  // Spawn server process
  const serverProcess = spawn(command, DEV_ARGS, {
    stdio: 'inherit',
    env: { ...process.env }
  });
  
  // Handle process events
  serverProcess.on('error', (error) => {
    log(`Failed to start server: ${error.message}`);
    process.exit(1);
  });
  
  serverProcess.on('exit', (code, signal) => {
    if (code !== 0) {
      log(`Server process exited with code ${code} and signal ${signal}`);
      process.exit(code || 1);
    }
  });
  
  // Setup health check polling
  let startTime = Date.now();
  let isHealthy = false;
  
  const healthCheckInterval = setInterval(async () => {
    // Check if server is responding to health requests
    isHealthy = await checkServerHealth();
    
    if (isHealthy) {
      clearInterval(healthCheckInterval);
      log('Server started successfully and is accepting connections');
    } else if (Date.now() - startTime > SERVER_START_TIMEOUT) {
      clearInterval(healthCheckInterval);
      log(`Server failed to start within ${SERVER_START_TIMEOUT}ms timeout`);
      // Don't exit, let the server continue trying to start
    }
  }, 2000);
  
  // Keep the script running
  process.on('SIGINT', () => {
    log('Received SIGINT, shutting down server...');
    clearInterval(healthCheckInterval);
    serverProcess.kill('SIGINT');
    process.exit(0);
  });
}

// Start the server
startServer();