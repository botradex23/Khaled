import express, { Request, Response, Router } from 'express';
import axios from 'axios';
import { logger } from '../logger';

// Initialize Express router
const router: Router = express.Router();

// Python service URL (Flask running on port 5001)
const PYTHON_SERVICE_URL = 'http://localhost:5001';

/**
 * Helper function to verify Python service availability
 */
async function isPythonServiceAvailable(): Promise<boolean> {
  try {
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/status`, { timeout: 2000 });
    return response.status === 200;
  } catch (error) {
    return false;
  }
}

/**
 * GET /direct-api/markets/top-pairs
 * Get top cryptocurrency pairs with price data directly from Binance SDK
 */
router.get('/top-pairs', async (req: Request, res: Response) => {
  try {
    // Check if Python service is available
    const serviceAvailable = await isPythonServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Python Direct Binance service is not available',
        error: 'service_unavailable'
      });
    }
    
    // Call the Python Direct Binance service
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/direct-binance/top-pairs`, {
      timeout: 5000
    });
    
    return res.json({
      ...response.data,
      source: 'direct_binance_sdk'
    });
  } catch (error: any) {
    logger.error(`Error getting top pairs from Direct Binance SDK: ${error.message || error}`);
    
    // Check for geo-restriction error (HTTP 451)
    if (error.response && error.response.status === 451) {
      return res.status(451).json({
        success: false,
        geo_restricted: true,
        message: 'Binance API access is restricted in this region',
        error: error.response?.data?.error || 'geo_restriction'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to retrieve top cryptocurrency pairs from Binance SDK',
      error: error.response?.data?.message || error.message || 'Unknown error'
    });
  }
});

/**
 * GET /direct-api/markets/prices
 * Get all cryptocurrency prices directly from Binance SDK
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    // Check if Python service is available
    const serviceAvailable = await isPythonServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Python Direct Binance service is not available',
        error: 'service_unavailable'
      });
    }
    
    // Call the Python Direct Binance service
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/direct-binance/prices`, {
      timeout: 5000
    });
    
    return res.json({
      ...response.data,
      source: 'direct_binance_sdk'
    });
  } catch (error: any) {
    logger.error(`Error getting all prices from Direct Binance SDK: ${error.message || error}`);
    
    // Check for geo-restriction error (HTTP 451)
    if (error.response && error.response.status === 451) {
      return res.status(451).json({
        success: false,
        geo_restricted: true,
        message: 'Binance API access is restricted in this region',
        error: error.response?.data?.error || 'geo_restriction'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to retrieve cryptocurrency prices from Binance SDK',
      error: error.response?.data?.message || error.message || 'Unknown error'
    });
  }
});

/**
 * GET /direct-api/markets/price/:symbol
 * Get price for a specific cryptocurrency directly from Binance SDK
 */
router.get('/price/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    // Check if Python service is available
    const serviceAvailable = await isPythonServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Python Direct Binance service is not available',
        error: 'service_unavailable'
      });
    }
    
    // Call the Python Direct Binance service
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/direct-binance/price/${symbol}`, {
      timeout: 5000
    });
    
    return res.json({
      ...response.data,
      source: 'direct_binance_sdk'
    });
  } catch (error: any) {
    logger.error(`Error getting price for ${req.params.symbol} from Direct Binance SDK: ${error.message || error}`);
    
    // Check for geo-restriction error (HTTP 451)
    if (error.response && error.response.status === 451) {
      return res.status(451).json({
        success: false,
        geo_restricted: true,
        message: 'Binance API access is restricted in this region',
        symbol: req.params.symbol,
        error: error.response?.data?.error || 'geo_restriction'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: `Failed to retrieve price for ${req.params.symbol} from Binance SDK`,
      error: error.response?.data?.message || error.message || 'Unknown error'
    });
  }
});

/**
 * GET /direct-api/markets/ping
 * Ping the direct Binance SDK service
 */
router.get('/ping', async (req: Request, res: Response) => {
  try {
    // Check if Python service is available
    const serviceAvailable = await isPythonServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Python Direct Binance service is not available',
        error: 'service_unavailable'
      });
    }
    
    // Call the Python Direct Binance service
    const response = await axios.get(`${PYTHON_SERVICE_URL}/api/direct-binance/ping`, {
      timeout: 3000
    });
    
    return res.json({
      ...response.data,
      source: 'direct_binance_sdk'
    });
  } catch (error: any) {
    logger.error(`Error pinging Direct Binance SDK: ${error.message || error}`);
    
    // Check for geo-restriction error (HTTP 451)
    if (error.response && error.response.status === 451) {
      return res.status(451).json({
        success: false,
        geo_restricted: true,
        message: 'Binance API access is restricted in this region',
        error: error.response?.data?.error || 'geo_restriction'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to ping Binance SDK service',
      error: error.response?.data?.message || error.message || 'Unknown error'
    });
  }
});

/**
 * GET /direct-api/markets/ticker-24hr
 * Get 24hr ticker data for all or a specific cryptocurrency directly from Binance SDK
 */
router.get('/ticker-24hr', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.query;
    
    // Check if Python service is available
    const serviceAvailable = await isPythonServiceAvailable();
    if (!serviceAvailable) {
      return res.status(503).json({
        success: false,
        message: 'Python Direct Binance service is not available',
        error: 'service_unavailable'
      });
    }
    
    // Call the Python Direct Binance service
    const url = symbol 
      ? `${PYTHON_SERVICE_URL}/api/direct-binance/ticker/24hr?symbol=${symbol}` 
      : `${PYTHON_SERVICE_URL}/api/direct-binance/ticker/24hr`;
    
    const response = await axios.get(url, {
      timeout: 5000
    });
    
    return res.json({
      ...response.data,
      source: 'direct_binance_sdk'
    });
  } catch (error: any) {
    logger.error(`Error getting 24hr ticker data from Direct Binance SDK: ${error.message || error}`);
    
    // Check for geo-restriction error (HTTP 451)
    if (error.response && error.response.status === 451) {
      return res.status(451).json({
        success: false,
        geo_restricted: true,
        message: 'Binance API access is restricted in this region',
        symbol: req.query.symbol || 'all',
        error: error.response?.data?.error || 'geo_restriction'
      });
    }
    
    return res.status(error.response?.status || 500).json({
      success: false,
      message: 'Failed to retrieve 24hr ticker data from Binance SDK',
      error: error.response?.data?.message || error.message || 'Unknown error'
    });
  }
});

export default router;