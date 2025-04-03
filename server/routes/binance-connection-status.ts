import { Request, Response, Router } from 'express';
import { binanceWebSocketService } from '../api/binance/websocketService';
import { binanceAccountService } from '../api/binance/accountService';
import { binanceMarketService } from '../api/binance/marketPriceService';

const router = Router();

/**
 * Get Binance connection status
 * Checks and reports the current connection state for Binance API services
 * 
 * @returns {Object} Status response with connection details
 */
router.get('/api/status/binance-connection', async (req: Request, res: Response) => {
  try {
    // Check current statuses across all Binance-related services
    const wsConnected = binanceWebSocketService.isWebSocketConnected();
    const isSimulation = binanceWebSocketService.isSimulationMode();
    const currentProxy = binanceWebSocketService.getCurrentProxy();
    const lastError = binanceWebSocketService.getLastConnectionError();
    const connectionAttempts = binanceWebSocketService.getConnectionAttempts();
    const maxRetries = binanceWebSocketService.getMaxRetries();
    const lastMessageTime = binanceWebSocketService.getLastMessageTime();
    
    // Check if system-level API keys are configured (no specific user)
    const hasApiKeys = await binanceAccountService.hasBinanceApiKeys();
    
    // Get latest market data timestamp
    const lastPriceUpdate = binanceMarketService.getLastUpdateTime();
    
    // Calculate if we have recent data (within last 5 minutes)
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    const hasRecentData = now - lastPriceUpdate < fiveMinutes;
    
    // Determine if proxy is being used
    const useProxy = process.env.USE_PROXY === 'true';
    
    // Build comprehensive status response
    const status = {
      timestamp: new Date().toISOString(),
      connection: {
        websocket: {
          connected: wsConnected,
          simulationMode: isSimulation,
          lastMessageTime
        },
        marketData: {
          recentData: hasRecentData,
          lastUpdateTime: new Date(lastPriceUpdate).toISOString()
        },
        proxy: {
          usingProxy: useProxy,
          current: currentProxy,
          connectionAttempts,
          maxRetries
        }
      },
      credentials: {
        hasApiKeys
      },
      errors: {
        lastConnectionError: lastError
      }
    };
    
    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('Error getting Binance connection status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve Binance connection status',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;