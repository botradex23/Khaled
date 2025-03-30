/**
 * start-system.js
 * 
 * סקריפט עזר להפעלת מערכת המסחר ה-AI באופן עצמאי
 */

// ייבוא מערכת המסחר
const { aiTradingSystem } = require('./AITradingSystem');

// הפעלת המערכת במצב אקטיבי
console.log('Starting AI Trading System in ACTIVE mode...');
aiTradingSystem.start(true)
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