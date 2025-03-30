/**
 * start-system.js
 * 
 * סקריפט עזר להפעלת מערכת המסחר ה-AI באופן עצמאי
 */

// ייבוא מערכת המסחר
import { aiTradingSystem } from './AITradingSystem.js';
import { createAIPaperTradingBridge } from './AIPaperTradingBridge.js';

// איתחול גשר ל-Paper Trading
console.log('Initializing Paper Trading Bridge...');
const aiPaperTradingBridge = createAIPaperTradingBridge(aiTradingSystem);

// הגדרת משתמש לגשר
console.log('Setting up Paper Trading Bridge for user...');
aiPaperTradingBridge.setUser(1)
  .then(success => {
    if (success) {
      console.log('Paper Trading Bridge initialized for user 1');
      
      // הגדרת הגשר למערכת ה-AI
      aiTradingSystem.setPaperTradingBridge(aiPaperTradingBridge);
      console.log('Paper Trading Bridge connected to AI Trading System');
      
      // הפעלת המערכת במצב אקטיבי
      console.log('Starting AI Trading System in ACTIVE mode...');
      return aiTradingSystem.start(true);
    } else {
      throw new Error('Failed to initialize Paper Trading Bridge for user');
    }
  })
  .then(() => {
    console.log('AI Trading System started successfully in ACTIVE mode');
    console.log('System will continue running in the background');
    
    // הדפסת מדדים בסיסיים כל דקה
    setInterval(() => {
      const status = aiTradingSystem.getStatus();
      console.log('--------------------------------------------------');
      console.log(`AI Trading System Status Report - ${new Date().toISOString()}`);
      console.log(`Running: ${status.isRunning}, Ready to trade: ${status.readyToTrade}`);
      console.log(`Total decisions: ${status.decisionCount}, Total executions: ${status.executionCount}`);
      console.log(`Paper Trading enabled: ${status.paperTradingEnabled}`);
      console.log('--------------------------------------------------');
    }, 60000);
  })
  .catch(error => {
    console.error('Failed to start AI Trading System:', error);
  });