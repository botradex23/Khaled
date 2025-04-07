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

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Proxy to the main API server
const mainApiProxy = createProxyMiddleware('/api', {
  target: 'http://localhost:5000',
  changeOrigin: true,
  logLevel: 'debug',
});
app.use(mainApiProxy);

// Proxy to the agent server
const agentApiProxy = createProxyMiddleware(['/api/my-agent', '/api/direct-agent'], {
  target: 'http://localhost:5002',
  changeOrigin: true,
  logLevel: 'debug',
});
app.use(agentApiProxy);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'client')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

// Create and start the server
const server = http.createServer(app);
server.listen(port, '0.0.0.0', () => {
  console.log(`Replit server running on http://0.0.0.0:${port}`);
});