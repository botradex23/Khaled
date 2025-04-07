/**
 * Simple Express Server for Replit
 * 
 * This is a minimal Express server that proxies API requests to the main server
 * and serves static files from the client directory.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const fs = require('fs');
const http = require('http');

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Enable JSON body parsing
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Simple health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy API requests to the main server with robust error handling
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Keep the /api prefix
  },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    
    // Send a friendly error response
    res.status(502).json({ 
      status: 'error',
      message: 'Main API server is not available',
      error: err.message,
      timestamp: new Date().toISOString(),
      path: req.path
    });
  }
}));

// Serve static files from multiple potential locations
const staticDirs = [
  path.join(__dirname, 'client', 'dist'),
  path.join(__dirname, 'client', 'src'),
  path.join(__dirname, 'client'),
  path.join(__dirname, 'public')
];

// Check and serve from each directory if it exists
staticDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Serving static files from: ${dir}`);
    app.use(express.static(dir));
  }
});

// Fallback route - serve index.html for all other routes or return a simple page
app.get('*', (req, res) => {
  // Try multiple possible index.html locations
  const possiblePaths = [
    path.join(__dirname, 'client', 'dist', 'index.html'),
    path.join(__dirname, 'client', 'src', 'index.html'),
    path.join(__dirname, 'client', 'index.html'),
    path.join(__dirname, 'public', 'index.html')
  ];
  
  for (const indexPath of possiblePaths) {
    if (fs.existsSync(indexPath)) {
      console.log(`Serving index.html from: ${indexPath}`);
      return res.sendFile(indexPath);
    }
  }
  
  // If no index.html found, respond with a simple HTML page
  console.log('No index.html found, serving fallback page');
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Tradeliy - Simple Server</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          padding: 2rem;
          max-width: 800px;
          margin: 0 auto;
          line-height: 1.6;
        }
        h1 { color: #0066cc; }
        .card {
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1rem;
          background-color: #f9f9f9;
        }
        .api-link {
          background-color: #0066cc;
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 4px;
          text-decoration: none;
          display: inline-block;
          margin-top: 1rem;
        }
      </style>
    </head>
    <body>
      <h1>Tradeliy - Simple Server</h1>
      <div class="card">
        <h2>Server Status</h2>
        <p>The simple server is running! This is a fallback page.</p>
        <p>The main application is available through the regular workflow.</p>
        <a href="/api/health" class="api-link">API Health Check</a>
      </div>
    </body>
    </html>
  `);
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Simple server is running on http://0.0.0.0:${port}`);
  console.log(`Access the app at http://0.0.0.0:${port}`);
  console.log(`API health check: http://0.0.0.0:${port}/api/health`);
});