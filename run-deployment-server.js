/**
 * Run Replit Deployment Server
 * 
 * This script starts both the main application and the Replit deployment server
 * to ensure the application is accessible through Replit's WebView.
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const readline = require('readline');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Configure ports
const appPort = process.env.PORT || '5000';
const proxyPort = '3000'; // Replit's expected port

console.log(`Starting application in Replit environment`);
console.log(`Main app will run on port ${appPort}`);
console.log(`Proxy server will run on port ${proxyPort}`);

// Function to start the main application
function startMainApp() {
  console.log('Starting main application...');
  
  // Use npm run dev to start the main app
  const mainApp = spawn('npm', ['run', 'dev'], {
    stdio: 'pipe',
    env: { ...process.env, PORT: appPort }
  });
  
  // Handle output
  mainApp.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[Main App] ${output}`);
  });
  
  mainApp.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(`[Main App Error] ${output}`);
  });
  
  // Handle process exit
  mainApp.on('close', (code) => {
    console.log(`Main application process exited with code ${code}`);
    process.exit(code);
  });
  
  return mainApp;
}

// Function to start the deployment server
function startDeploymentServer() {
  console.log('Starting deployment server...');
  
  // Start the Replit deployment server
  const deployServer = spawn('node', ['replit-deploy-server.js'], {
    stdio: 'pipe',
    env: { ...process.env, PORT: appPort }
  });
  
  // Handle output
  deployServer.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(`[Deploy Server] ${output}`);
  });
  
  deployServer.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(`[Deploy Server Error] ${output}`);
  });
  
  // Handle process exit
  deployServer.on('close', (code) => {
    console.log(`Deployment server process exited with code ${code}`);
  });
  
  return deployServer;
}

// Start both processes
const mainApp = startMainApp();
const deployServer = startDeploymentServer();

// Handle cleanup on process exit
process.on('SIGINT', () => {
  console.log('Shutting down all processes...');
  mainApp.kill();
  deployServer.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down all processes...');
  mainApp.kill();
  deployServer.kill();
  process.exit(0);
});