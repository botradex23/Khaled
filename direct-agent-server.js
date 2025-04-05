/**
 * Direct Agent API Server
 * 
 * This is a completely standalone HTTP server for the Agent API.
 * It bypasses the Vite middleware completely and runs on a different port.
 */

import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { parse as parseUrl } from 'url';
import { config } from 'dotenv';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.AGENT_PORT || 5002; // Use a different port than the main server

// Helper function to read the request body as JSON
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    req.on('data', chunk => chunks.push(chunk));
    
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString());
        resolve(body);
      } catch (err) {
        reject(new Error('Invalid JSON'));
      }
    });
    
    req.on('error', reject);
  });
}

// Check for admin authentication header
function isAdminAuthenticated(req) {
  return req.headers['x-test-admin'] === 'true';
}

/**
 * Make a simple HTTPS request
 */
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => chunks.push(chunk));
      
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        let parsedBody;
        
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          parsedBody = body;
        }
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(parsedBody);
        } else {
          reject(new Error(`Request failed with status code ${res.statusCode}: ${JSON.stringify(parsedBody)}`));
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Get a chat completion from OpenAI
 */
async function getChatCompletion(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key is not configured');
    }
    
    const data = {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ],
      max_tokens: 1000
    };
    
    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      }
    };
    
    const response = await httpsRequest(options, data);
    return response.choices[0]?.message?.content || 'No response generated';
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
}

/**
 * List files in a directory
 */
function listFiles(directory) {
  try {
    const files = fs.readdirSync(directory, { withFileTypes: true })
      .filter(dirent => !dirent.name.startsWith('.'))
      .map(dirent => ({
        name: dirent.name,
        isDirectory: dirent.isDirectory(),
        path: resolve(directory, dirent.name)
      }));
    
    return files;
  } catch (error) {
    console.error(`Error listing files in ${directory}:`, error);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}

/**
 * Read a file
 */
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

/**
 * Send a JSON response
 */
function sendJsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Test-Admin'
  });
  res.write(JSON.stringify(data));
  res.end();
}

/**
 * Handle requests
 */
async function handleRequest(req, res) {
  const url = parseUrl(req.url);
  const method = req.method;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);
  
  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Test-Admin',
      'Access-Control-Max-Age': '86400' // 24 hours
    });
    res.end();
    return;
  }
  
  // Health check endpoint
  if (method === 'GET' && url.pathname === '/health') {
    console.log('Direct server health check requested');
    sendJsonResponse(res, {
      success: true,
      message: 'Direct agent server is running',
      apiKeyAvailable: !!process.env.OPENAI_API_KEY,
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Validate OpenAI API key endpoint
  if (method === 'GET' && url.pathname === '/validate-openai-key') {
    console.log('OpenAI key validation requested');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      sendJsonResponse(res, {
        success: false,
        message: 'OpenAI API key is not configured',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    try {
      // Make a minimal API call to verify the key
      const options = {
        hostname: 'api.openai.com',
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      };
      
      const data = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Say hello" }
        ],
        max_tokens: 5 // Use minimal tokens to save quota
      };
      
      await httpsRequest(options, data);
      
      console.log('OpenAI API test successful');
      sendJsonResponse(res, {
        success: true,
        message: 'OpenAI API key is valid and working',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error validating OpenAI key:', error);
      sendJsonResponse(res, {
        success: false,
        message: 'OpenAI API key validation failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
    return;
  }
  
  // Chat endpoint
  if (method === 'POST' && url.pathname === '/chat') {
    console.log('Chat request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { prompt, systemPrompt } = body;
      
      if (!prompt) {
        sendJsonResponse(res, {
          success: false,
          message: 'Prompt is required'
        }, 400);
        return;
      }
      
      console.log('Processing chat request with prompt length:', prompt.length);
      const response = await getChatCompletion(prompt, systemPrompt);
      
      sendJsonResponse(res, {
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // List files endpoint
  if (method === 'POST' && url.pathname === '/files') {
    console.log('List files request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { directory } = body;
      
      if (!directory) {
        sendJsonResponse(res, {
          success: false,
          message: 'Directory path is required'
        }, 400);
        return;
      }
      
      const dirPath = resolve(__dirname, directory);
      console.log(`Listing files in directory: ${dirPath}`);
      
      const files = listFiles(dirPath);
      
      sendJsonResponse(res, {
        success: true,
        files,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in list files endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Read file endpoint
  if (method === 'POST' && url.pathname === '/read-file') {
    console.log('Read file request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { filePath } = body;
      
      if (!filePath) {
        sendJsonResponse(res, {
          success: false,
          message: 'File path is required'
        }, 400);
        return;
      }
      
      const fullPath = resolve(__dirname, filePath);
      console.log(`Reading file: ${fullPath}`);
      
      const content = readFile(fullPath);
      
      sendJsonResponse(res, {
        success: true,
        content,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in read file endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Fallback for unknown routes
  sendJsonResponse(res, {
    success: false,
    message: 'Not found',
    timestamp: new Date().toISOString()
  }, 404);
}

// Create and start the server
const server = http.createServer(handleRequest);

// We need to listen on both 127.0.0.1 and 0.0.0.0 for different client types
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Direct Agent API Server is running on http://0.0.0.0:${PORT}`);
  console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
}).on('error', (err) => {
  console.error('Server startup error:', err.message);
  
  // If the port is already in use, try another one
  if (err.code === 'EADDRINUSE') {
    const newPort = PORT + 1;
    console.log(`Port ${PORT} is already in use, trying port ${newPort}...`);
    server.listen(newPort, '0.0.0.0', () => {
      console.log(`Direct Agent API Server is running on http://0.0.0.0:${newPort}`);
      console.log(`OpenAI API Key available: ${!!process.env.OPENAI_API_KEY}`);
    });
  }
});