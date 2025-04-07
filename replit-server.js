/**
 * Replit Express Server
 * 
 * This is a special server configuration for Replit that ensures the application
 * is properly accessible via the Replit URL.
 */

import express from 'express';
import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { createProxyMiddleware } from 'http-proxy-middleware';
import child_process from 'child_process';
import net from 'net';
import fs from 'fs';

// Load environment variables
dotenv.config();

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to check if a port is in use
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
};

// Start the main application server if it's not already running
const startMainServer = async () => {
  const mainServerPort = 5000;
  const isMainServerRunning = await isPortInUse(mainServerPort);
  
  if (!isMainServerRunning) {
    console.log('Starting main application server...');
    const serverProcess = child_process.spawn('tsx', ['server/index.ts'], {
      stdio: 'inherit',
      detached: true,
      shell: true
    });
    
    // Log server start
    serverProcess.on('spawn', () => {
      console.log(`Main server started with PID ${serverProcess.pid}`);
    });
    
    // Handle errors
    serverProcess.on('error', (err) => {
      console.error(`Failed to start main server: ${err.message}`);
    });
    
    // Don't wait for server to exit
    serverProcess.unref();
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 5000));
  } else {
    console.log('Main application server is already running');
  }
};

// Start the agent server if it's not already running
const startAgentServer = async () => {
  const agentServerPort = 5002;
  const isAgentServerRunning = await isPortInUse(agentServerPort);
  
  if (!isAgentServerRunning) {
    console.log('Starting agent server...');
    const agentProcess = child_process.spawn('node', ['run-agent-server.js'], {
      stdio: 'inherit',
      detached: true,
      shell: true
    });
    
    // Log server start
    agentProcess.on('spawn', () => {
      console.log(`Agent server started with PID ${agentProcess.pid}`);
    });
    
    // Handle errors
    agentProcess.on('error', (err) => {
      console.error(`Failed to start agent server: ${err.message}`);
    });
    
    // Don't wait for server to exit
    agentProcess.unref();
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 3000));
  } else {
    console.log('Agent server is already running');
  }
};

// Enhanced health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'replit-proxy',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize servers
(async () => {
  try {
    await startMainServer();
    await startAgentServer();
    
    // Configure proxies after servers are started
    console.log('Setting up proxy middleware...');
    
    // Define proxy options
    const mainApiTarget = 'http://localhost:5000';
    const agentApiTarget = 'http://localhost:5002';
    
    // Check if client directory exists
    const clientDir = path.join(__dirname, 'client');
    const clientDirExists = fs.existsSync(clientDir);
    if (!clientDirExists) {
      console.warn(`Client directory not found at ${clientDir}`);
      // Creating directory to avoid issues
      fs.mkdirSync(clientDir, { recursive: true });
      console.log(`Created client directory at ${clientDir}`);
    }
    
    // Create index.html if it doesn't exist
    const indexFile = path.join(clientDir, 'index.html');
    if (!fs.existsSync(indexFile)) {
      console.warn(`Index file not found at ${indexFile}`);
      const basicHtml = `<!DOCTYPE html>
<html>
<head>
  <title>Tradeliy - Loading</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      display: flex; 
      justify-content: center; 
      align-items: center; 
      height: 100vh; 
      margin: 0;
      background: #f5f5f5;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 20px auto;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <h2>Tradeliy</h2>
    <div class="spinner"></div>
    <p>Loading application...</p>
  </div>
</body>
</html>`;
      fs.writeFileSync(indexFile, basicHtml);
      console.log(`Created basic index.html file at ${indexFile}`);
    }
    
    // Proxy to the main API server
    try {
      const mainApiProxy = createProxyMiddleware('/api', {
        target: mainApiTarget,
        changeOrigin: true,
        logLevel: 'info',
        pathRewrite: (path) => {
          console.log(`Proxying request to main API: ${path}`);
          return path;
        },
        onProxyRes: (proxyRes, req, res) => {
          console.log(`Proxy response from main API: ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
          console.error('Error connecting to main API server:', err.message);
          res.status(500).json({ error: 'API server connection error', details: err.message });
        }
      });
      
      // Proxy to the agent server
      const agentApiProxy = createProxyMiddleware(['/api/my-agent', '/api/direct-agent'], {
        target: agentApiTarget,
        changeOrigin: true,
        logLevel: 'info',
        pathRewrite: (path) => {
          console.log(`Proxying request to agent API: ${path}`);
          return path;
        },
        onProxyRes: (proxyRes, req, res) => {
          console.log(`Proxy response from agent API: ${proxyRes.statusCode}`);
        },
        onError: (err, req, res) => {
          console.error('Error connecting to agent API server:', err.message);
          res.status(500).json({ error: 'Agent API server connection error', details: err.message });
        }
      });
      
      // Register proxies
      app.use(mainApiProxy);
      app.use(agentApiProxy);
      console.log('Proxy middleware setup successful');
    } catch (err) {
      console.error('Failed to set up proxy middleware:', err);
    }
    
    // Serve static files from the client directory
    app.use(express.static(path.join(__dirname, 'client')));
    
    // SPA fallback
    app.get('*', (req, res) => {
      console.log(`Serving SPA for path: ${req.path}`);
      res.sendFile(path.join(__dirname, 'client', 'index.html'));
    });
    
    // Create and start the server
    const server = http.createServer(app);
    server.listen(port, '0.0.0.0', () => {
      console.log(`\n==================================`);
      console.log(`Replit proxy server running on http://0.0.0.0:${port}`);
      console.log(`Proxying API requests to port 5000`);
      console.log(`Proxying Agent requests to port 5002`);
      console.log(`==================================\n`);
    });
  } catch (error) {
    console.error('Failed to initialize server:', error);
    process.exit(1);
  }
})();