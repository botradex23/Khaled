/**
 * Python API Proxy Router
 * 
 * This router proxies requests from the main Express server to the Python ML API.
 * It provides a unified interface for accessing both Node.js and Python API endpoints
 * through the same domain.
 */

import { Router, Request, Response } from 'express';
import axios from 'axios';
import { log } from '../vite';

const router = Router();
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:5001';

/**
 * Generic proxy function to forward requests to the Python API
 */
async function proxyToPythonApi(req: Request, res: Response, endpoint: string) {
  const targetUrl = `${PYTHON_API_URL}${endpoint}`;
  
  try {
    log(`Proxying request to Python API: ${targetUrl}`, 'proxy');
    
    // Forward the request with the same method, data, and headers
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.method !== 'GET' ? req.body : undefined,
      params: req.query,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Forward authentication if present
        ...(req.headers.authorization ? { 'Authorization': req.headers.authorization } : {})
      },
      timeout: 10000, // 10 second timeout
    });
    
    // Return the Python API response to the client
    return res.status(response.status).json(response.data);
  } catch (error: any) {
    log(`Error proxying to Python API (${targetUrl}): ${error.message}`, 'proxy');
    
    // If we got a response from the Python API, forward it
    if (error.response) {
      return res.status(error.response.status).json(error.response.data);
    }
    
    // Otherwise return a generic error
    return res.status(500).json({
      success: false,
      error: 'Failed to connect to ML API service',
      message: error.message
    });
  }
}

/**
 * GET /api/python/status
 * Check the status of the Python ML API
 */
router.get('/status', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, '/api/status');
});

/**
 * GET /api/python/models
 * Get information about all available ML models
 */
router.get('/models', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, '/api/models');
});

/**
 * GET /api/python/models/:id
 * Get information about a specific ML model
 */
router.get('/models/:id', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, `/api/models/${req.params.id}`);
});

/**
 * GET /api/python/predictions/:symbol
 * Get predictions for a specific trading pair
 */
router.get('/predictions/:symbol', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, `/api/predictions/${req.params.symbol}`);
});

/**
 * GET /api/python/optimization/performance
 * Get performance metrics for optimization strategies
 */
router.get('/optimization/performance', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, '/api/optimization/performance');
});

/**
 * POST /api/python/optimization/start
 * Start optimization process for a specific strategy
 */
router.post('/optimization/start', async (req: Request, res: Response) => {
  return proxyToPythonApi(req, res, '/api/optimization/start');
});

/**
 * Catch-all route to proxy any other requests to the Python API
 */
router.all('/*', async (req: Request, res: Response) => {
  const pathWithoutPrefix = req.path;
  return proxyToPythonApi(req, res, `/api${pathWithoutPrefix}`);
});

export default router;