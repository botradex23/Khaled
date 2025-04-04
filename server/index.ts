// Simple TypeScript server for our application
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Basic API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    server: 'TypeScript Express',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve a simple HTML page for testing
app.get('/', (req, res) => {
  res.send(`
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
        </style>
      </head>
      <body>
        <h1>Cryptocurrency Trading Platform</h1>
        <div class="card">
          <h2>Server Status</h2>
          <p>The TypeScript server is running successfully!</p>
          <p>Server time: ${new Date().toLocaleString()}</p>
        </div>
        <div class="card">
          <h2>API Endpoints</h2>
          <ul>
            <li><code>/api/status</code> - Check server status</li>
          </ul>
        </div>
      </body>
    </html>
  `);
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
