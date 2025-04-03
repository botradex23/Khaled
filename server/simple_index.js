// Simple Server Index
// A simplified version using ES modules that doesn't rely on complex imports

import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Start Python Binance API Server
let pythonProcess = null;

function startPythonServer() {
  console.log('Starting Python Binance API Server...');
  
  // Check if the file exists
  const scriptPath = path.join(__dirname, '../binance_api_server.py');
  if (!fs.existsSync(scriptPath)) {
    console.error(`Python script not found at ${scriptPath}`);
    return;
  }
  
  // Start the Python process
  pythonProcess = spawn('python', [scriptPath]);
  
  // Log output
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python server: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python server error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python server process exited with code ${code}`);
    
    // Restart if crashed
    if (code !== 0) {
      console.log('Restarting Python server in 5 seconds...');
      setTimeout(startPythonServer, 5000);
    }
  });
}

// Start the Python server
startPythonServer();

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    pythonServer: pythonProcess && !pythonProcess.killed ? 'running' : 'stopped'
  });
});

// Proxy requests to Python server
app.use('/api/binance', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const pythonUrl = `http://localhost:5001/api/binance${req.url}`;
    const response = await fetch(pythonUrl);
    
    // Forward status code
    res.status(response.status);
    
    // Forward headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Forward body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to Python server:', error);
    res.status(500).json({ error: 'Failed to connect to Python server' });
  }
});

app.use('/api/ml', async (req, res) => {
  try {
    const fetch = (await import('node-fetch')).default;
    const pythonUrl = `http://localhost:5001/api/ml${req.url}`;
    const response = await fetch(pythonUrl);
    
    // Forward status code
    res.status(response.status);
    
    // Forward headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Forward body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to Python ML server:', error);
    res.status(500).json({ error: 'Failed to connect to Python ML server' });
  }
});

// Serve static assets
app.use(express.static(path.join(__dirname, '../public')));

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});