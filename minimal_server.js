// Minimal Express Server that just serves static files and forwards API requests

import express from 'express';
import { spawn } from 'child_process';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Create a simple index.html file if it doesn't exist
const indexPath = path.join(publicDir, 'index.html');
if (!fs.existsSync(indexPath)) {
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
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f2f2f2;
    }
    tr:hover {
      background-color: #f5f5f5;
    }
    .status {
      padding: 5px 10px;
      border-radius: 4px;
      font-weight: bold;
    }
    .online {
      background-color: #d4edda;
      color: #155724;
    }
    .offline {
      background-color: #f8d7da;
      color: #721c24;
    }
    button {
      background-color: #0066cc;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background-color: #0056b3;
    }
    .loader {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #0066cc;
      border-radius: 50%;
      width: 20px;
      height: 20px;
      animation: spin 2s linear infinite;
      display: inline-block;
      margin-right: 10px;
      vertical-align: middle;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <h1>Crypto Trading Platform</h1>
  
  <div class="card">
    <h2>System Status</h2>
    <div>
      <div class="loader" id="status-loader"></div>
      <span id="status-text">Checking system status...</span>
    </div>
    <div id="server-status" style="margin-top: 20px;"></div>
  </div>

  <div class="card">
    <h2>Live Market Data</h2>
    <button id="refresh-markets">Refresh Markets</button>
    <div id="markets-container" style="margin-top: 20px;">
      <div class="loader"></div> Loading market data...
    </div>
  </div>

  <div class="card">
    <h2>ML Predictions</h2>
    <div id="predictions-container" style="margin-top: 20px;">
      <div class="loader"></div> Loading predictions...
    </div>
  </div>

  <script>
    // Check server status
    async function checkStatus() {
      const statusLoader = document.getElementById('status-loader');
      const statusText = document.getElementById('status-text');
      const serverStatus = document.getElementById('server-status');
      
      try {
        const response = await fetch('/api/status');
        if (!response.ok) throw new Error('Server status check failed');
        
        const data = await response.json();
        
        statusLoader.style.display = 'none';
        statusText.innerHTML = \`System is <span class="status online">ONLINE</span>\`;
        
        let statusHTML = '<table><tr><th>Component</th><th>Status</th><th>Last Updated</th></tr>';
        statusHTML += \`<tr>
          <td>Main Server</td>
          <td><span class="status online">Online</span></td>
          <td>\${new Date().toLocaleTimeString()}</td>
        </tr>\`;
        
        statusHTML += \`<tr>
          <td>Python API Server</td>
          <td><span class="status \${data.pythonServer === 'running' ? 'online' : 'offline'}">\${data.pythonServer === 'running' ? 'Online' : 'Offline'}</span></td>
          <td>\${new Date(data.timestamp).toLocaleTimeString()}</td>
        </tr>\`;
        
        statusHTML += '</table>';
        serverStatus.innerHTML = statusHTML;
      } catch (error) {
        statusLoader.style.display = 'none';
        statusText.innerHTML = \`System is <span class="status offline">OFFLINE</span>\`;
        serverStatus.innerHTML = \`<div style="color: #721c24;">Error: \${error.message}</div>\`;
      }
    }

    // Fetch market data
    async function fetchMarkets() {
      const marketsContainer = document.getElementById('markets-container');
      
      try {
        const response = await fetch('/api/binance/tickers');
        if (!response.ok) throw new Error('Failed to fetch market data');
        
        const data = await response.json();
        
        // Just display the top 5 most popular markets
        const popularSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'DOGEUSDT'];
        const filteredMarkets = data.filter(ticker => popularSymbols.includes(ticker.symbol));
        
        let marketsHTML = '<table><tr><th>Symbol</th><th>Price</th><th>24h Change</th></tr>';
        
        filteredMarkets.forEach(market => {
          marketsHTML += \`<tr>
            <td>\${market.symbol}</td>
            <td>$\${parseFloat(market.price).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
            <td style="color: \${market.priceChangePercent >= 0 ? 'green' : 'red'}">\${market.priceChangePercent >= 0 ? '+' : ''}\${market.priceChangePercent}%</td>
          </tr>\`;
        });
        
        marketsHTML += '</table>';
        marketsContainer.innerHTML = marketsHTML;
      } catch (error) {
        marketsContainer.innerHTML = \`<div style="color: #721c24;">Error fetching market data: \${error.message}</div>\`;
      }
    }

    // Fetch ML predictions
    async function fetchPredictions() {
      const predictionsContainer = document.getElementById('predictions-container');
      
      try {
        const response = await fetch('/api/ml/predict/BTCUSDT');
        if (!response.ok) throw new Error('Failed to fetch predictions');
        
        const data = await response.json();
        
        let predictionsHTML = '<div style="margin-bottom: 15px;">Bitcoin (BTC) Price Prediction:</div>';
        
        predictionsHTML += \`<div style="font-size: 18px; font-weight: bold; margin-bottom: 10px;">
          Direction: <span style="color: \${data.prediction.direction === 'up' ? 'green' : 'red'}">
            \${data.prediction.direction === 'up' ? '▲ Up' : '▼ Down'}
          </span>
        </div>\`;
        
        predictionsHTML += \`<div>
          <div>Confidence: \${data.prediction.confidence}%</div>
          <div>Time Frame: \${data.prediction.timeframe}</div>
          <div>Analysis: \${data.prediction.analysis}</div>
        </div>\`;
        
        predictionsContainer.innerHTML = predictionsHTML;
      } catch (error) {
        predictionsContainer.innerHTML = \`<div style="color: #721c24;">Error fetching predictions: \${error.message}</div>\`;
      }
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', function() {
      // Check status immediately
      checkStatus();
      
      // Fetch initial data
      fetchMarkets();
      fetchPredictions();
      
      // Set up refresh functionality
      document.getElementById('refresh-markets').addEventListener('click', fetchMarkets);
      
      // Set up periodic status checks
      setInterval(checkStatus, 30000); // Every 30 seconds
    });
  </script>
</body>
</html>
  `;
  fs.writeFileSync(indexPath, htmlContent);
}

// Initialize Express
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Start Python Binance API Server
let pythonProcess = null;

function startPythonServer() {
  console.log('Starting Python Binance API Server...');
  
  pythonProcess = spawn('python', ['binance_api_server.py']);
  
  // Log output
  pythonProcess.stdout.on('data', (data) => {
    console.log(`Python server: ${data}`);
  });
  
  pythonProcess.stderr.on('data', (data) => {
    console.error(`Python server error: ${data}`);
  });
  
  pythonProcess.on('close', (code) => {
    console.log(`Python server process exited with code ${code}`);
    
    // Restart if crashed
    if (code !== 0) {
      console.log('Restarting Python server in 5 seconds...');
      setTimeout(startPythonServer, 5000);
    }
  });
}

// Start the Python server
startPythonServer();

// API routes
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    pythonServer: pythonProcess && !pythonProcess.killed ? 'running' : 'stopped'
  });
});

// Proxy requests to Python server
app.use('/api/binance', async (req, res) => {
  try {
    const pythonUrl = `http://localhost:5001${req.originalUrl}`;
    console.log(`Proxying request to: ${pythonUrl}`);
    
    const response = await fetch(pythonUrl);
    
    // Forward status code
    res.status(response.status);
    
    // Forward headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Forward body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to Python server:', error);
    res.status(500).json({ error: 'Failed to connect to Python server' });
  }
});

app.use('/api/ml', async (req, res) => {
  try {
    const pythonUrl = `http://localhost:5001${req.originalUrl}`;
    console.log(`Proxying ML request to: ${pythonUrl}`);
    
    const response = await fetch(pythonUrl);
    
    // Forward status code
    res.status(response.status);
    
    // Forward headers
    for (const [key, value] of response.headers.entries()) {
      res.setHeader(key, value);
    }
    
    // Forward body
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error proxying request to Python ML server:', error);
    res.status(500).json({ error: 'Failed to connect to Python ML server' });
  }
});

// Serve static assets
app.use(express.static(publicDir));

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});