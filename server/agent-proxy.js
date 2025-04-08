/**
 * Agent API Proxy
 * 
 * This module creates a proxy from the main Express server to the standalone Agent server.
 * It allows clients to make requests to the main server which get forwarded to the agent.
 */

import { createProxyMiddleware } from 'http-proxy-middleware';

/**
 * Create a proxy middleware to forward agent requests to the standalone server
 * @param {number} targetPort - Port of the standalone agent server
 * @returns {function} Proxy middleware function
 */
function createAgentProxy(targetPort = 3021) {
  return createProxyMiddleware({
    target: `http://localhost:${targetPort}`,
    changeOrigin: true,
    pathRewrite: {
      '^/api/agent': '/agent-api',  // Rewrite path from /api/agent to /agent-api
    },
    logLevel: 'silent',
    onError: (err, req, res) => {
      console.error(`[Agent Proxy] Error: ${err.message}`);
      res.writeHead(500, {
        'Content-Type': 'application/json',
      });
      res.end(JSON.stringify({
        success: false,
        message: 'Agent service unavailable. The standalone agent server may not be running.',
        error: err.message
      }));
    }
  });
}

/**
 * Initialize the agent proxy middleware
 * @param {Object} app - Express application
 * @param {number} targetPort - Port where the standalone agent server is running
 */
export function initializeAgentProxy(app, targetPort = 3021) {
  try {
    console.log(`Initializing Agent API proxy to standalone server on port ${targetPort}`);
    
    // Create and apply the proxy middleware for /api/agent routes
    const agentProxy = createAgentProxy(targetPort);
    app.use('/api/agent', agentProxy);
    
    console.log('Agent API proxy initialized successfully');
    
    // Add a simple health check endpoint that doesn't use the proxy
    app.get('/api/agent-status', (req, res) => {
      res.json({
        status: 'ok',
        message: 'Agent API proxy is active',
        timestamp: new Date().toISOString()
      });
    });
  } catch (error) {
    console.error('Failed to initialize Agent API proxy:', error);
  }
}

export default { initializeAgentProxy };