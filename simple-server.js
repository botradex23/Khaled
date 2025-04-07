// simple-server.js - A simplified server that ensures ports are properly exposed
import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

// Get directory path for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Serve static client files from the client directory
app.use(express.static(path.join(__dirname, 'client')));

// Fallback route - serve index.html for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Simple server is running on http://0.0.0.0:${port}`);
  console.log(`Access the app at http://0.0.0.0:${port}`);
  console.log(`API health check: http://0.0.0.0:${port}/api/health`);
});