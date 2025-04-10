/**
 * Standalone API Server (.mjs extension for ES modules)
 * 
 * This server runs independently from the main app and Vite middleware,
 * providing direct JSON access to files.
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3099;

// Middleware to parse JSON
app.use(express.json());

// Middleware for CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Test-Admin');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Authentication middleware for admin operations
function ensureAdmin(req, res, next) {
  const hasTestAdminHeader = req.headers['x-test-admin'] === 'true';
  if (hasTestAdminHeader) {
    return next();
  } else {
    return res.status(403).json({ 
      success: false, 
      message: 'Admin access required (missing header)' 
    });
  }
}

// Status endpoint
app.get('/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Standalone API server is running',
    timestamp: new Date().toISOString()
  });
});

// Read file endpoint
app.get('/read-file', ensureAdmin, (req, res) => {
  try {
    const filePath = req.query.path;
    
    if (!filePath) {
      return res.status(400).json({ 
        success: false, 
        message: 'File path is required as a query parameter' 
      });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(filePath);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid file path. Must be relative to project root.' 
      });
    }
    
    const fullPath = path.resolve(process.cwd(), normalizedPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    res.json({ 
      success: true, 
      content
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List files endpoint
app.get('/list-files', ensureAdmin, (req, res) => {
  try {
    const directory = req.query.directory;
    
    if (!directory) {
      return res.status(400).json({ 
        success: false, 
        message: 'Directory path is required as a query parameter' 
      });
    }
    
    // Ensure the path is within the project
    const normalizedPath = path.normalize(directory);
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid directory path. Must be relative to project root.' 
      });
    }
    
    const fullPath = path.resolve(process.cwd(), normalizedPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Directory not found' 
      });
    }
    
    const files = fs.readdirSync(fullPath).map(file => {
      const filePath = path.join(fullPath, file);
      const stats = fs.statSync(filePath);
      
      return {
        name: file,
        path: filePath,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime
      };
    });
    
    res.json({ 
      success: true, 
      files
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Standalone API server is running on port ${PORT}`);
  console.log(`Access it at: http://localhost:${PORT}/status`);
  console.log(`To read files: http://localhost:${PORT}/read-file?path=path/to/file`);
  console.log(`Include the 'X-Test-Admin: true' header for authentication`);
});