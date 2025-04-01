/**
 * Manual test for risk management with console logging
 * 
 * This script bypasses the test client and directly tests the RiskManager functionality
 * by creating positions and simulating price changes with internal access to RiskManager
 */

// Import modules directly from server code
const { PaperTradingBridge, TradeDirection } = require('./server/api/paper-trading/PaperTradingBridge');
const paperTradingApi = require('./server/api/paper-trading/PaperTradingApi').default;
const riskManager = require('./server/api/risk-management/RiskManager').default;

async function main() {
  try {
    console.log("Starting manual risk management test");
    
    // Get the paper trading bridge
    const bridge = new PaperTradingBridge(1); // User ID 1
    await bridge.initialize();
    
    // Create a test position with SL/TP parameters
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // First, set the initial price
    console.log(`Setting initial price for ${symbol}: $${initialPrice}`);
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position
    console.log("Creating test LONG position...");
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test stop-loss and take-profit functionality",
      confidence: 0.95,
      signalSource: "manual",
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
    
    // Let's check if our position is monitored by the risk manager
    const positions = await bridge.getOpenPositions();
    console.log(`Open positions count: ${positions.length}`);
    if (positions.length > 0) {
      console.log("First position details:", positions[0]);
    }
    
    // Test take-profit scenario
    // Simulate price increase above the take-profit threshold
    const takeProfitPrice = initialPrice * 1.11; // 11% increase (above 10% TP)
    console.log(`\n[TAKE PROFIT TEST] Simulating price increase to $${takeProfitPrice}`);
    await paperTradingApi.simulatePriceChange(symbol, takeProfitPrice);
    
    // Wait for risk manager to check positions
    console.log("Waiting for risk manager to check positions...");
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Check if position was automatically closed
    const positionsAfterTP = await bridge.getOpenPositions();
    console.log(`Open positions after TP price change: ${positionsAfterTP.length}`);
    if (positionsAfterTP.length === 0) {
      console.log("✅ SUCCESS: Position automatically closed after take-profit triggered");
    } else {
      console.log("❌ FAIL: Take-profit didn't trigger - position still open");
    }
    
    // Get trade history to check if the position was closed with the correct reason
    const trades = await bridge.getTradeHistory();
    console.log("\nTrade history:");
    for (const trade of trades) {
      console.log(`- Trade ID: ${trade.id}, Symbol: ${trade.symbol}, Status: ${trade.status}, PnL: ${trade.profitLoss || "N/A"}`);
    }
    
    // Test stop-loss scenario
    // Create a new position for stop-loss test
    console.log("\n[STOP LOSS TEST] Creating new position...");
    const stopLossTradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test stop-loss functionality",
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!stopLossTradeResult.success) {
      console.error("Failed to create test position:", stopLossTradeResult.error);
      return;
    }
    
    console.log(`Created stop-loss test position. Position ID: ${stopLossTradeResult.positionId}`);
    
    // Reset price to initial
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Simulate price decrease below the stop-loss threshold
    const stopLossPrice = initialPrice * 0.94; // 6% decrease (below 5% SL)
    console.log(`Simulating price decrease to $${stopLossPrice}`);
    await paperTradingApi.simulatePriceChange(symbol, stopLossPrice);
    
    // Wait for risk manager to check positions
    console.log("Waiting for risk manager to check positions...");
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Check if position was automatically closed
    const positionsAfterSL = await bridge.getOpenPositions();
    console.log(`Open positions after SL price change: ${positionsAfterSL.length}`);
    if (positionsAfterSL.length === 0) {
      console.log("✅ SUCCESS: Position automatically closed after stop-loss triggered");
    } else {
      console.log("❌ FAIL: Stop-loss didn't trigger - position still open");
    }
    
    // Get trade history to check if the position was closed with the correct reason
    const tradesAfterSL = await bridge.getTradeHistory();
    console.log("\nTrade history after stop-loss test:");
    for (const trade of tradesAfterSL) {
      console.log(`- Trade ID: ${trade.id}, Symbol: ${trade.symbol}, Status: ${trade.status}, PnL: ${trade.profitLoss || "N/A"}`);
    }
    
    console.log("\nManual test completed!");
  } catch (error) {
    console.error("Error in manual test:", error);
  }
}

// Run the test
main().catch(console.error);