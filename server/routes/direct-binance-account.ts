import express, { Request, Response, Router } from 'express';
import { binanceAccountService } from '../api/binance/accountService';
import { ensureAuthenticated } from '../auth';

const router: Router = express.Router();

/**
 * GET /direct-api/binance/demo-balance
 * Get demo account balance for development or unauthenticated users
 * This endpoint returns raw JSON without going through the React frontend
 */
router.get('/demo-balance', async (req: Request, res: Response) => {
  try {
    const balance = await binanceAccountService.getDemoAccountBalance();
    return res.json(balance);
  } catch (error: any) {
    console.error('Error in direct Binance demo account balance route:', error?.message || 'Unknown error');
    
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: `Failed to retrieve demo account balance: ${error?.message || 'Unknown error'}`
    });
  }
});

/**
 * GET /direct-api/binance/connection-test
 * Test connection to Binance API
 * This endpoint returns raw JSON without going through the React frontend
 */
router.get('/connection-test', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // User ID may be a number or string depending on auth system
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this endpoint'
      });
    }
    
    const connectionTest = await binanceAccountService.testConnection(
      typeof userId === 'string' ? parseInt(userId) : userId
    );
    
    return res.json({
      success: connectionTest.authenticated,
      connected: connectionTest.connected,
      authenticated: connectionTest.authenticated,
      message: connectionTest.message,
      apiUrl: connectionTest.apiUrl,
      isTestnet: connectionTest.isTestnet
    });
  } catch (error: any) {
    console.error('Error in direct Binance connection test route:', error?.message || 'Unknown error');
    
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: `Failed to test Binance API connection: ${error?.message || 'Unknown error'}`
    });
  }
});

export default router;