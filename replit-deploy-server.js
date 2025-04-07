/**
 * Replit Deployment Server
 * 
 * This is a special deployment server for Replit that ensures the application
 * is properly accessible via the Replit URL.
 */
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Create Express app for proxy server
const app = express();

// Port settings
const targetPort = parseInt(process.env.PORT || '5000', 10); // Original server port
const proxyPort = 3000; // Replit expected port

// Detect Replit environment
const isReplit = process.env.REPL_ID || process.env.REPLIT_ID || process.env.REPLIT;
const replitSlug = process.env.REPL_SLUG;
const replitOwner = process.env.REPL_OWNER;

// Set up enhanced error handling
app.use((err, req, res, next) => {
  console.error('Proxy error:', err);
  res.status(500).send('Proxy error: ' + err.message);
});

// Create proxy middleware to forward requests to the main application
app.use('/', createProxyMiddleware({
  target: `http://localhost:${targetPort}`,
  changeOrigin: true,
  ws: true, // Enable WebSocket proxying
  logLevel: 'debug',
  // Handle proxy errors to prevent crashes
  onError: (err, req, res) => {
    console.error('Proxy request error:', err);
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Application seems to be offline or starting up. Please try again in a few moments.');
  }
}));

// Start server
app.listen(proxyPort, '0.0.0.0', () => {
  console.log(`Replit deployment server running on port ${proxyPort}`);
  console.log(`Proxying requests to main application on port ${targetPort}`);
  
  if (isReplit) {
    console.log('Running in Replit environment');
    if (replitSlug && replitOwner) {
      console.log(`Replit URL: https://${replitSlug}.${replitOwner}.repl.co`);
    }
  }
  
  // Print environment information for debugging
  console.log('\nEnvironment Variables:');
  console.log(`PORT: ${process.env.PORT}`);
  console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
  console.log(`REPLIT_HOSTNAME: ${process.env.REPLIT_HOSTNAME}`);
  console.log(`GOOGLE_CALLBACK_URL: ${process.env.GOOGLE_CALLBACK_URL}`);
  
  console.log('\nServer ready to accept connections');
});