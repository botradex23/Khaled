// A simple script to start the Node.js server
import { exec } from 'child_process';

console.log('Starting the application...');

// Start the Node.js server
const server = exec('node simple_node_server.cjs');

server.stdout.on('data', (data) => {
  console.log(`Server: ${data}`);
});

server.stderr.on('data', (data) => {
  console.error(`Server error: ${data}`);
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

console.log('Application started!');