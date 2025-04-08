/**
 * Run Agent Terminal Server
 * 
 * This script starts the agent terminal server which allows interaction with the
 * OpenAI agent via curl commands for file operations and chat.
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { config } from 'dotenv';

// Load environment variables
config();

// Configuration
const SERVER_SCRIPT = './agent-terminal-server.js';
const PID_FILE = './agent-terminal-server.pid';
const PORT = process.env.AGENT_PORT || 5002;

// Check if the server script exists
if (!existsSync(SERVER_SCRIPT)) {
  console.error(`❌ Server script not found: ${SERVER_SCRIPT}`);
  process.exit(1);
}

// Check for OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️ OPENAI_API_KEY is not set in environment variables');
  console.warn('The server will start but OpenAI functionality will not work');
}

// Start the server
console.log(`🚀 Starting Agent Terminal Server...`);

const server = spawn('node', [SERVER_SCRIPT], {
  detached: true,
  stdio: 'inherit'
});

// Write the PID to file
const fs = await import('fs').then(module => module.promises);
await fs.writeFile(PID_FILE, String(server.pid || 'unknown'));

console.log(`✅ Server started on port ${PORT} with PID ${server.pid}`);
console.log(`To stop the server, run: node stop-agent-terminal.js`);

// Unref the child process to allow the parent to exit
server.unref();