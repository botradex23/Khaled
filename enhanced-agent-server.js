/**
 * Enhanced Agent API Server
 * 
 * This is an improved standalone HTTP server for the Agent API that works
 * in both Replit and VPS environments with enhanced file operations.
 */

import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';
import { parse as parseUrl } from 'url';
import { config } from 'dotenv';
import { 
  readFile, 
  writeFile, 
  appendFile, 
  deleteFile, 
  listFiles, 
  fileExists,
  ensureDirectoryExists
} from './agent-file-utils.js';

// Load environment variables
config();

// Get directory info
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const PORT = process.env.AGENT_PORT || 5002;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Helper function to read the request body as JSON
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString();
        if (body) {
          resolve(JSON.parse(body));
        } else {
          resolve({});
        }
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

// Check if the user is authenticated as admin
function isAdminAuthenticated(req) {
  // For development and testing, allow a special header to authenticate
  if (req.headers['x-test-admin'] === 'true') {
    console.log('Admin authenticated via X-Test-Admin header');
    return true;
  }
  
  // In production, implement proper authentication
  // For example, check a valid JWT token or session cookie
  return false;
}

// Make a simple HTTPS request
function httpsRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const responseBody = Buffer.concat(chunks).toString();
        try {
          const data = JSON.parse(responseBody);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(data);
          } else {
            reject({ response: res, data, status: res.statusCode });
          }
        } catch (error) {
          reject({ error, rawResponse: responseBody, status: res.statusCode });
        }
      });
    });
    
    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Get a chat completion from OpenAI
async function getChatCompletion(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  try {
    const response = await httpsRequest(
      {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      },
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        max_tokens: 2048
      }
    );
    
    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting chat completion:', error);
    throw new Error(`Failed to get response from OpenAI: ${error.message}`);
  }
}

// Send a JSON response
function sendJsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, X-Test-Admin, Authorization'
  });
  res.write(JSON.stringify(data));
  res.end();
}

// Handle requests
async function handleRequest(req, res) {
  const url = parseUrl(req.url);
  const method = req.method;
  
  console.log(`[${new Date().toISOString()}] ${method} ${url.pathname}`);
  
  // Handle CORS preflight requests
  if (method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, X-Test-Admin, Authorization',
      'Access-Control-Max-Age': '86400' // 24 hours
    });
    res.end();
    return;
  }
  
  // Health check endpoint
  if (method === 'GET' && url.pathname === '/health') {
    sendJsonResponse(res, { status: 'ok', timestamp: new Date().toISOString() });
    return;
  }
  
  // Verify OpenAI API key
  if (method === 'GET' && url.pathname === '/verify-openai-key') {
    try {
      if (!OPENAI_API_KEY) {
        sendJsonResponse(res, {
          success: false,
          message: 'OPENAI_API_KEY is not set in environment variables',
          timestamp: new Date().toISOString()
        }, 400);
        return;
      }
      
      const options = {
        hostname: 'api.openai.com',
        port: 443,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
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
      console.error('Error validating OpenAI key: process.env.KEY || ""OpenAI API key validation failed',
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
      
      if (!body.prompt) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: prompt'
        }, 400);
        return;
      }
      
      const systemPrompt = body.systemPrompt || 'You are a helpful AI assistant.';
      const response = await getChatCompletion(body.prompt, systemPrompt);
      
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
          message: 'Missing required parameter: directory'
        }, 400);
        return;
      }
      
      // Use path.resolve to handle both absolute and relative paths
      const dirPath = resolve(directory);
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
          message: 'Missing required parameter: filePath'
        }, 400);
        return;
      }
      
      console.log(`Reading file: ${filePath}`);
      
      const fileContent = readFile(filePath);
      
      sendJsonResponse(res, {
        success: true,
        content: fileContent,
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
  
  // Write file endpoint
  if (method === 'POST' && url.pathname === '/write-file') {
    console.log('Write file request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { filePath, content } = body;
      
      if (!filePath || content === undefined) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameters: filePath and content'
        }, 400);
        return;
      }
      
      console.log(`Writing to file: ${filePath}`);
      
      writeFile(filePath, content);
      
      sendJsonResponse(res, {
        success: true,
        message: 'File written successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in write file endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Append to file endpoint
  if (method === 'POST' && url.pathname === '/append-file') {
    console.log('Append file request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { filePath, content } = body;
      
      if (!filePath || content === undefined) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameters: filePath and content'
        }, 400);
        return;
      }
      
      console.log(`Appending to file: ${filePath}`);
      
      appendFile(filePath, content);
      
      sendJsonResponse(res, {
        success: true,
        message: 'Content appended successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in append file endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Delete file endpoint
  if (method === 'POST' && url.pathname === '/delete-file') {
    console.log('Delete file request received');
    
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
          message: 'Missing required parameter: filePath'
        }, 400);
        return;
      }
      
      console.log(`Deleting file: ${filePath}`);
      
      const deleted = deleteFile(filePath);
      
      sendJsonResponse(res, {
        success: true,
        deleted,
        message: deleted ? 'File deleted successfully' : 'File not found',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in delete file endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Ensure directory exists endpoint
  if (method === 'POST' && url.pathname === '/ensure-directory') {
    console.log('Ensure directory request received');
    
    if (!isAdminAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { directoryPath } = body;
      
      if (!directoryPath) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: directoryPath'
        }, 400);
        return;
      }
      
      console.log(`Ensuring directory exists: ${directoryPath}`);
      
      ensureDirectoryExists(directoryPath);
      
      sendJsonResponse(res, {
        success: true,
        message: 'Directory created or already exists',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in ensure directory endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // File exists endpoint
  if (method === 'POST' && url.pathname === '/file-exists') {
    console.log('File exists request received');
    
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
          message: 'Missing required parameter: filePath'
        }, 400);
        return;
      }
      
      console.log(`Checking if file exists: ${filePath}`);
      
      const exists = fileExists(filePath);
      
      sendJsonResponse(res, {
        success: true,
        exists,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in file exists endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // If we reach here, the endpoint wasn't found
  sendJsonResponse(res, {
    success: false,
    message: 'Endpoint not found'
  }, 404);
}

// Create and start the server
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Enhanced Agent API server running on port ${PORT}`);
});