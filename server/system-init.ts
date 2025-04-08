/**
 * System Initialization Module
 * 
 * This module initializes the global core system components that run 24/7
 * without requiring user API keys. It sets up the market data service,
 * ML prediction service, and other global components.
 */

import { log } from './vite';
import { globalMarketData } from './services/global-market-data';
import { mlPredictionService } from './services/ml-prediction-service';

/**
 * Initialize global system components
 * Optimized to prevent server startup timeout
 */
export async function initializeGlobalSystem(): Promise<void> {
  try {
    log('Initializing global system components...');
    
    // Step 1: Initialize global market data service with promise
    log('Initializing Global Market Data Service...');
    const marketDataPromise = globalMarketData.initialize();
    
    // Don't wait for completion - we'll let it continue in the background
    // This allows the server to start up faster
    marketDataPromise.catch((error: any) => {
      log(`Background market data initialization error: ${error.message}`);
    });
    
    // Step 2: Initialize ML prediction service with delay and without waiting
    setTimeout(() => {
      log('Initializing ML Prediction Service...');
      mlPredictionService.initialize().catch((error: any) => {
        log(`Background ML prediction initialization error: ${error.message}`);
      });
    }, 10000);
    
    // Even though services are still initializing in the background,
    // let the system startup process continue
    log('Global system components initialization started - continuing server startup');
    
    // Delay logging system status until a bit later
    setTimeout(() => {
      try {
        const marketDataStatus = globalMarketData.getStatus();
        const mlStatus = mlPredictionService.getStatus();
        
        log(`Global Market Data Status: Using ${marketDataStatus.primaryExchange} as primary exchange`);
        log(`ML Prediction Status: ${mlStatus.totalModels} models loaded`);
      } catch (err: any) {
        log(`Error getting system status: ${err.message}`);
      }
    }, 20000);
  } catch (error: any) {
    log(`Error initializing global system: ${error.message}`);
    // Continue anyway to allow server to start
  }
}

/**
 * Get system status
 */
export function getGlobalSystemStatus(): any {
  return {
    marketData: globalMarketData.getStatus(),
    mlPrediction: mlPredictionService.getStatus(),
    lastStatusCheck: new Date().toISOString()
  };
}

// Export services for direct access
export { globalMarketData, mlPredictionService };