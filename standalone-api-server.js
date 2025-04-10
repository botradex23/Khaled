/**
 * Standalone API Server
 * 
 * This is a completely independent Express server dedicated to handling API requests
 * without any interference from Vite middleware. It runs on a different port (3099).
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// __dirname is available in CommonJS

const app = express();
const PORT = 3099;

// Enable CORS for all routes
app.use(cors());

// Middleware to parse JSON
app.use(express.json());

// Middleware for logging
app.use((req, res, next) => {
  console.log(`[Standalone API] ${req.method} ${req.url}`);
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
    const { path: filePath } = req.query;
    
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
    
    const filePath_full = path.resolve(process.cwd(), normalizedPath);
    
    if (!fs.existsSync(filePath_full)) {
      return res.status(404).json({ 
        success: false, 
        message: 'File not found' 
      });
    }
    
    const content = fs.readFileSync(filePath_full, 'utf-8');
    
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

// File list endpoint
app.get('/list-files', ensureAdmin, (req, res) => {
  try {
    const { directory } = req.query;
    
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
    
    const directoryPath = path.resolve(process.cwd(), normalizedPath);
    
    if (!fs.existsSync(directoryPath)) {
      return res.status(404).json({ 
        success: false, 
        message: 'Directory not found' 
      });
    }
    
    const files = fs.readdirSync(directoryPath).map(file => {
      const filePath = path.join(directoryPath, file);
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
  console.log(`Standalone API server running on port ${PORT}`);
  console.log(`Use http://localhost:${PORT}/read-file?path=<relative-file-path> to access files`);
  console.log(`Include X-Test-Admin: true header for authentication`);
});