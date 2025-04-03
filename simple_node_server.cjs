// A very simple HTTP server with no external dependencies
const http = require('http');
const { spawn } = require('child_process');
const { readFileSync, existsSync } = require('fs');
const { join } = require('path');

// Configuration
const port = process.env.PORT || 5000;
let pythonProcess = null;

// Start Python Binance API Server
function startPythonServer() {
  console.log('Starting Python Binance API Server...');
  
  const scriptPath = join(__dirname, 'binance_api_server.py');
  if (!existsSync(scriptPath)) {
    console.error(`Python script not found at ${scriptPath}`);
    return;
  }
  
  pythonProcess = spawn('python', [scriptPath]);
  
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python server: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python server error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python server process exited with code ${code}`);
    
    if (code !== 0) {
      console.log('Restarting Python server in 5 seconds...');
      setTimeout(startPythonServer, 5000);
    }
  });
}

// Start the Python server
startPythonServer();

// Create a simple HTML page
const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Crypto Trading Platform</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 0;
      padding: 20px;
      background-color: #f8f9fa;
      color: #333;
    }
    h1 {
      color: #0066cc;
      border-bottom: 1px solid #ddd;
      padding-bottom: 10px;
    }
    .card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 20px;
      margin-bottom: 20px;
    }
  </style>
</head>
<body>
  <h1>Crypto Trading Platform</h1>
  
  <div class="card">
    <h2>System Status</h2>
    <p>Status: <strong>Starting Up</strong></p>
    <p>Python API Server: <span id="python-status">Initializing...</span></p>
  </div>

  <div class="card">
    <h2>Available APIs</h2>
    <ul>
      <li><a href="/api/status">System Status</a></li>
      <li><a href="/api/binance/ping">Binance API Ping</a></li>
      <li><a href="/api/binance/status">Binance API Status</a></li>
      <li><a href="/api/binance/ticker/BTCUSDT">Bitcoin Price</a></li>
    </ul>
  </div>
</body>
</html>
`;

// Create HTTP server
const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  
  // API routes
  if (req.url === '/api/status') {
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      status: 'online',
      timestamp: new Date().toISOString(),
      pythonServer: pythonProcess && !pythonProcess.killed ? 'running' : 'stopped'
    }));
    return;
  }
  
  // Home page
  if (req.url === '/' || req.url === '/index.html') {
    res.setHeader('Content-Type', 'text/html');
    res.end(htmlContent);
    return;
  }
  
  // 404 for everything else
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});