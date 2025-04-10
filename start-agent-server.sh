#!/bin/bash

# Start the standalone agent API server on port 3099
# This server bypasses the Vite middleware, providing direct access to file operations

echo "Starting Standalone Agent API Server on port 3099..."

# Kill any existing instance
if [ -f agent-standalone-api.pid ]; then
    echo "Stopping previous server instance..."
    kill $(cat agent-standalone-api.pid) 2>/dev/null || true
    rm agent-standalone-api.pid
fi

# Create the server file if it doesn't exist
if [ ! -f standalone-api-server.mjs ]; then
    echo "Creating standalone API server file..."
    cat > standalone-api-server.mjs << 'EOF'
/**
 * Standalone Agent API Server
 * 
 * This Express server runs separately from the main application to provide
 * direct access to file operations without interference from Vite middleware.
 * It uses ES modules syntax.
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { OpenAI } from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get directory of current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.AGENT_API_PORT || 3099;
const ADMIN_HEADER = 'X-Test-Admin';
const PID_FILE = 'agent-standalone-api.pid';

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Authentication middleware
function isAuthenticated(req) {
  return req.header(ADMIN_HEADER) === 'true';
}

// Authentication check middleware
function checkAuth(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: 'Unauthorized. Please provide valid authentication.',
    });
  }
}

// Routes
app.get('/status', (req, res) => {
  res.json({
    success: true,
    message: 'Standalone Agent API Server is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// File reading endpoint
app.get('/read-file', checkAuth, (req, res) => {
  const filePath = req.query.path;
  
  if (!filePath) {
    return res.status(400).json({
      success: false,
      message: 'Path parameter is required',
    });
  }
  
  try {
    // Safely resolve path relative to project root
    const fullPath = path.resolve(process.cwd(), filePath);
    
    // Security check: ensure path is within project 
    if (!fullPath.startsWith(process.cwd())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Path is outside project root.',
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found: ' + filePath,
      });
    }
    
    // Check if it's a directory
    if (fs.statSync(fullPath).isDirectory()) {
      return res.status(400).json({
        success: false,
        message: 'Path is a directory, not a file',
      });
    }
    
    // Read file content
    const content = fs.readFileSync(fullPath, 'utf8');
    
    res.json({
      success: true,
      path: filePath,
      content,
    });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({
      success: false,
      message: 'Error reading file: ' + error.message,
    });
  }
});

// List files endpoint
app.get('/list-files', checkAuth, (req, res) => {
  const directory = req.query.directory || '.';
  
  try {
    // Safely resolve path relative to project root
    const fullPath = path.resolve(process.cwd(), directory);
    
    // Security check: ensure path is within project
    if (!fullPath.startsWith(process.cwd())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Path is outside project root.',
      });
    }
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        message: 'Directory not found: ' + directory,
      });
    }
    
    // Check if it's a directory
    if (!fs.statSync(fullPath).isDirectory()) {
      return res.status(400).json({
        success: false,
        message: 'Path is a file, not a directory',
      });
    }
    
    // Read directory contents
    const items = fs.readdirSync(fullPath);
    
    // Get file information
    const files = items.map(item => {
      const itemPath = path.join(fullPath, item);
      const stat = fs.statSync(itemPath);
      
      return {
        name: item,
        path: path.relative(process.cwd(), itemPath),
        isDirectory: stat.isDirectory(),
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });
    
    res.json({
      success: true,
      directory,
      files,
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({
      success: false,
      message: 'Error listing files: ' + error.message,
    });
  }
});

// OpenAI chat completion endpoint
app.post('/chat-completion', checkAuth, async (req, res) => {
  const { prompt, systemPrompt = 'You are a helpful AI assistant.' } = req.body;
  
  if (!prompt) {
    return res.status(400).json({
      success: false,
      message: 'Prompt is required',
    });
  }
  
  try {
    const completion = await openai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      model: 'gpt-3.5-turbo',
    });
    
    res.json({
      success: true,
      completion: completion.choices[0]?.message?.content || '',
      usage: completion.usage,
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting completion: ' + (error.message || 'Unknown error'),
    });
  }
});

// Start the server
const server = app.listen(PORT, () => {
  console.log(`Standalone Agent API Server is running on port ${PORT}`);
  
  // Save PID to file for easier management
  fs.writeFileSync(PID_FILE, process.pid.toString());
  console.log(`Server PID ${process.pid} saved to ${PID_FILE}`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  server.close(() => {
    console.log('Server stopped');
    if (fs.existsSync(PID_FILE)) {
      fs.unlinkSync(PID_FILE);
      console.log(`Removed PID file ${PID_FILE}`);
    }
    process.exit(0);
  });
});
EOF
    echo "Standalone API server file created."
fi

# Start the server in the background
node standalone-api-server.mjs &

# Save PID
echo $! > agent-standalone-api.pid
echo "Server started with PID: $(cat agent-standalone-api.pid)"
echo "To stop the server, run: kill $(cat agent-standalone-api.pid)"