// simple-server.cjs - A simplified server that ensures ports are properly exposed (CommonJS version)
const express = require('express');
const http = require('http');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

// Create Express app
const app = express();

// Use environment port or fallback to 3000 (different from main server to avoid conflicts)
const port = process.env.PORT || 3000;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy all other API requests to the main server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Keep the /api prefix
  },
  logLevel: 'debug'
}));

// Serve static client files from client/src directory
app.use(express.static(path.join(__dirname, 'client/src')));

// Fallback route - serve index.html for all other routes
app.get('*', (req, res) => {
  // First try client/src/index.html
  const indexPath = path.join(__dirname, 'client/src', 'index.html');
  console.log('Trying to serve index.html from:', indexPath);
  
  try {
    if (require('fs').existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    
    // If not found, respond with a simple HTML page
    console.log('Index.html not found, serving fallback page');
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
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Server error: ' + error.message);
  }
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Simple server is running on http://0.0.0.0:${port}`);
  console.log(`Access the app at http://0.0.0.0:${port}`);
  console.log(`API health check: http://0.0.0.0:${port}/api/health`);
});