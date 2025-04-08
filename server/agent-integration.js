/**
 * Agent API Integration
 * 
 * This module sets up the OpenAI Agent integration with the main application.
 * It provides a bridge between the Express server and the agent functionality.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import fetch from 'node-fetch';
import { spawn } from 'child_process';

// Setup module path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Agent server info
const AGENT_SERVER_URL = 'http://localhost:3021';
const AGENT_SERVER_SCRIPT = path.join(__dirname, 'standalone-agent-server.js');
const AGENT_LOG_FILE = path.join(process.cwd(), 'agent.log');
const AGENT_PID_FILE = path.join(process.cwd(), 'agent-server.pid');

// Logging utility
function log(message, type = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [AGENT] [${type}] ${message}`;
  console.log(logMessage);
  
  // Append to log file
  try {
    fs.appendFileSync(AGENT_LOG_FILE, logMessage + '\n', 'utf8');
  } catch (error) {
    console.error(`Error writing to agent log file: ${error.message}`);
  }
}

/**
 * Check if the agent server is running
 * @returns {Promise<boolean>} True if the server is running
 */
async function isAgentServerRunning() {
  try {
    const response = await fetch(`${AGENT_SERVER_URL}/agent-api/health`, {
      method: 'GET',
      timeout: 1000
    });
    
    if (response.ok) {
      const data = await response.json();
      log(`Agent server is running with PID ${data.pid}`);
      return true;
    }
  } catch (error) {
    log(`Agent server is not running: ${error.message}`, 'WARN');
  }
  
  return false;
}

/**
 * Start the agent server as a standalone process
 * @returns {Promise<boolean>} True if the server was started
 */
async function startAgentServer() {
  try {
    log('Starting agent server...');
    
    // Create log file stream
    const logStream = fs.createWriteStream(AGENT_LOG_FILE, { flags: 'a' });
    
    // Start server as a detached process
    const server = spawn('node', [AGENT_SERVER_SCRIPT], {
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    
    // Pipe output to our log file
    if (server.stdout) server.stdout.pipe(logStream);
    if (server.stderr) server.stderr.pipe(logStream);
    
    // Detach the child process
    server.unref();
    
    log(`Agent server started with PID ${server.pid}`);
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return await isAgentServerRunning();
  } catch (error) {
    log(`Failed to start agent server: ${error.message}`, 'ERROR');
    return false;
  }
}

/**
 * Initialize the agent integration
 * @param {express.Express} app - The Express application
 */
export async function initializeAgentIntegration(app) {
  try {
    log('Initializing Agent Integration...');
    
    // Check if the agent server is already running
    let serverRunning = await isAgentServerRunning();
    
    // Start the server if it's not running
    if (!serverRunning) {
      serverRunning = await startAgentServer();
    }
    
    if (serverRunning) {
      log('Agent server is running. Integration complete.');
    } else {
      log('Failed to start agent server. Integration may be incomplete.', 'WARN');
    }
    
    // Proxy health endpoint (doesn't rely on the agent server)
    app.get('/api/agent-legacy-status', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Agent integration is active',
        serverRunning,
        timestamp: new Date().toISOString()
      });
    });
    
    log('Agent Integration initialized successfully');
    return true;
  } catch (error) {
    log(`Agent Integration failed: ${error.message}`, 'ERROR');
    return false;
  }
}

// Default export
export default { initializeAgentIntegration };