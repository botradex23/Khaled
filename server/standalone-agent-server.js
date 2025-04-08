/**
 * Standalone Agent API Server
 * 
 * This server runs independently from the main Express application
 * to avoid conflicts with Vite middleware. It provides the same
 * agent functionality but on a different port.
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Constants
const PORT = process.env.AGENT_PORT || 3021;
const PID_FILE = './agent-server.pid';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Optional File Utils - will attempt to import
let fileUtils = null;

/**
 * Save the process ID to a file for management
 */
function savePidToFile() {
  try {
    fs.writeFileSync(PID_FILE, process.pid.toString(), 'utf8');
    logInfo(`Process ID ${process.pid} saved to ${PID_FILE}`);
  } catch (error) {
    logError('Failed to save PID file', error);
  }
}

/**
 * Log information message
 */
function logInfo(message) {
  console.log(`[Agent Server] ${message}`);
}

/**
 * Log error message
 */
function logError(message, error) {
  console.error(`[Agent Server] ERROR: ${message}`, error);
}

/**
 * Import the file utilities module if available
 */
async function importFileUtils() {
  try {
    const module = await import('../agent-file-utils.js');
    fileUtils = module;
    logInfo('File utilities module loaded successfully');
    return true;
  } catch (error) {
    logInfo('File utilities module not available, file operations will be limited');
    return false;
  }
}

/**
 * Make a request to the OpenAI API
 */
async function makeOpenAIRequest(endpoint, data) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not set in environment variables');
    }
    
    // Log the first 5 characters of the API key for debugging
    const apiKeyPreview = apiKey.substring(0, 5) + '...';
    logInfo(`Making OpenAI API request to ${endpoint} with API key starting with ${apiKeyPreview}`);
    
    // Set up fetch options with a timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const fetchOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(data),
      signal: controller.signal
    };
    
    // Log the request data (with sensitive info redacted)
    const redactedData = { ...data };
    if (redactedData.model) {
      logInfo(`Using model: ${redactedData.model}`);
    }
    
    // Make the actual fetch request
    const response = await fetch(`https://api.openai.com/v1/${endpoint}`, fetchOptions);
    clearTimeout(timeoutId); // Clear the timeout if request completes before timeout
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`OpenAI API Error (${response.status})`, errorText);
      throw new Error(`OpenAI API Error (${response.status}): ${errorText}`);
    }
    
    logInfo(`OpenAI API request to ${endpoint} successful`);
    return await response.json();
  } catch (error) {
    // Check for specific errors
    if (error.name === 'AbortError') {
      logError('OpenAI API request timed out after 15 seconds', error);
      throw new Error('OpenAI API request timed out after 15 seconds. Please try again.');
    } else if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
      logError('OpenAI API network error', error);
      throw new Error(`Network error connecting to OpenAI: ${error.message}`);
    } else {
      logError('OpenAI API request failed', error);
      throw error;
    }
  }
}

/**
 * Get a chat completion from OpenAI
 */
