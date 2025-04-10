/**
 * Direct API Server Launcher
 * 
 * This script launches a direct API server on port 5002
 * to provide access to agent APIs without Vite middleware interference.
 */

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Define the TypeScript file to run
const apiServerFile = path.join(__dirname, 'src', 'direct-api-server.ts');

// Check if the file exists
if (!fs.existsSync(apiServerFile)) {
  console.error(`Error: API server file not found at ${apiServerFile}`);
  process.exit(1);
}

console.log('Starting direct API server...');
console.log(`Using TypeScript file: ${apiServerFile}`);

// Use tsx to run the TypeScript file directly
const child = exec(`npx tsx ${apiServerFile}`, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error starting API server: ${error.message}`);
    return;
  }
  
  if (stderr) {
    console.error(`API server error: ${stderr}`);
  }
});

// Forward stdout and stderr
child.stdout.on('data', (data) => {
  console.log(data.toString().trim());
});

child.stderr.on('data', (data) => {
  console.error(data.toString().trim());
});

child.on('close', (code) => {
  console.log(`API server process exited with code ${code}`);
});

console.log('API server process started. Press Ctrl+C to stop.');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down API server...');
  child.kill();
  process.exit(0);
});