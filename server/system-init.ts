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
 */
export async function initializeGlobalSystem(): Promise<void> {
  try {
    log('Initializing global system components...');
    
    // Step 1: Initialize global market data service
    log('Initializing Global Market Data Service...');
    await globalMarketData.initialize();
    log('Global Market Data Service initialized successfully');
    
    // Step 2: Initialize ML prediction service
    log('Initializing ML Prediction Service...');
    await mlPredictionService.initialize();
    log('ML Prediction Service initialized successfully');
    
    // Log system status
    const marketDataStatus = globalMarketData.getStatus();
    const mlStatus = mlPredictionService.getStatus();
    
    log(`Global Market Data Status: Using ${marketDataStatus.primaryExchange} as primary exchange`);
    log(`ML Prediction Status: ${mlStatus.totalModels} models loaded`);
    
    log('Global system components initialized successfully');
  } catch (error) {
    log(`Error initializing global system: ${error.message}`);
    
    // Still continue even if there are errors
    // This allows the system to at least partially function
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