async function getChatCompletion(prompt, systemPrompt = 'You are a helpful AI assistant.') {
  try {
    logInfo(`Making chat completion request with prompt: ${prompt.substring(0, 50)}...`);
    
    // Set a timeout for the OpenAI request
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI API request timed out after 10 seconds')), 10000);
    });
    
    // Create the actual API request
    const apiRequestPromise = makeOpenAIRequest('chat/completions', {
      model: "gpt-3.5-turbo", // Fallback to a faster model
      messages: [
        {
          role: "system",
          content: systemPrompt
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });
    
    // Race between the timeout and the API request
    const response = await Promise.race([apiRequestPromise, timeoutPromise]);
    
    logInfo('Chat completion successful');
    return {
      success: true,
      message: response.choices[0].message.content,
      full_response: response
    };
  } catch (error) {
    logError('Error getting chat completion', error);
    return {
      success: false,
      message: `Error getting chat completion: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Execute a complex agent task with file operations
 */
async function executeAgentTask(prompt, systemPrompt) {
  try {
    if (!fileUtils) {
      // If file utils not available, just do a regular chat completion
      return await getChatCompletion(prompt, systemPrompt);
    }
    
    // Enhanced system prompt that mentions file operation capabilities
    const enhancedSystemPrompt = `${systemPrompt}
You have access to the file system. You can perform the following operations:
- Read files
- List files in directories
- Find files containing specific text
- Search for files by patterns

When referring to files, please use relative paths or provide clear file names.`;
    
    // Get initial chat completion
    const completion = await getChatCompletion(prompt, enhancedSystemPrompt);
    
    if (!completion.success) {
      return completion;
    }
    
    // Process file operations if needed in a follow-up step
    // This is just a placeholder - a real implementation would parse the completion
    // for file operation requests and execute them
    
    return completion;
  } catch (error) {
    return {
      success: false,
      message: `Error executing agent task: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Start the standalone agent server
 */
async function startServer() {
  try {
    // Initialize Express
    const app = express();
    app.use(cors());
    app.use(express.json());
    
    // Save PID to file for management
    savePidToFile();
    
    // Try to import file utilities
    await importFileUtils();
    
    // Health endpoint
    app.get('/agent-api/health', (req, res) => {
      res.json({
        status: 'ok',
        pid: process.pid,
        timestamp: new Date().toISOString(),
        fileUtilsAvailable: !!fileUtils
      });
    });
    
    // OpenAI key verification endpoint
    app.get('/agent-api/verify-openai-key', async (req, res) => {
      try {
        if (!process.env.OPENAI_API_KEY) {
          return res.status(400).json({
            success: false,
            message: 'OPENAI_API_KEY is not set in environment variables'
          });
        }
        
        // Make a simple request to the OpenAI API to check if the key is valid
        const response = await makeOpenAIRequest('models', {});
        
        res.json({
          success: true,
          message: 'OpenAI API key is valid',
          models_available: response.data ? response.data.length : 'unknown'
        });
      } catch (error) {
        res.status(400).json({
          success: false,
          message: `Invalid OpenAI API key: ${error.message}`,
          error: error.message
        });
      }
    });
    
    // Chat completion endpoint
    app.post('/agent-api/agent-chat', async (req, res) => {
      try {
        const { prompt, systemPrompt } = req.body;
        
        if (!prompt) {
          return res.status(400).json({
            success: false,
            message: 'Prompt is required'
          });
        }
        
        const completion = await getChatCompletion(prompt, systemPrompt);
        res.json(completion);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: `Error getting chat completion: ${error.message}`,
          error: error.message
        });
      }
    });
    
    // Agent task endpoint
    app.post('/agent-api/agent-task', async (req, res) => {
      try {
        const { prompt, systemPrompt } = req.body;
        
        if (!prompt) {
          return res.status(400).json({
            success: false,
            message: 'Prompt is required'
          });
        }
        
        const result = await executeAgentTask(prompt, systemPrompt);
        res.json(result);
      } catch (error) {
        res.status(500).json({
          success: false,
          message: `Error executing agent task: ${error.message}`,
          error: error.message
        });
      }
    });
    
    // File operation endpoint (if file utils available)
    app.post('/agent-api/file-op', async (req, res) => {
      try {
        if (!fileUtils) {
          return res.status(400).json({
            success: false,
            message: 'File operations not available'
          });
        }
        
        const { operation, params } = req.body;
        
        if (!operation) {
          return res.status(400).json({
            success: false,
            message: 'Operation is required'
          });
        }
        
        // Execute the requested file operation
        let result;
        
        switch (operation) {
          case 'readFile':
            result = fileUtils.readFile(params.path);
            break;
          case 'listFiles':
            result = fileUtils.listFiles(params.directory);
            break;
          case 'listFilesRecursive':
            result = fileUtils.listFilesRecursive(params.directory, params.options);
            break;
          case 'findFilesContainingText':
            result = await fileUtils.findFilesContainingText(params.text, params.options);
            break;
          default:
            return res.status(400).json({
              success: false,
              message: `Unsupported operation: ${operation}`
            });
        }
        
        res.json({
          success: true,
          result
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          message: `Error executing file operation: ${error.message}`,
          error: error.message
        });
      }
    });
    
    // Start the server
    const server = http.createServer(app);
    
    server.listen(PORT, '0.0.0.0', () => {
      logInfo(`Agent API Server running on port ${PORT}`);
    });
    
    // Handle shutdown
    process.on('SIGINT', () => {
      logInfo('Received SIGINT signal. Shutting down...');
      server.close(() => {
        logInfo('Server closed. Exiting process.');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      logInfo('Received SIGTERM signal. Shutting down...');
      server.close(() => {
        logInfo('Server closed. Exiting process.');
        process.exit(0);
      });
    });
    
  } catch (error) {
    logError('Failed to start agent server', error);
    process.exit(1);
  }
}

// Start the server
startServer();