// Minimal server that starts the Python API
const { spawn } = require('child_process');
const http = require('http');

// Configuration
const port = process.env.PORT || 5000;
let pythonProcess = null;

// Start Python Binance API Server
function startPythonServer() {
  console.log('Starting Python Binance API Server...');
  
  try {
    // Check if the script exists
    const fs = require('fs');
    if (!fs.existsSync('./binance_api_server.py')) {
      console.error('Error: binance_api_server.py not found in the current directory');
      console.log('Current directory contents:');
      fs.readdirSync('./').forEach(file => {
        console.log(file);
      });
      return;
    }

    // Start the Python process
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
  } catch (error) {
    console.error('Failed to start Python server:', error);
  }
}

// Start the Python server
startPythonServer();

// Function to proxy requests to Python Flask server
function proxyToPythonServer(req, res) {
  const pythonServerUrl = 'http://localhost:5001';
  const options = {
    hostname: 'localhost',
    port: 5001,
    path: req.url.replace('/api/python', ''),
    method: req.method,
    headers: req.headers
  };
  
  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', (error) => {
    console.error('Proxy error:', error);
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'Python server unavailable', details: error.message }));
  });
  
  req.pipe(proxyReq);
}

// Create HTTP server
const server = http.createServer((req, res) => {
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
  
  // Log the request
  console.log(`${req.method} ${req.url}`);
  
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
  
  // Serve index.html for the root path
  if (req.url === '/' || req.url === '/index.html') {
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
        <p>Status: <strong>Online</strong></p>
        <p>Python API Server: <span id="python-status">Checking...</span></p>
        
        <script>
          // Check Python server status
          fetch('/api/status')
            .then(response => response.json())
            .then(data => {
              document.getElementById('python-status').innerText = 
                data.pythonServer === 'running' ? 'Running' : 'Stopped';
            })
            .catch(error => {
              document.getElementById('python-status').innerText = 'Error: ' + error.message;
            });
        </script>
      </div>

      <div class="card">
        <h2>Available APIs</h2>
        <ul>
          <li><a href="/api/status">System Status</a></li>
          <li><a href="/api/python/ping">Binance API Ping</a></li>
          <li><a href="/api/python/status">Binance API Status</a></li>
          <li><a href="/api/python/ticker/BTCUSDT">Bitcoin Price</a></li>
        </ul>
      </div>
    </body>
    </html>
    `;
    
    res.setHeader('Content-Type', 'text/html');
    res.end(htmlContent);
    return;
  }
  
  // Proxy requests to Python server
  if (req.url.startsWith('/api/python/')) {
    // Rewrite URL to remove /api/python prefix
    req.url = req.url.replace('/api/python', '');
    proxyToPythonServer(req, res);
    return;
  }
  
  // Handle direct requests to the Python server
  if (req.url.startsWith('/api/binance/')) {
    // Rewrite URL from /api/binance/endpoint to /endpoint
    req.url = req.url.replace('/api/binance', '');
    proxyToPythonServer(req, res);
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