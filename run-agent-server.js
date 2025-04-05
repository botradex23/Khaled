/**
 * Run direct agent server
 * 
 * This script starts the direct agent server on port 5002
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting direct agent server...');

const serverProcess = spawn('node', ['direct-agent-server.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit'
});

serverProcess.on('error', (err) => {
  console.error('Failed to start direct agent server:', err);
});

process.on('SIGINT', () => {
  console.log('Stopping direct agent server...');
  serverProcess.kill('SIGINT');
  process.exit(0);
});