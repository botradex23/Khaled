/**
 * Binance Account Routes
 * 
 * This file contains routes for Binance account-related operations,
 * replacing the deprecated OKX account routes.
 */

import { Router, Request, Response } from 'express';
import { binanceAccountService } from '../api/binance/accountService';
import { ensureAuthenticated } from '../middleware/auth';

const router = Router();

/**
 * GET /api/binance/account/balance
 * Get account balance from Binance API
 */
router.get('/account/balance', ensureAuthenticated, async (req: Request, res: Response) => {
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
    
    const balance = await binanceAccountService.getAccountBalance(userId);
    return res.json(balance);
  } catch (error: any) {
    console.error('Error in Binance account balance route:', error?.message || 'Unknown error');
    
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: `Failed to retrieve account balance: ${error?.message || 'Unknown error'}`
    });
  }
});

/**
 * GET /api/binance/demo/account/balance
 * Get demo account balance for development or unauthenticated users
 */
router.get('/demo/account/balance', async (req: Request, res: Response) => {
  try {
    const balance = await binanceAccountService.getDemoAccountBalance();
    return res.json(balance); // Return the full response object
  } catch (error: any) {
    console.error('Error in Binance demo account balance route:', error?.message || 'Unknown error');
    
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: `Failed to retrieve demo account balance: ${error?.message || 'Unknown error'}`
    });
  }
});

/**
 * GET /api/binance/connection/test
 * Test connection to Binance API
 */
router.get('/connection/test', ensureAuthenticated, async (req: Request, res: Response) => {
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
    
    const connectionTest = await binanceAccountService.testConnection(userId);
    
    return res.json({
      success: connectionTest.authenticated,
      connected: connectionTest.connected,
      authenticated: connectionTest.authenticated,
      message: connectionTest.message,
      apiUrl: connectionTest.apiUrl,
      isTestnet: connectionTest.isTestnet
    });
  } catch (error: any) {
    console.error('Error in Binance connection test route:', error?.message || 'Unknown error');
    
    return res.status(500).json({
      success: false,
      error: 'internal_server_error',
      message: `Failed to test Binance API connection: ${error?.message || 'Unknown error'}`
    });
  }
});

export default router;