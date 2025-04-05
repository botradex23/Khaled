// Run multiple servers in parallel
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting main server and Replit proxy server...');

// Start the main server
const mainServer = spawn('npm', ['run', 'dev'], {
  stdio: 'inherit',
  shell: true
});

// Wait a moment for the main server to start, then start the Replit server
setTimeout(() => {
  console.log('Starting Replit proxy server...');
  const replitServer = spawn('node', ['replit-server.js'], {
    stdio: 'inherit',
    shell: true
  });

  replitServer.on('error', (error) => {
    console.error('Failed to start Replit server:', error);
  });

  replitServer.on('exit', (code, signal) => {
    if (code !== 0) {
      console.error(`Replit server exited with code ${code} and signal ${signal}`);
    }
    // If Replit server exits, kill the main server too
    mainServer.kill();
    process.exit(code || 0);
  });
}, 5000);

mainServer.on('error', (error) => {
  console.error('Failed to start main server:', error);
  process.exit(1);
});

mainServer.on('exit', (code, signal) => {
  if (code !== 0) {
    console.error(`Main server exited with code ${code} and signal ${signal}`);
  }
  process.exit(code || 0);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('Stopping servers...');
  mainServer.kill();
  process.exit(0);
});