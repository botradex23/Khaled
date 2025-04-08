/**
 * Minimal Server
 * 
 * This is a very minimal server that serves only the frontend and essential API endpoints.
 * It's designed to start quickly and avoid the 20-second timeout in Replit.
 */

import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Hard-code the port to 5000 to match Replit expectations
const port = 5000;

console.log(`Starting server with explicitly set PORT=${port}`);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  
  // Preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Basic health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mode: "minimal-server",
    timestamp: new Date().toISOString()
  });
});

// Startup status endpoint
app.get('/api/startup-status', (req, res) => {
  res.json({
    status: 'initializing',
    message: 'Minimal server is running. Full functionality will be available soon.',
    started_at: new Date().toISOString()
  });
});

// Try multiple possible paths for static files
const possiblePaths = [
  join(__dirname, 'client', 'dist'),
  join(__dirname, 'dist', 'public'),
  join(__dirname, 'dist'),
  join(__dirname, 'client', 'public'),
  join(__dirname, 'public'),
];

// Find the first path that exists
let clientDistPath = null;
for (const path of possiblePaths) {
  if (fs.existsSync(path)) {
    clientDistPath = path;
    break;
  }
}

// Serve static files if a valid path was found
if (clientDistPath) {
  app.use(express.static(clientDistPath));
  console.log(`Serving static files from ${clientDistPath}`);
} else {
  console.log(`No static file directory found. Checked: ${possiblePaths.join(', ')}`);
}

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  
  // If we found a static directory, try to serve the index.html file
  if (clientDistPath) {
    const indexPath = join(clientDistPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
  }
  
  // Otherwise, serve a simple HTML response
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Application Starting</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
        .loader { border: 8px solid #f3f3f3; border-top: 8px solid #3498db; border-radius: 50%; width: 60px; height: 60px; animation: spin 2s linear infinite; margin: 30px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <h1>Application is starting...</h1>
      <div class="loader"></div>
      <p>The server is initializing resources. Please wait a moment.</p>
      <p>Server started at: ${new Date().toISOString()}</p>
      <p>Port: ${port}</p>
    </body>
    </html>
  `);
});

// Start the server
app.listen(port, "0.0.0.0", () => {
  console.log(`Minimal server is running on port ${port}`);
  console.log(`Server URL: http://0.0.0.0:${port}`);
});

// Log successful startup to a file for monitoring
fs.writeFileSync('minimal-server.log', `Server started at ${new Date().toISOString()} on port ${port}\n`);