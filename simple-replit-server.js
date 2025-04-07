/**
 * Simple Replit Express Server
 * 
 * This is a minimal proxy server to expose the application via Replit URL
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'simple-replit-proxy'
  });
});

// Check if client directory exists
const clientDir = path.join(__dirname, 'client');
if (!fs.existsSync(clientDir)) {
  console.warn(`Client directory not found at ${clientDir}`);
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

// Manual API forwarding
app.all('/api/*', async (req, res) => {
  try {
    console.log(`API forwarding request to: ${req.url}`);
    const targetUrl = `http://localhost:5000${req.url}`;
    
    // Create options for the fetch request
    const options = {
      method: req.method,
      headers: {
        ...req.headers,
        host: 'localhost:5000'
      }
    };
    
    // Add body for non-GET requests
    if (req.method !== 'GET' && req.body) {
      options.body = JSON.stringify(req.body);
      options.headers['content-type'] = 'application/json';
    }
    
    // Forward the request
    const response = await fetch(targetUrl, options);
    const contentType = response.headers.get('content-type');
    
    // Forward status and headers
    res.status(response.status);
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Handle response based on content type
    if (contentType && contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      res.json(jsonResponse);
    } else {
      const textResponse = await response.text();
      res.send(textResponse);
    }
  } catch (error) {
    console.error('API forwarding error:', error.message);
    res.status(500).json({ error: 'API forwarding failed', details: error.message });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'client')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Simple Replit proxy server running on http://0.0.0.0:${port}`);
  console.log(`Proxying API requests to port 5000`);
});