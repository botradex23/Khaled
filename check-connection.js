// Web server connectivity check
import express from 'express';
import http from 'http';
import https from 'https';

const app = express();

// Create minimal CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const PORT = 5500;
const MAIN_SERVER_URL = 'http://localhost:5000';

// Utility function for making HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    // Choose http or https based on the URL
    const client = url.startsWith('https') ? https : http;
    
    const req = client.get(url, (response) => {
      // Handle redirects
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return resolve(makeRequest(response.headers.location));
      }
      
      let data = '';
      
      // A chunk of data has been received
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      // The whole response has been received
      response.on('end', () => {
        try {
          const parsedData = JSON.parse(data);
          resolve({
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            data: parsedData
          });
        } catch (e) {
          resolve({
            statusCode: response.statusCode,
            statusMessage: response.statusMessage,
            data: data
          });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
    
    // Set timeout
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timed out after 5000ms'));
    });
  });
}

// Health check endpoint
app.get('/api/check', async (req, res) => {
  try {
    const response = await makeRequest(`${MAIN_SERVER_URL}/api/health`);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      console.log('Main server health check succeeded:', response.data);
      res.json({
        status: 'success',
        message: 'Connected to main server successfully',
        serverResponse: response.data
      });
    } else {
      console.error(`Main server health check failed: ${response.statusCode} ${response.statusMessage}`);
      res.status(502).json({
        status: 'error',
        message: `Failed to connect to main server: ${response.statusCode} ${response.statusMessage}`
      });
    }
  } catch (error) {
    console.error('Error connecting to main server:', error.message);
    res.status(500).json({
      status: 'error',
      message: `Error connecting to main server: ${error.message}`
    });
  }
});

// Test endpoint to check if the web server itself is reachable
app.get('/api/self-check', (req, res) => {
  res.json({
    status: 'success',
    message: 'Connection check server is running',
    timestamp: new Date().toISOString()
  });
});

// Simple HTML page to help with testing
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Server Connectivity Check</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        button { background: #1a73e8; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        pre { background: #eee; padding: 10px; border-radius: 4px; overflow-x: auto; }
        .success { color: green; }
        .error { color: red; }
      </style>
    </head>
    <body>
      <h1>Server Connectivity Check</h1>
      <div class="card">
        <h2>Check Connection to Main Server</h2>
        <button onclick="checkMainServer()">Check Main Server</button>
        <div id="mainServerResult" style="margin-top: 10px;"></div>
      </div>
      
      <div class="card">
        <h2>Self-Check</h2>
        <button onclick="selfCheck()">Self Check</button>
        <div id="selfCheckResult" style="margin-top: 10px;"></div>
      </div>

      <script>
        async function checkMainServer() {
          const resultDiv = document.getElementById('mainServerResult');
          resultDiv.innerHTML = 'Checking...';
          
          try {
            const response = await fetch('/api/check');
            const data = await response.json();
            
            if (response.ok) {
              resultDiv.innerHTML = '<div class="success">✅ Success: Connected to main server</div><pre>' + 
                JSON.stringify(data, null, 2) + '</pre>';
            } else {
              resultDiv.innerHTML = '<div class="error">❌ Error: ' + data.message + '</div>';
            }
          } catch (error) {
            resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
          }
        }
        
        async function selfCheck() {
          const resultDiv = document.getElementById('selfCheckResult');
          resultDiv.innerHTML = 'Checking...';
          
          try {
            const response = await fetch('/api/self-check');
            const data = await response.json();
            
            resultDiv.innerHTML = '<div class="success">✅ Success: Self-check passed</div><pre>' + 
              JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            resultDiv.innerHTML = '<div class="error">❌ Error: ' + error.message + '</div>';
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Connection check server running at http://0.0.0.0:${PORT}`);
  console.log(`Testing connectivity to main server at ${MAIN_SERVER_URL}`);
  
  // Perform initial connectivity check
  makeRequest(`${MAIN_SERVER_URL}/api/health`)
    .then(response => {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        console.log('Initial connectivity check succeeded:', response.data);
      } else {
        console.error(`Initial connectivity check failed: ${response.statusCode} ${response.statusMessage}`);
      }
    })
    .catch(err => console.error('Initial connectivity check failed:', err.message));
});