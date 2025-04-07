// replit-direct-server.js - A direct server for Replit environment (ESM version)
import express from 'express';
import http from 'http';
import path from 'path';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();

// Use environment port or fallback to 5001 (different from main server)
const port = process.env.REPLIT_PORT || 5001;

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

console.log('Setting up direct Replit server with:');
console.log(`Port: ${port}`);
console.log(`Current directory: ${__dirname}`);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    server: 'replit-direct-server'
  });
});

// Proxy all other API requests to the main server
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5000',
  changeOrigin: true,
  pathRewrite: {
    '^/api': '/api' // Keep the /api prefix
  },
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Proxy error:', err);
    res.status(502).json({ error: 'API server is not available', message: err.message });
  }
}));

// Serve static client files from client/dist directory (if exists)
const distPath = path.join(__dirname, 'client', 'dist');
if (fs.existsSync(distPath)) {
  console.log(`Serving static files from: ${distPath}`);
  app.use(express.static(distPath));
} else {
  console.log(`Static file path does not exist: ${distPath}, falling back to client/src`);
  app.use(express.static(path.join(__dirname, 'client', 'src')));
}

// Serve public directory for assets
app.use(express.static(path.join(__dirname, 'public')));

// Fallback route - serve index.html for all other routes
app.get('*', (req, res) => {
  try {
    // Try multiple possible index.html locations
    const possiblePaths = [
      path.join(__dirname, 'client', 'dist', 'index.html'),
      path.join(__dirname, 'client', 'src', 'index.html'),
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
        <title>Tradeliy - Direct Replit Server</title>
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
        <h1>Tradeliy - Direct Replit Server</h1>
        <div class="card">
          <h2>Server Status</h2>
          <p>The direct Replit server is running! This is a fallback page.</p>
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
  console.log(`Direct Replit server is running on http://0.0.0.0:${port}`);
  console.log(`Access the app at http://0.0.0.0:${port}`);
  console.log(`API health check: http://0.0.0.0:${port}/api/health`);
});