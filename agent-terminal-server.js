/**
 * Agent Terminal Server
 * 
 * This is a simple HTTP server optimized for terminal access that allows direct interaction 
 * with the OpenAI agent and file operations via cURL commands.
 * 
 * Features:
 * - File read/write/append operations
 * - Simple authentication via X-Test-Admin header
 * - Chat completion with OpenAI
 * - File operations via direct endpoints
 * - Ability to execute specific agent tasks with file access
 */

import http from 'http';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
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

// Always authenticate for terminal usage with test admin header
function isAuthenticated(req) {
  // For simplicity in terminal testing, we'll allow access with the X-Test-Admin header
  if (req.headers['x-test-admin'] === 'true') {
    console.log('Authenticated via X-Test-Admin header');
    return true;
  }
  
  // You can add other authentication methods here if needed
  return false;
}

// Helper for OpenAI API requests
async function makeOpenAIRequest(endpoint, data) {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  const https = await import('https');
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.openai.com',
      port: 443,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      }
    };
    
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
            console.error('OpenAI API error:', data);
            reject({ response: res, data, status: res.statusCode });
          }
        } catch (error) {
          reject({ error, rawResponse: responseBody, status: res.statusCode });
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Error making OpenAI request:', error);
      reject(error);
    });
    
    req.write(JSON.stringify(data));
    req.end();
  });
}

// Get a chat completion from OpenAI
async function getChatCompletion(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set in environment variables');
  }
  
  try {
    const response = await makeOpenAIRequest(
      '/v1/chat/completions',
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
    throw new Error(`Failed to get response from OpenAI: ${error.message || 'Unknown error'}`);
  }
}

// Execute a file operation command
async function executeFileOperation(operation, params) {
  switch(operation) {
    case 'read':
      return { 
        success: true, 
        content: readFile(params.filePath),
        timestamp: new Date().toISOString()
      };
    
    case 'write':
      writeFile(params.filePath, params.content);
      return { 
        success: true, 
        message: `File ${params.filePath} written successfully`,
        timestamp: new Date().toISOString()
      };
    
    case 'append':
      appendFile(params.filePath, params.content);
      return { 
        success: true, 
        message: `Content appended to ${params.filePath} successfully`,
        timestamp: new Date().toISOString()
      };
    
    case 'delete':
      const deleted = deleteFile(params.filePath);
      return { 
        success: true, 
        deleted,
        message: deleted ? `File ${params.filePath} deleted successfully` : `File ${params.filePath} not found`,
        timestamp: new Date().toISOString()
      };
    
    case 'list':
      return { 
        success: true, 
        files: listFiles(params.directory),
        timestamp: new Date().toISOString()
      };
    
    case 'exists':
      return { 
        success: true, 
        exists: fileExists(params.filePath),
        timestamp: new Date().toISOString()
      };
    
    case 'mkdir':
      ensureDirectoryExists(params.directoryPath);
      return { 
        success: true, 
        message: `Directory ${params.directoryPath} created or already exists`,
        timestamp: new Date().toISOString()
      };
    
    default:
      throw new Error(`Unknown file operation: ${operation}`);
  }
}

// Execute an agent task (simplified for terminal usage)
async function executeAgentTask(prompt, systemPrompt) {
  // For simple tasks, we'll just get a chat completion
  const response = await getChatCompletion(prompt, systemPrompt);
  return {
    success: true,
    response,
    timestamp: new Date().toISOString()
  };
}

