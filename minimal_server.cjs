#!/usr/bin/env node

/**
 * Minimal HTTP Server
 * 
 * This is a minimalist HTTP server that serves static files and
 * proxies requests to the Python API server (port 5001).
 * Built with native Node.js modules (no Express dependency).
 */

// Native modules
const http = require('http');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

// Port configuration
const PORT = process.env.PORT || 5000;
const PYTHON_PORT = 5001;

// Start Python server
let pythonProcess = null;

// Simple request handler
function handleRequest(req, res) {
  // Log the request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Default response headers
  res.setHeader('Content-Type', 'application/json');
  
  // Simple routing
  if (req.url === '/api/status') {
    // Server status endpoint
    res.statusCode = 200;
    res.end(JSON.stringify({
      status: 'ok',
      server: 'minimal_server',
      timestamp: new Date().toISOString(),
      nodeVersion: process.version
    }));
  } else if (req.url.startsWith('/api/')) {
    // Proxy to Python server
    proxyToPythonServer(req, res);
  } else {
    // Serve static content or 404
    serveStaticContent(req, res);
  }
}

// Proxy requests to Python server
function proxyToPythonServer(req, res) {
  // Simple proxy implementation
  const options = {
    hostname: 'localhost',
    port: PYTHON_PORT,
    path: req.url,
    method: req.method,
    headers: req.headers
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.statusCode = proxyRes.statusCode;
    
    // Copy headers from Python response
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Stream the response data
    proxyRes.pipe(res);
  });
  
  // Error handling
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error.message);
    res.statusCode = 502;
    res.end(JSON.stringify({ 
      error: 'Bad Gateway', 
      message: 'Cannot connect to Python API server',
      details: error.message
    }));
  });
  
  // If the original request has a body, pipe it to the proxy request
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
    req.pipe(proxyReq);
  } else {
    proxyReq.end();
  }
}

// Serve static content from /public directory
function serveStaticContent(req, res) {
  let filePath = '.' + req.url;
  
  // Default to index.html for root path
  if (filePath === './') {
    filePath = './public/index.html';
  } else {
    filePath = './public' + req.url;
  }
  
  // Get file extension
  const extname = path.extname(filePath);
  
  // Set content type based on extension
  let contentType = 'text/html';
  switch (extname) {
    case '.js':
      contentType = 'text/javascript';
      break;
    case '.css':
      contentType = 'text/css';
      break;
    case '.json':
      contentType = 'application/json';
      break;
    case '.png':
      contentType = 'image/png';
      break;
    case '.jpg':
    case '.jpeg':
      contentType = 'image/jpeg';
      break;
    case '.svg':
      contentType = 'image/svg+xml';
      break;
    case '.ico':
      contentType = 'image/x-icon';
      break;
    case '.woff':
      contentType = 'font/woff';
      break;
    case '.woff2':
      contentType = 'font/woff2';
      break;
  }
  
  // Read the file
  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        // File not found
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Crypto Trading Platform</title>
              <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                h1 { color: #333; }
                p { color: #666; }
              </style>
            </head>
            <body>
              <h1>Crypto Trading Platform</h1>
              <p>Welcome to the Crypto Trading Platform!</p>
              <p>Server is running, but the frontend is not yet built.</p>
              <p>API Status: <a href="/api/status">Check API Status</a></p>
            </body>
          </html>
        `;
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html, 'utf-8');
      } else {
        // Server error
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`);
      }
    } else {
      // Successful response
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
}

// Start Python API server
function startPythonServer() {
  console.log('Starting Python API server...');
  
  // Try to use python3 first, fall back to python
  const pythonCmd = fs.existsSync('/usr/bin/python3') ? 'python3' : 'python';
  
  // First, make sure all Python scripts are executable
  try {
    fs.chmodSync('./api_server.py', 0o755);
    console.log('Made api_server.py executable');
  } catch (err) {
    console.warn('Could not make api_server.py executable:', err.message);
  }
  
  try {
    fs.chmodSync('./binance_api_server.py', 0o755);
    console.log('Made binance_api_server.py executable');
  } catch (err) {
    console.warn('Could not make binance_api_server.py executable:', err.message);
  }
  
  // Start the Python server
  pythonProcess = spawn(pythonCmd, ['./api_server.py']);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python server: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python server error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python server process exited with code ${code}`);
    
    // Restart Python server if it crashes
    if (code !== 0) {
      console.log('Restarting Python server in 5 seconds...');
      setTimeout(startPythonServer, 5000);
    }
  });
}

// Create HTTP server
const server = http.createServer(handleRequest);

// Start the server
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
  
  // Start Python server
  startPythonServer();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  
  server.close(() => {
    console.log('HTTP server closed');
    
    // Kill Python process if running
    if (pythonProcess) {
      pythonProcess.kill();
    }
    
    process.exit(0);
  });
});