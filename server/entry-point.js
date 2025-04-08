/**
 * Server Entry Point
 * 
 * This script determines whether to use the standard or optimized startup script
 * based on environment variables or command line arguments.
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for specific environment variable or command line flag
const useOptimized = process.env.USE_OPTIMIZED === 'true' || 
                     process.argv.includes('--optimized');

// Define the command to run the appropriate startup script
const command = 'tsx';
const args = useOptimized 
  ? ['server/optimized-startup.ts'] 
  : ['server/index.ts'];

console.log(`Starting server in ${useOptimized ? 'optimized' : 'standard'} mode...`);
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
const pidFileName = useOptimized ? 'optimized-server.pid' : 'server.pid';
fs.writeFileSync(resolve(__dirname, '..', pidFileName), String(serverProcess.pid));

// Handle termination signals
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server...');
  serverProcess.kill('SIGTERM');
});