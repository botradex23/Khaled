// Replit-specific Express Server
import express from 'express';
import { exec } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000; // Use a different port than the main server

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// CORS middleware for API endpoints
app.use('/api', (req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type,Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Static files 
app.use(express.static('public'));

// Basic HTML response to test connectivity
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cryptex Trading Platform</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1a73e8; }
        .button { display: inline-block; background: #1a73e8; color: white; padding: 10px 20px; 
                 border-radius: 4px; text-decoration: none; margin-top: 10px; }
        pre { background: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; }
      </style>
    </head>
    <body>
      <h1>Cryptex Trading Platform</h1>
      <div class="card">
        <h2>Server Status</h2>
        <p>Main server is running on port ${port}</p>
        <p>Current time: ${new Date().toLocaleString()}</p>
      </div>

      <div class="card">
        <h2>API Test</h2>
        <button onclick="testApi()" class="button">Test API Connection</button>
        <div id="apiResult" style="margin-top: 10px;"></div>
      </div>

      <div class="card">
        <h2>Server Information</h2>
        <p>Path: ${req.path}</p>
        <p>Headers:</p>
        <pre>${JSON.stringify(req.headers, null, 2)}</pre>
      </div>

      <div class="card">
        <h2>Access Main Application</h2>
        <a href="/app" class="button">Go to Main Application</a>
      </div>

      <script>
        async function testApi() {
          try {
            const response = await fetch('/api/health');
            const data = await response.json();
            document.getElementById('apiResult').innerHTML = 
              '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            document.getElementById('apiResult').innerHTML = 
              '<div style="color:red">Error: ' + error.message + '</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

// Main application iframe
app.get('/app', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Cryptex Trading Platform - Main App</title>
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; overflow: hidden; }
        iframe { border: none; width: 100%; height: 100%; }
      </style>
    </head>
    <body>
      <iframe src="http://localhost:5000/" allow="fullscreen"></iframe>
    </body>
    </html>
  `);
});

// Health check API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    server: 'Cryptex Trading Platform',
    env: process.env.NODE_ENV || 'development'
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Replit proxy server running at http://0.0.0.0:${port}`);
  console.log(`Server should be accessible via Replit webview`);
  
  // Test if the main server is running
  exec('curl -s http://localhost:5000/api/health', (error, stdout, stderr) => {
    if (error) {
      console.error(`Main server not responding: ${error.message}`);
      return;
    }
    if (stderr) {
      console.error(`Error checking main server: ${stderr}`);
      return;
    }
    console.log('Main server status:', stdout);
  });
});