// Minimal express server to use as a fallback
// This is a CommonJS module for maximum compatibility

const http = require('http');
const fs = require('fs');
const path = require('path');

// Helper for logging
function log(message) {
  console.log(`[MinimalServer] ${message}`);
}

// Create a basic HTTP server
const server = http.createServer((req, res) => {
  log(`${req.method} ${req.url}`);
  
  // Handle status endpoint
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      message: 'Minimal fallback server running',
      timestamp: new Date().toISOString()
    }));
    return;
  }
  
  // Serve index.html for root path
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Cryptocurrency Trading Platform</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
              max-width: 800px;
              margin: 0 auto;
              padding: 2rem;
              line-height: 1.6;
            }
            h1 { color: #0066cc; }
            .card {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 1rem;
              margin-bottom: 1rem;
              background-color: #f8f9fa;
            }
            .warning { color: #e65100; }
          </style>
        </head>
        <body>
          <h1>Cryptocurrency Trading Platform</h1>
          <div class="card">
            <h2>Server Status</h2>
            <p>The primary server is currently starting up or experiencing issues.</p>
            <p class="warning">This is a minimal fallback server to provide basic functionality.</p>
            <p>Please check the console logs for more information on the server status.</p>
          </div>
          <div class="card">
            <h2>Available API Endpoints</h2>
            <ul>
              <li><code>/api/status</code> - Check server status</li>
            </ul>
          </div>
        </body>
      </html>
    `);
    return;
  }
  
  // For other endpoints, return 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Get port from environment or use 5000 as default
const PORT = process.env.PORT || 5000;

// Start the server
server.listen(PORT, '0.0.0.0', () => {
  log(`Minimal server running on http://0.0.0.0:${PORT}`);
});