/**
 * Export the aiPaperTradingBridge from index.ts to avoid circular dependencies
 */

import { createAIPaperTradingBridge } from './AIPaperTradingBridge';
import { aiTradingSystem } from './AITradingSystem';

// Create the bridge as a singleton
export const aiPaperTradingBridge = createAIPaperTradingBridge(aiTradingSystem);

// Initialize default user
aiPaperTradingBridge
  .setUser(1)
  .then(success => {
    if (success) {
      console.log('Paper Trading Bridge initialized for default user (ID: 1) in bridge module');
      
      // Initialize the bridge in AI Trading System
      aiTradingSystem.setPaperTradingBridge(aiPaperTradingBridge);
      console.log('Paper Trading Bridge connected to AI Trading System in bridge module');
    } else {
      console.error('Failed to initialize Paper Trading Bridge for default user in bridge module');
    }
  })
  .catch(error => {
    console.error('Error initializing Paper Trading Bridge in bridge module:', error);
  });