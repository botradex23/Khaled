#!/usr/bin/env node

/**
 * Simple Server Launcher
 * 
 * This script starts the Python API server directly 
 * and creates a minimal Node.js HTTP server
 */

const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

console.log('Starting simplified crypto trading platform...');

// Ensure the proxy file exists
const proxyFile = './attached_assets/Webshare 5 proxies.txt';
// Check if the default file exists, otherwise try the secondary file
if (!fs.existsSync(proxyFile)) {
  const secondaryProxyFile = './attached_assets/Webshare 3 proxies 3.txt';
  if (!fs.existsSync(secondaryProxyFile)) {
    console.error(`Error: Neither proxy file ${proxyFile} nor ${secondaryProxyFile} exists`);
    console.log('Available files in attached_assets:');
    try {
      const files = fs.readdirSync('./attached_assets');
      console.log(files.join('\n'));
    } catch (err) {
      console.error('Could not read attached_assets directory:', err.message);
    }
    process.exit(1);
  }
}

// Start the Python API server
function startPythonServer() {
  console.log('Starting Python API server...');

  // Using binance_api_server.py
  const pythonProcess = spawn('python', ['binance_api_server.py']);

  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python API: ${data}`);
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python API Error: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    console.log(`Python API server process exited with code ${code}`);

    // Restart the Python server if it crashes
    if (code !== 0) {
      console.log('Restarting Python API server...');
      setTimeout(startPythonServer, 5000); // Wait 5 seconds before restarting
    }
  });

  return pythonProcess;
}

// Wait for Python server to start
async function waitForPythonServer() {
  console.log('Waiting for Python API server to start...');
  
  for (let i = 0; i < 30; i++) {
    try {
      // Try to connect to the server
      const req = http.get('http://localhost:5001/api/binance/ping', (res) => {
        if (res.statusCode === 200) {
          console.log('Python API server is ready!');
          return true;
        }
      });
      
      req.on('error', () => {
        // Ignore error and try again
      });
      
      req.end();
    } catch (error) {
      // Ignore error and try again
    }
    
    // Wait 1 second before trying again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.error('Python API server failed to start within the timeout period');
  return false;
}

// Create a simple HTTP server
function createHttpServer() {
  console.log('Setting up simple HTTP server...');
  const PORT = process.env.PORT || 5000;
  
  // Get current directory
  const __dirname = process.cwd();
  
  // Create HTTP server
  const server = http.createServer((req, res) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }
    
    // Parse URL
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Health check
    if (url.pathname === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    
    // Forward to Python API
    if (url.pathname.startsWith('/api')) {
      const pythonUrl = `http://localhost:5001${url.pathname}${url.search}`;
      
      const options = {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      const proxyReq = http.request(pythonUrl, options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        proxyRes.pipe(res);
      });
      
      proxyReq.on('error', (error) => {
        console.error(`Error forwarding request to Python API: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Internal server error', details: error.message }));
      });
      
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        let body = '';
        req.on('data', (chunk) => {
          body += chunk.toString();
        });
        
        req.on('end', () => {
          if (body) {
            proxyReq.write(body);
          }
          proxyReq.end();
        });
      } else {
        proxyReq.end();
      }
      
      return;
    }
    
    // Serve index.html for everything else
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error loading index.html');
        return;
      }
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  });
  
  return { server, PORT };
}

// Start the server
async function startServer() {
  // Start Python API server
  const pythonProcess = startPythonServer();
  
  // Wait for Python server to start
  await waitForPythonServer();
  
  // Start HTTP server
  const { server, PORT } = createHttpServer();
  
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server running on port ${PORT}`);
    console.log(`Visit http://localhost:${PORT} to access the application`);
    console.log(`Python API is running at: http://localhost:5001/api/binance/status`);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('Shutting down servers...');
    
    // Kill Python process
    pythonProcess.kill();
    
    // Close HTTP server
    server.close(() => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  });
}

// Start everything
startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});