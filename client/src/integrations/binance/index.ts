/**
 * Binance Integration Module
 * Central entry point for all Binance-related functionality
 */

// Import all components we need
import type { BinanceAccountInfo, BinanceTickerPrice } from './binanceClient';
import { 
  BinanceApiService as BinanceClientService, 
  binanceService as binanceApiService, 
  createBinanceServiceWithCustomCredentials as createApiService
} from './binanceClient';

import { 
  BinanceWebSocketService 
} from './binanceWebSocket';

import {
  binanceMarketService,
  BinanceMarketPriceService
} from './marketPriceService';

import {
  getDefaultBinanceConfig
} from './binanceConfig';

import {
  BinanceAccountService,
  createAccountService
} from './accountService';

import {
  binanceClientApi,
  BinanceClientApi
} from './client-api';

// Re-export with renamed imports to avoid conflicts
export {
  // From binanceConfig
  getDefaultBinanceConfig,
  
  // From binanceClient - with renamed types
  BinanceAccountInfo,
  BinanceClientService as BinanceApiService,
  binanceApiService as binanceService,
  createApiService as createBinanceServiceWithCustomCredentials,
  BinanceTickerPrice,
  
  // From binanceWebSocket
  BinanceWebSocketService,
  
  // From marketPriceService
  binanceMarketService,
  BinanceMarketPriceService,
  
  // From accountService
  BinanceAccountService,
  createAccountService,
  
  // From client-api
  binanceClientApi,
  BinanceClientApi
};

// Re-export other utilities that don't conflict
export * from './binanceUtils';

/**
 * Initialize and connect all Binance services
 * This provides a single function to set up the entire Binance integration
 */
export async function initializeBinanceIntegration(customApiKey?: string, customSecretKey?: string): Promise<{
  apiService: ReturnType<typeof createApiService>;
  marketService: BinanceMarketPriceService;
  webSocketService: BinanceWebSocketService;
  accountService: BinanceAccountService;
}> {
  try {
    console.log('Initializing Binance integration...');
    
    // Create or use API service
    let apiService: ReturnType<typeof createApiService>;
    
    if (customApiKey && customSecretKey) {
      // Use custom credentials if provided
      apiService = createApiService(customApiKey, customSecretKey);
      console.log('Created Binance API service with custom credentials');
    } else {
      // Use default service (environment variables)
      apiService = binanceApiService;
      console.log('Using default Binance API service');
    }
    
    // Test API connectivity
    try {
      await apiService.ping();
      console.log('Successfully connected to Binance API');
    } catch (error) {
      console.warn('Warning: Could not ping Binance API, connectivity issues may occur', error);
    }
    
    // Set up market price service
    binanceMarketService.setBinanceApiService(apiService);
    await binanceMarketService.initialize();
    console.log('Market price service initialized');
    
    // Create WebSocket service
    const webSocketService = new BinanceWebSocketService(binanceMarketService);
    console.log('WebSocket service created');
    
    // Create account service
    const accountService = createAccountService(apiService);
    console.log('Account service created');
    
    // Start WebSocket connection
    try {
      webSocketService.connect();
      console.log('WebSocket connection initiated');
    } catch (error) {
      console.warn('Warning: Failed to start WebSocket connection, will retry automatically', error);
    }
    
    return {
      apiService,
      marketService: binanceMarketService,
      webSocketService,
      accountService
    };
  } catch (error) {
    console.error('Failed to initialize Binance integration:', error);
    throw error;
  }
}