// Send a JSON response
function sendJsonResponse(res, data, statusCode = 200) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, X-Test-Admin, Authorization'
  });
  res.write(JSON.stringify(data, null, 2));
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
  
  // Health check endpoint - useful for verifying the server is running
  if (method === 'GET' && url.pathname === '/health') {
    sendJsonResponse(res, { 
      status: 'ok', 
      server: 'Agent Terminal Server',
      timestamp: new Date().toISOString() 
    });
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
      
      await makeOpenAIRequest(
        '/v1/chat/completions',
        {
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Say hello" }
          ],
          max_tokens: 5 // Use minimal tokens to save quota
        }
      );
      
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
        error: error.message || 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
    return;
  }
  
  // --- File Operations Endpoints ---
  
  // Simple, curl-friendly read file endpoint
  if (method === 'GET' && url.pathname === '/read-file') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    const filePath = url.query ? new URLSearchParams(url.query).get('path') : null;
    
    if (!filePath) {
      sendJsonResponse(res, {
        success: false,
        message: 'Missing required parameter: path'
      }, 400);
      return;
    }
    
    try {
      console.log(`Reading file: ${filePath}`);
      const fileContent = readFile(filePath);
      
      sendJsonResponse(res, {
        success: true,
        content: fileContent,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error reading file:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Unified file operations endpoint - most useful for curl commands
  if (method === 'POST' && url.pathname === '/file-op') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { operation, ...params } = body;
      
      if (!operation) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: operation'
        }, 400);
        return;
      }
      
      // Validate required parameters for each operation
      switch(operation) {
        case 'read':
          if (!params.filePath) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: filePath'
            }, 400);
            return;
          }
          break;
        
        case 'write':
          if (!params.filePath || params.content === undefined) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameters: filePath and content'
            }, 400);
            return;
          }
          break;
        
        case 'append':
          if (!params.filePath || params.content === undefined) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameters: filePath and content'
            }, 400);
            return;
          }
          break;
        
        case 'delete':
          if (!params.filePath) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: filePath'
            }, 400);
            return;
          }
          break;
        
        case 'list':
          if (!params.directory) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: directory'
            }, 400);
            return;
          }
          break;
        
        case 'exists':
          if (!params.filePath) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: filePath'
            }, 400);
            return;
          }
          break;
        
        case 'mkdir':
          if (!params.directoryPath) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: directoryPath'
            }, 400);
            return;
          }
          break;
        
        default:
          sendJsonResponse(res, {
            success: false,
            message: `Unknown operation: ${operation}`
          }, 400);
          return;
      }
      
      console.log(`Executing file operation: ${operation}`);
      const result = await executeFileOperation(operation, params);
      sendJsonResponse(res, result);
    } catch (error) {
      console.error(`Error in file operation:`, error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Simple, curl-friendly test file creation endpoint
  if (method === 'POST' && url.pathname === '/create-test-file') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { filename, content } = body;
      
      if (!filename || content === undefined) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameters: filename and content'
        }, 400);
        return;
      }
      
      writeFile(filename, content);
      
      sendJsonResponse(res, {
        success: true,
        message: `File ${filename} created successfully`,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error creating test file:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // --- Agent Functionality Endpoints ---
  
  // Chat endpoint for terminal usage
  if (method === 'POST' && url.pathname === '/agent-chat') {
    if (!isAuthenticated(req)) {
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
      console.log(`Processing agent chat with prompt: ${body.prompt.substring(0, 50)}...`);
      
      const response = await getChatCompletion(body.prompt, systemPrompt);
      
      sendJsonResponse(res, {
        success: true,
        response,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in agent chat endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Execute an agent task with file operations
  if (method === 'POST' && url.pathname === '/agent-task') {
    if (!isAuthenticated(req)) {
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
      
      const systemPrompt = body.systemPrompt || 
        'You are an AI assistant with the ability to perform file operations. ' +
        'You can read, write, modify, and delete files as requested.';
      
      console.log(`Executing agent task with prompt: ${body.prompt.substring(0, 50)}...`);
      
      const result = await executeAgentTask(body.prompt, systemPrompt);
      sendJsonResponse(res, result);
    } catch (error) {
      console.error('Error in agent task endpoint:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // File operation with agent assistance
  if (method === 'POST' && url.pathname === '/agent-file-operation') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { action, filePath, content, prompt } = body;
      
      if (!action || !filePath) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameters: action and filePath'
        }, 400);
        return;
      }
      
      console.log(`Executing agent file operation: ${action} on ${filePath}`);
      
      let result;
      switch(action) {
        case 'writeFile':
          if (content === undefined) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: content'
            }, 400);
            return;
          }
          writeFile(filePath, content);
          result = { success: true, message: `File ${filePath} written successfully` };
          break;
          
        case 'readFile':
          if (!fileExists(filePath)) {
            result = { success: false, message: `File ${filePath} does not exist` };
          } else {
            const fileContent = readFile(filePath);
            result = { success: true, content: fileContent };
          }
          break;
          
        case 'generateAndWrite':
          if (!prompt) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: prompt'
            }, 400);
            return;
          }
          
          // First generate content with the agent
          const generatedContent = await getChatCompletion(
            `${prompt}\nGenerate content for the file ${filePath}.`,
            'You are an AI assistant that can generate file content based on requirements.'
          );
          
          // Then write the generated content to the file
          writeFile(filePath, generatedContent);
          
          result = { 
            success: true, 
            message: `Content generated and written to ${filePath} successfully`,
            content: generatedContent
          };
          break;
          
        default:
          sendJsonResponse(res, {
            success: false,
            message: `Unknown action: ${action}`
          }, 400);
          return;
      }
      
      sendJsonResponse(res, {
        ...result,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in agent file operation endpoint:', error);
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

// In Replit environment, listen on 0.0.0.0 to make the server accessible
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n====================================================`);
  console.log(`🤖 Agent Terminal Server running on port ${PORT}`);
  console.log(`====================================================`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health - Check if server is running`);
  console.log(`  GET  /verify-openai-key - Verify OpenAI API key`);
  console.log(`  GET  /read-file?path=<filepath> - Read a file (curl friendly)`);
  console.log(`  POST /file-op - Execute file operations`);
  console.log(`  POST /create-test-file - Create a test file`);
  console.log(`  POST /agent-chat - Chat with the agent`);
  console.log(`  POST /agent-task - Execute an agent task`);
  console.log(`  POST /agent-file-operation - Perform file operations with agent assistance`);
  console.log(`\nAuthentication: Include 'X-Test-Admin: true' header in all requests`);
  console.log(`====================================================\n`);
});

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});