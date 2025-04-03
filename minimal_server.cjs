#!/usr/bin/env node

/**
 * Minimal Cryptocurrency Trading Platform Server
 * 
 * This is a standalone Express server that provides basic functionality
 * and proxies requests to the Python Flask API for ML predictions and Binance API calls.
 */

const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');

// Configuration
const PORT = process.env.PORT || 5000;
const PYTHON_API_PORT = 5001;
const PYTHON_API_URL = `http://localhost:${PYTHON_API_PORT}`;
const HOST = process.env.HOST || '0.0.0.0';

// Create Express app
const app = express();

// Set up middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Start Python API server
function startPythonServer() {
  console.log('Starting Python API server...');
  
  const pythonScript = path.join(process.cwd(), 'binance_api_server.py');
  
  if (!fs.existsSync(pythonScript)) {
    console.error(`Error: Python script not found at ${pythonScript}`);
    process.exit(1);
  }
  
  const pythonProcess = spawn('python', [pythonScript], {
    stdio: 'inherit',
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1'
    }
  });
  
  pythonProcess.on('error', (err) => {
    console.error('Failed to start Python process:', err);
  });
  
  // Handle Python process exit
  pythonProcess.on('exit', (code) => {
    console.log(`Python API server exited with code ${code}`);
    if (code !== 0) {
      console.log('Restarting Python API server...');
      startPythonServer();
    }
  });
  
  return pythonProcess;
}

// Basic routes
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Cryptocurrency Trading Platform API is running',
    documentation: '/api/docs',
    version: '0.1.0'
  });
});

app.get('/api/status', (req, res) => {
  res.json({
    server: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Python API proxy routes
app.get('/api/binance/status', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/binance/status`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Python API:', error.message);
    res.status(500).json({
      error: 'Failed to connect to Binance API service',
      message: error.message
    });
  }
});

app.get('/api/binance/ticker/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const response = await axios.get(`${PYTHON_API_URL}/binance/ticker/${symbol}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Python API:', error.message);
    res.status(500).json({
      error: 'Failed to fetch ticker data',
      message: error.message
    });
  }
});

app.get('/api/binance/tickers', async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/binance/tickers`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to Python API:', error.message);
    res.status(500).json({
      error: 'Failed to fetch tickers data',
      message: error.message
    });
  }
});

app.get('/api/ml/predict/:symbol', async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase();
    const response = await axios.get(`${PYTHON_API_URL}/ml/predict/${symbol}`);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying to ML prediction API:', error.message);
    res.status(500).json({
      error: 'Failed to fetch ML prediction',
      message: error.message
    });
  }
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    endpoints: [
      {
        path: '/',
        method: 'GET',
        description: 'API root, returns basic server information'
      },
      {
        path: '/api/status',
        method: 'GET',
        description: 'Server status information'
      },
      {
        path: '/api/binance/status',
        method: 'GET',
        description: 'Binance API connection status'
      },
      {
        path: '/api/binance/ticker/:symbol',
        method: 'GET',
        description: 'Get price for a specific trading pair (e.g., BTCUSDT)'
      },
      {
        path: '/api/binance/tickers',
        method: 'GET',
        description: 'Get prices for all trading pairs'
      },
      {
        path: '/api/ml/predict/:symbol',
        method: 'GET',
        description: 'Get ML-based price prediction for a trading pair'
      }
    ]
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `The requested resource '${req.url}' was not found on this server`
  });
});

// Handle errors
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Python API server
const pythonProcess = startPythonServer();

// Create HTTP server
const server = http.createServer(app);

// Start server
server.listen(PORT, HOST, () => {
  console.log(`Cryptocurrency Trading Platform server running at http://${HOST}:${PORT}/`);
  console.log(`Python API server running at http://localhost:${PYTHON_API_PORT}/`);
});

// Handle shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('HTTP server closed');
    pythonProcess.kill('SIGINT');
    process.exit(0);
  });
});