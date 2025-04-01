/**
 * Test script for stop-loss and take-profit functionality
 * This script creates a DCA bot with SL/TP settings and simulates price changes
 */

import { getPaperTradingBridge } from './server/api/paper-trading/PaperTradingBridge.js';
// Import the risk manager that will monitor positions and trigger SL/TP
import riskManager from './server/api/risk-management/RiskManager.js';

async function runTest() {
  try {
    console.log("Starting stop-loss and take-profit functionality test");
    
    // Get the paper trading bridge
    const bridge = getPaperTradingBridge(1); // User ID 1
    await bridge.initialize();
    
    // Get the paper trading API for price simulation
    const paperTradingApi = bridge.getPaperTradingApi();
    
    // Start the risk management system that will monitor positions
    console.log("Starting risk management system");
    await riskManager.startMonitoring(1000); // Check every 1 second
    
    // Initialize account with test balance
    console.log("Initializing paper trading account with test balance");
    await bridge.initializeAccount(10000);
    
    // Set initial price for BTC
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    console.log(`Set initial price for ${symbol}: $${initialPrice}`);
    
    // Execute a LONG trade to create a position
    console.log("Creating test position...");
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: "LONG",
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test stop-loss and take-profit functionality",
      confidence: 0.95,
      signalSource: "dca",
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!tradeResult.success) {
      console.error("Failed to create test position:", tradeResult.error);
      return;
    }
    
    console.log(`Created test position. Position ID: ${tradeResult.positionId}`);
    
    // Test scenarios
    await testScenarios(paperTradingApi, bridge, symbol, initialPrice, tradeResult.positionId);
    
  } catch (error) {
    console.error("Error in test:", error);
  }
}

async function testScenarios(paperTradingApi, bridge, symbol, initialPrice, positionId) {
  // Get the position
  let positions = await bridge.getOpenPositions();
  const position = positions.find(p => p.id === positionId);
  
  if (!position) {
    console.error("Position not found");
    return;
  }
  
  console.log("Testing price changes...");
  
  // 1. Small price increase (no TP trigger)
  const price1 = initialPrice * 1.05; // 5% increase
  console.log(`\nScenario 1: Price increases 5% to $${price1}`);
  await paperTradingApi.simulatePriceChange(symbol, price1);
  
  // Wait a bit for changes to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if position is still open
  positions = await bridge.getOpenPositions();
  if (positions.find(p => p.id === positionId)) {
    console.log("✅ Position still open after 5% price increase (below take-profit threshold)");
  } else {
    console.error("❌ Position unexpectedly closed after small price increase");
  }
  
  // 2. Price increase above take-profit (should trigger TP)
  const price2 = initialPrice * 1.11; // 11% increase, above 10% TP
  console.log(`\nScenario 2: Price increases to $${price2} (11% gain, above take-profit threshold)`);
  await paperTradingApi.simulatePriceChange(symbol, price2);
  
  // Wait a bit for changes to process
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if position was automatically closed
  positions = await bridge.getOpenPositions();
  if (!positions.find(p => p.id === positionId)) {
    console.log("✅ Position automatically closed after price moved above take-profit level");
  } else {
    console.error("❌ Take-profit didn't trigger - position still open");
  }
  
  // Create another position for stop-loss test
  console.log("\nCreating new test position for stop-loss test...");
  const tradeResult = await bridge.executeTrade({
    symbol,
    direction: "LONG",
    entryPrice: initialPrice,
    quantity: 0.1,
    reason: "Test stop-loss functionality",
    confidence: 0.95,
    signalSource: "dca",
    metadata: {
      stopLossPercent: 5,
      takeProfitPercent: 10
    }
  });
  
  if (!tradeResult.success) {
    console.error("Failed to create test position:", tradeResult.error);
    return;
  }
  
  const slPositionId = tradeResult.positionId;
  console.log(`Created test position. Position ID: ${slPositionId}`);
  
  // Reset price to initial
  await paperTradingApi.simulatePriceChange(symbol, initialPrice);
  
  // 3. Small price decrease (no SL trigger)
  const price3 = initialPrice * 0.97; // 3% decrease
  console.log(`\nScenario 3: Price decreases 3% to $${price3}`);
  await paperTradingApi.simulatePriceChange(symbol, price3);
  
  // Wait a bit for changes to process
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Check if position is still open
  positions = await bridge.getOpenPositions();
  if (positions.find(p => p.id === slPositionId)) {
    console.log("✅ Position still open after 3% price decrease (above stop-loss threshold)");
  } else {
    console.error("❌ Position unexpectedly closed after small price decrease");
  }
  
  // 4. Price decrease below stop-loss (should trigger SL)
  const price4 = initialPrice * 0.94; // 6% decrease, below 5% SL
  console.log(`\nScenario 4: Price decreases to $${price4} (6% loss, below stop-loss threshold)`);
  await paperTradingApi.simulatePriceChange(symbol, price4);
  
  // Wait a bit for changes to process
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Check if position was automatically closed
  positions = await bridge.getOpenPositions();
  if (!positions.find(p => p.id === slPositionId)) {
    console.log("✅ Position automatically closed after price moved below stop-loss level");
  } else {
    console.error("❌ Stop-loss didn't trigger - position still open");
  }
  
  console.log("\nTest completed!");
  
  // Stop the risk management system
  riskManager.stopMonitoring();
}

// Run the test
runTest().catch(console.error);