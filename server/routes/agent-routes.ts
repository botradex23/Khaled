/**
 * Agent Routes
 * 
 * Explicit routes to handle agent API requests and forward them to the standalone agent server.
 * This ensures they don't get intercepted by the Vite middleware.
 */

import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();
const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL || 'http://localhost:3021';

// Log helper
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
  console.log(`[Agent Routes] [${level}] ${message}`);
}

// Common proxy handler for all agent routes
async function proxyToAgentServer(req: express.Request, res: express.Response, endpoint: string) {
  try {
    const targetUrl = `${AGENT_SERVER_URL}/agent-api${endpoint}`;
    log(`Proxying request to ${targetUrl}`);
    
    // Prepare request options
    const options: any = {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Add body for POST/PUT requests
    if (['POST', 'PUT'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
    }
    
    // Forward request to agent server
    const response = await fetch(targetUrl, options);
    const data = await response.json();
    
    // Return response from agent server
    return res.status(response.status).json(data);
  } catch (error: any) {
    log(`Error proxying to agent server: ${error.message}`, 'ERROR');
    return res.status(500).json({
      success: false,
      message: 'Error connecting to agent server',
      error: error.message
    });
  }
}

// Health check endpoint
router.get('/health', async (req, res) => {
  return proxyToAgentServer(req, res, '/health');
});

// Agent chat endpoint
router.post('/chat', async (req, res) => {
  return proxyToAgentServer(req, res, '/agent-chat');
});

// Agent task endpoint
router.post('/task', async (req, res) => {
  return proxyToAgentServer(req, res, '/agent-task');
});

// File operation endpoint
router.post('/file-op', async (req, res) => {
  return proxyToAgentServer(req, res, '/file-op');
});

// Search files endpoint
router.post('/search-files', async (req, res) => {
  return proxyToAgentServer(req, res, '/search/files');
});

// Search content endpoint
router.post('/search-content', async (req, res) => {
  return proxyToAgentServer(req, res, '/search/content');
});

// Status check endpoint
router.get('/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Agent routes are registered and active',
    timestamp: new Date().toISOString(),
    targetServer: AGENT_SERVER_URL
  });
});

export default router;