/**
 * Run AI Agent Script
 * 
 * This script starts the AI Agent that monitors and maintains the system.
 * It compiles and runs the TypeScript agent code.
 */

// Import required modules
const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const AGENT_DIR = path.join(__dirname, 'agent');
const AGENT_ENTRY = path.join(AGENT_DIR, 'start.ts');
const LOG_FILE = path.join(__dirname, 'agent.log');

// Create log file stream
const logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' });

// Helper function to log with timestamp
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  logStream.write(logMessage + '\n');
}

// Install dependencies if needed
function installDependencies() {
  log('Checking agent dependencies...');
  
  return new Promise((resolve, reject) => {
    // Check if node_modules exists in agent directory
    if (!fs.existsSync(path.join(AGENT_DIR, 'node_modules'))) {
      log('Installing agent dependencies...');
      const install = exec('npm install', {
        cwd: AGENT_DIR
      });
      
      install.stdout.on('data', (data) => log(`npm: ${data.toString().trim()}`));
      install.stderr.on('data', (data) => log(`npm error: ${data.toString().trim()}`));
      
      install.on('close', (code) => {
        if (code === 0) {
          log('Dependencies installed successfully');
          resolve();
        } else {
          const errorMsg = `Failed to install dependencies (exit code: ${code})`;
          log(errorMsg);
          reject(new Error(errorMsg));
        }
      });
    } else {
      log('Dependencies already installed');
      resolve();
    }
  });
}

// Start the agent
function startAgent() {
  log('Starting AI Agent...');
  
  // Use ts-node from the agent's node_modules to run the TypeScript directly
  const tsNode = path.join(AGENT_DIR, 'node_modules', '.bin', 'ts-node');
  
  // Check if ts-node exists
  if (!fs.existsSync(tsNode)) {
    log(`Error: ts-node not found at ${tsNode}`);
    log('Attempting to run with node directly...');
    
    // Fallback to using the agent's start script, which should handle compilation
    const agent = spawn('node', ['agent/start.js'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    setupAgentProcess(agent);
  } else {
    // Use ts-node to run TypeScript directly
    const agent = spawn(tsNode, [AGENT_ENTRY], {
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: true
    });
    
    setupAgentProcess(agent);
  }
}

// Setup agent process event handling
function setupAgentProcess(agent) {
  // Capture and log output
  agent.stdout.on('data', (data) => log(`Agent: ${data.toString().trim()}`));
  agent.stderr.on('data', (data) => log(`Agent error: ${data.toString().trim()}`));
  
  // Handle process events
  agent.on('error', (err) => {
    log(`Failed to start agent: ${err.message}`);
  });
  
  agent.on('exit', (code, signal) => {
    log(`Agent exited with code ${code} and signal ${signal}`);
    
    // Automatically restart agent if it crashes
    if (code !== 0 && code !== null) {
      log('Restarting agent in 5 seconds...');
      setTimeout(startAgent, 5000);
    }
  });
  
  // Log successful start
  log('AI Agent started successfully');
}

// Main execution
log('Initializing AI Agent...');

// Run the initialization and start sequence
installDependencies()
  .then(startAgent)
  .catch((err) => {
    log(`Error initializing agent: ${err.message}`);
    process.exit(1);
  });

// Handle clean shutdown
process.on('SIGINT', () => {
  log('Shutting down AI Agent...');
  logStream.end();
  process.exit(0);
});