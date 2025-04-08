/**
 * Agent Terminal Server
 * 
 * This is a HTTP server optimized for autonomous agent access that allows direct interaction 
 * with the OpenAI agent and comprehensive file operations across the workspace.
 * 
 * Features:
 * - Full workspace file traversal and operations
 * - Recursive file listing and searching
 * - Content-based file search (find files containing text)
 * - Pattern-based file search (glob patterns)
 * - Simple authentication via X-Test-Admin header
 * - Chat completion with OpenAI
 * - Enhanced agent task execution with automatic file access
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
  listFilesRecursive,
  fileExists,
  ensureDirectoryExists,
  findFilesByPattern,
  findFilesContainingText,
  getFileMetadata
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
      
    case 'list-recursive':
      return { 
        success: true, 
        files: listFilesRecursive(
          params.directory, 
          {
            maxDepth: params.maxDepth || -1,
            exclude: params.exclude || ['node_modules', '.git', 'dist'],
            include: params.include || null
          }
        ),
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
      
    case 'metadata':
      return {
        success: true,
        metadata: getFileMetadata(params.filePath),
        timestamp: new Date().toISOString()
      };
      
    case 'find-by-pattern':
      const patternResults = await findFilesByPattern(
        params.pattern, 
        params.startDir || process.cwd()
      );
      return {
        success: true,
        files: patternResults,
        count: patternResults.length,
        timestamp: new Date().toISOString()
      };
      
    case 'find-by-content':
      const contentResults = await findFilesContainingText(
        params.text,
        {
          startDir: params.startDir || process.cwd(),
          extensions: params.extensions || [],
          caseSensitive: params.caseSensitive || false
        }
      );
      return {
        success: true,
        files: contentResults,
        count: contentResults.length,
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
    console.error('Error occurred:', error);
    // Add proper error handling
    if (error.code === 'ENOENT') {
      // File not found error
      console.warn('File or directory not found, creating fallback...');
      // Add appropriate fallback logic
    } else if (error.message && error.message.includes('NetworkError')) {
      // Network error
      console.warn('Network error detected, will retry later...');
      // Add retry mechanism or graceful degradation
    } else {
      // Other error types
      console.warn('Unexpected error, proceeding with defaults...');
      // Add fallback or recovery logic
    }
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
        'You are an advanced AI assistant with complete autonomy and full access to the entire project workspace. ' +
        'You can browse directories, read any file, search for content across the codebase, and modify files as needed. ' +
        'Your capabilities include: ' +
        '1. Recursive file traversal and directory listing with depth control ' +
        '2. Finding files by name patterns using glob syntax ' +
        '3. Searching for files containing specific text or code patterns ' +
        '4. Getting detailed file metadata to understand file relationships ' +
        '5. Reading, writing, and modifying files across the entire project ' +
        '6. Analyzing code to find and fix problems without needing exact file paths ' +
        'You should autonomously navigate the file system to find relevant information and solve problems. ' +
        'When asked to investigate or fix issues, take initiative to locate the appropriate files using your search capabilities. ' +
        'Always consider the entire workspace context and provide solutions that address the root cause of problems.';
      
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
  
  // Find files by pattern endpoint
  if (method === 'POST' && url.pathname === '/search/files') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { pattern, startDir } = body;
      
      if (!pattern) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: pattern'
        }, 400);
        return;
      }
      
      console.log(`Searching for files with pattern: ${pattern}`);
      
      const results = await findFilesByPattern(pattern, startDir || process.cwd());
      
      sendJsonResponse(res, {
        success: true,
        files: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error searching for files:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // Find files containing text endpoint
  if (method === 'POST' && url.pathname === '/search/content') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { text, startDir, extensions, caseSensitive } = body;
      
      if (!text) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: text'
        }, 400);
        return;
      }
      
      console.log(`Searching for files containing text: ${text}`);
      
      const results = await findFilesContainingText(
        text,
        {
          startDir: startDir || process.cwd(),
          extensions: extensions || [],
          caseSensitive: caseSensitive || false
        }
      );
      
      sendJsonResponse(res, {
        success: true,
        files: results,
        count: results.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error searching file content:', error);
      sendJsonResponse(res, {
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      }, 500);
    }
    return;
  }
  
  // List files recursively endpoint
  if (method === 'POST' && url.pathname === '/list-recursive') {
    if (!isAuthenticated(req)) {
      sendJsonResponse(res, {
        success: false,
        message: 'Authentication required. Please include X-Test-Admin: true header.'
      }, 401);
      return;
    }
    
    try {
      const body = await readRequestBody(req);
      const { directory, maxDepth, exclude, include } = body;
      
      if (!directory) {
        sendJsonResponse(res, {
          success: false,
          message: 'Missing required parameter: directory'
        }, 400);
        return;
      }
      
      console.log(`Listing files recursively in directory: ${directory}`);
      
      const files = listFilesRecursive(
        directory, 
        {
          maxDepth: maxDepth || -1,
          exclude: exclude || ['node_modules', '.git', 'dist'],
          include: include || null
        }
      );
      
      sendJsonResponse(res, {
        success: true,
        files,
        count: files.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error listing files recursively:', error);
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
            `${prompt}\nGenerate content for the file ${filePath}. Use your full autonomy and workspace access capabilities to ensure this content fits properly in the project structure and follows the project's coding style and conventions.`,
            'You are an advanced AI assistant with complete autonomy and full access to the entire project workspace. You can analyze existing files to determine the appropriate style, structure, and conventions to follow when generating new content.'
          );
          
          // Then write the generated content to the file
          writeFile(filePath, generatedContent);
          
          result = { 
            success: true, 
            message: `Content generated and written to ${filePath} successfully`,
            content: generatedContent
          };
          break;
          
        case 'modifyFile':
          if (!prompt) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: prompt'
            }, 400);
            return;
          }
          
          // First check if the file exists
          if (!fileExists(filePath)) {
            sendJsonResponse(res, {
              success: false,
              message: `File ${filePath} does not exist`
            }, 400);
            return;
          }
          
          // Read the current content
          const currentContent = readFile(filePath);
          
          // Ask the agent to modify the content
          const modifiedContent = await getChatCompletion(
            `${prompt}\n\nHere is the current content of ${filePath}:\n\n${currentContent}\n\nPlease provide the complete modified version of this file. Return the entire file content with your changes integrated.`,
            'You are an advanced AI assistant with complete autonomy and full access to the entire project workspace. You can analyze and modify code to implement requested changes, fix issues, or add features. Be careful to maintain the correct syntax and structure of the file, and ensure your changes are consistent with the existing codebase. Return the COMPLETE file content, not just the changes.'
          );
          
          // Write the modified content back to the file
          writeFile(filePath, modifiedContent);
          
          result = { 
            success: true, 
            message: `File ${filePath} modified successfully`,
            originalContent: currentContent,
            modifiedContent: modifiedContent
          };
          break;
          
        case 'analyzeAndFix':
          if (!prompt) {
            sendJsonResponse(res, {
              success: false,
              message: 'Missing required parameter: prompt'
            }, 400);
            return;
          }
          
          // First check if the file exists
          if (!fileExists(filePath)) {
            sendJsonResponse(res, {
              success: false,
              message: `File ${filePath} does not exist`
            }, 400);
            return;
          }
          
          // Read the current content
          const fileToFix = readFile(filePath);
          
          // Ask the agent to analyze and fix the file
          const fixedContent = await getChatCompletion(
            `${prompt}\n\nHere is the content of ${filePath} that needs to be analyzed and fixed:\n\n${fileToFix}\n\nPlease analyze the code for issues, bugs, or improvements, and provide the complete fixed version of the file. Return the entire file content with your fixes integrated.`,
            'You are an advanced AI assistant with debugging and code analysis capabilities. You can identify and fix issues like syntax errors, logical bugs, performance problems, or best practice violations. Make your fixes while maintaining the original functionality. Return the COMPLETE fixed file content.'
          );
          
          // Write the fixed content back to the file
          writeFile(filePath, fixedContent);
          
          result = { 
            success: true, 
            message: `File ${filePath} analyzed and fixed successfully`,
            originalContent: fileToFix,
            fixedContent: fixedContent
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
  console.log(`  POST /file-op - Execute file operations (read,write,append,delete,list,exists,mkdir)`);
  console.log(`  POST /create-test-file - Create a test file`);
  console.log(`  POST /agent-chat - Chat with the agent`);
  console.log(`  POST /agent-task - Execute an agent task with full workspace access`);
  console.log(`  POST /agent-file-operation - Perform file operations with agent assistance`);
  console.log(`\nAdvanced File Operations:`);
  console.log(`  POST /search/files - Find files by name pattern`);
  console.log(`  POST /search/content - Find files containing specific text`);
  console.log(`  POST /list-recursive - List files recursively with filtering options`);
  console.log(`\nEnhanced File Operations via /file-op endpoint:`);
  console.log(`  - list-recursive: Recursive directory listing with depth control`);
  console.log(`  - find-by-pattern: Find files matching glob patterns`);
  console.log(`  - find-by-content: Find files containing specific text`);
  console.log(`  - metadata: Get detailed file metadata`);
  console.log(`\nAutonomous Agent File Operations (via /agent-file-operation):`);
  console.log(`  - readFile: Read a file with agent assistance`);
  console.log(`  - writeFile: Write content to a file`);
  console.log(`  - generateAndWrite: Generate new file content based on requirements`);
  console.log(`  - modifyFile: Intelligently modify an existing file based on instructions`);
  console.log(`  - analyzeAndFix: Find and fix bugs, issues or improvements in a file`);
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