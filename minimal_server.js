// Minimal server that starts the Python API
const { spawn } = require('child_process');
const http = require('http');

// Configuration
const port = process.env.PORT || 5000;
let pythonProcess = null;

// Start Python Binance API Server
function startPythonServer() {
  console.log('Starting Python Binance API Server...');
  
  pythonProcess = spawn('python', ['binance_api_server.py']);
  
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

// Create HTTP server
const server = http.createServer((req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
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
  
  // 404 for everything else
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
});

// Start the server
server.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});