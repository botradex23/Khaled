/**
 * Replit Server Startup Script
 * 
 * This script starts the Express server with proper port configuration for Replit
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Environment variable configuration
process.env.PORT = process.env.PORT || '3000';
process.env.REPLIT_HOSTNAME = process.env.REPLIT_HOSTNAME || '19672ae6-76ec-438b-bcbb-ffac6b7f8d7b-00-3hmbhopvnwpnm.picard.replit.dev';
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Add this environment variable to ensure Vite binds to 0.0.0.0
process.env.HOST = '0.0.0.0';

console.log('Starting server with the following configuration:');
console.log(`Port: ${process.env.PORT}`);
console.log(`Replit Hostname: ${process.env.REPLIT_HOSTNAME}`);
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`HOST: ${process.env.HOST}`);

// Function to start the server
function startServer() {
  try {
    console.log('Starting server with npm run dev...');
    
    // Start the server using npm run dev
    const result = execSync('npm run dev', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        HOST: '0.0.0.0', // Ensure Vite binds to all interfaces
        PORT: process.env.PORT,
        REPLIT_HOSTNAME: process.env.REPLIT_HOSTNAME
      }
    });
    
    console.log('Server started successfully');
    return true;
  } catch (error) {
    console.error('Error starting server:', error.message);
    return false;
  }
}

// Start the server
startServer();