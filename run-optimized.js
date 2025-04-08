/**
 * Run Optimized Server
 * 
 * This script starts the application with the optimized startup script
 * to improve loading time and avoid timeouts in Replit.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Define the command to run the optimized startup script
const command = 'tsx';
const args = ['server/optimized-startup.ts'];

console.log('Starting optimized server...');
console.log(`Command: ${command} ${args.join(' ')}`);

// Spawn the server process
const serverProcess = spawn(command, args, {
  stdio: 'inherit',
  env: process.env
});

// Handle process events
serverProcess.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
  process.exit(code || 0);
});

serverProcess.on('error', (err) => {
  console.error('Failed to start server process:', err);
  process.exit(1);
});

// Save the process ID to a file for potential cleanup later
fs.writeFileSync(resolve(__dirname, 'optimized-server.pid'), String(serverProcess.pid));

// Handle termination signals
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server...');
  serverProcess.kill('SIGTERM');
});