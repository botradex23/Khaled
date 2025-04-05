// Simple Express Server for Testing Replit Webview
import express from 'express';

const app = express();
const port = 8000; // Using port 8000 instead of 5000

// Basic HTML response
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Simple Server Test</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
        .card { background: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #1a73e8; }
      </style>
    </head>
    <body>
      <h1>Simple Server Test</h1>
      <div class="card">
        <h2>Server Info</h2>
        <p>Server is running properly!</p>
        <p>Current time: ${new Date().toLocaleString()}</p>
        <p>Path: ${req.path}</p>
        <p>Headers: <pre>${JSON.stringify(req.headers, null, 2)}</pre></p>
      </div>

      <div class="card">
        <h2>API Test</h2>
        <button onclick="testApi()">Test API Connection</button>
        <div id="apiResult" style="margin-top: 10px;"></div>
      </div>

      <script>
        async function testApi() {
          try {
            const response = await fetch('/api/test');
            const data = await response.json();
            document.getElementById('apiResult').innerHTML = 
              '<pre style="background:#eee;padding:10px;border-radius:4px;">' + 
              JSON.stringify(data, null, 2) + 
              '</pre>';
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

// Simple API test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working properly',
    time: new Date().toISOString()
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`Simple test server running at http://0.0.0.0:${port}`);
  console.log(`Server should be accessible via Replit webview`);
});