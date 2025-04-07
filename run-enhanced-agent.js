/**
 * Enhanced Agent Startup Script
 * 
 * This script starts the enhanced agent server with proper environment detection
 * for both Replit and external VPS deployment.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if running in Replit or VPS
const isReplit = process.env.REPL_ID !== undefined || process.env.REPL_OWNER !== undefined;
console.log(`Running in ${isReplit ? 'Replit' : 'VPS/external'} environment`);

// Ensure log directory exists
const logDir = resolve(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
  console.log(`Created log directory: ${logDir}`);
}

// Configure log file
const timestamp = new Date().toISOString().replace(/:/g, '-');
const logFile = resolve(logDir, `agent-${timestamp}.log`);
console.log(`Log file will be: ${logFile}`);

// Create log stream
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log startup information
const logStartupInfo = () => {
  const startupInfo = [
    '='.repeat(80),
    `AGENT SERVER STARTUP - ${new Date().toISOString()}`,
    '='.repeat(80),
    `Environment: ${isReplit ? 'Replit' : 'VPS/external'}`,
    `Node version: ${process.version}`,
    `Working directory: ${process.cwd()}`,
    `OpenAI API key present: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`,
    '='.repeat(80),
    ''
  ].join('\n');
  
  logStream.write(startupInfo);
  console.log(startupInfo);
};

// Log startup information
logStartupInfo();

// Start the server process
console.log('Starting enhanced agent server...');

// Create a server process
const serverProcess = spawn('node', ['enhanced-agent-server.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: ['inherit', 'pipe', 'pipe']
});

// Handle process output
serverProcess.stdout.on('data', (data) => {
  const output = data.toString();
  process.stdout.write(output);
  logStream.write(output);
});

serverProcess.stderr.on('data', (data) => {
  const output = data.toString();
  process.stderr.write(output);
  logStream.write(`[ERROR] ${output}`);
});

// Handle process events
serverProcess.on('error', (err) => {
  const errorMsg = `Failed to start enhanced agent server: ${err.message}`;
  console.error(errorMsg);
  logStream.write(`[CRITICAL] ${errorMsg}\n`);
});

serverProcess.on('exit', (code, signal) => {
  const exitMsg = `Agent server exited with code ${code} and signal ${signal}`;
  console.log(exitMsg);
  logStream.write(`[EXIT] ${exitMsg}\n`);
  
  // Close the log stream
  logStream.end();
});

// Handle process signals
process.on('SIGINT', () => {
  console.log('Received SIGINT signal, stopping enhanced agent server...');
  logStream.write('[SIGNAL] Received SIGINT signal\n');
  serverProcess.kill('SIGINT');
  // Allow some time for clean shutdown before exiting
  setTimeout(() => {
    logStream.end();
    process.exit(0);
  }, 1000);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, stopping enhanced agent server...');
  logStream.write('[SIGNAL] Received SIGTERM signal\n');
  serverProcess.kill('SIGTERM');
  // Allow some time for clean shutdown before exiting
  setTimeout(() => {
    logStream.end();
    process.exit(0);
  }, 1000);
});

// Create pid file
const pidFile = resolve(__dirname, 'agent-server.pid');
fs.writeFileSync(pidFile, serverProcess.pid.toString());
console.log(`Created PID file: ${pidFile} with PID: ${serverProcess.pid}`);