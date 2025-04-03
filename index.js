/**
 * Crypto Trading Platform Server
 * 
 * This is the main entry point for the Node.js server that serves
 * the frontend and proxies requests to the Python API server.
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;
const PYTHON_API_PORT = 5001;

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Start Python API server
function startPythonServer() {
  console.log('Starting Python API server...');
  
  const pythonProcess = spawn('python', ['api_server.py']);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python API: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python API Error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python API server process exited with code ${code}`);
    
    // Restart the Python server if it crashes
    if (code !== 0) {
      console.log('Restarting Python API server...');
      setTimeout(startPythonServer, 5000); // Wait 5 seconds before restarting
    }
  });
  
  return pythonProcess;
}

// Wait for Python server to start
async function waitForPythonServer() {
  console.log('Waiting for Python API server to start...');
  
  for (let i = 0; i < 30; i++) {
    try {
      const response = await fetch(`http://localhost:${PYTHON_API_PORT}/api/ping`);
      if (response.ok) {
        console.log('Python API server is ready!');
        return true;
      }
    } catch (error) {
      // Ignore error and try again
    }
    
    // Wait 1 second before trying again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error('Python API server failed to start within the timeout period');
  return false;
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Forward requests to Python API
app.use('/api', async (req, res) => {
  const url = `http://localhost:${PYTHON_API_PORT}${req.url}`;
  
  try {
    const response = await fetch(url, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`Error forwarding request to Python API: ${error.message}`);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Serve the React frontend for any other route
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Create HTTP server
const server = createServer(app);

// Start the server
async function startServer() {
  // Start Python API server first
  const pythonProcess = startPythonServer();
  
  // Wait for Python server to start
  await waitForPythonServer();
  
  // Start Express server
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    
    // Kill Python process
    pythonProcess.kill();
    
    // Close Express server
    server.close(() => {
      console.log('Express server closed');
      process.exit(0);
    });
  });
}

// Start everything
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});