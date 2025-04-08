/**
 * Custom script to run the server with the correct Node.js path
 * and environment variables loaded
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Determine whether to use optimized startup
const USE_OPTIMIZED = true;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Node.js path (required for correct module resolution)
const nodePath = process.execPath;

// Prepare command arguments
const scriptToRun = USE_OPTIMIZED 
  ? resolve(__dirname, 'server', 'optimized-startup.ts')
  : resolve(__dirname, 'server', 'index.ts');

// Use tsx to run TypeScript file
const tsxPath = resolve(__dirname, 'node_modules', '.bin', 'tsx');

console.log(`Starting server with optimized=${USE_OPTIMIZED}...`);
console.log(`Node.js path: ${nodePath}`);
console.log(`Script to run: ${scriptToRun}`);

// Spawn the server process
const serverProcess = spawn(tsxPath, [scriptToRun], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_PATH: resolve(__dirname, 'node_modules')
  }
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
fs.writeFileSync(
  resolve(__dirname, USE_OPTIMIZED ? 'optimized-server.pid' : 'server.pid'), 
  String(serverProcess.pid)
);

// Handle termination signals
process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down server...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down server...');
  serverProcess.kill('SIGTERM');
});