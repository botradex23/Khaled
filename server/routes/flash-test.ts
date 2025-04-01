/**
 * Flash Risk Management Test Endpoints
 * 
 * This file provides special test endpoints to verify the stop-loss and take-profit functionality
 * for edge cases like flash crashes and flash spikes.
 */

import { Router, Request, Response } from 'express';
import { getPaperTradingBridge, TradeDirection } from '../api/paper-trading/PaperTradingBridge';
import paperTradingApi from '../api/paper-trading/PaperTradingApi';
import '../api/risk-management/RiskManager'; // Import for side effects to ensure RiskManager is initialized

const router = Router();

// Test endpoint for flash crash scenario (price suddenly drops below stop-loss)
router.post('/flash-crash', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "FLASHCRASH";
    const initialPrice = 100;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position with stop-loss parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 1.0,
      reason: "Flash crash test",
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: 8,  // 8% stop loss - triggered when price goes to $92 or below
        takeProfitPercent: 15
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // Wait a moment for the position to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now simulate a flash crash - price suddenly drops to 88 (12% drop)
    const crashPrice = 88; // 12% below initial price, triggering the 8% stop-loss
    await paperTradingApi.simulatePriceChange(symbol, crashPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "flash-crash-test",
      initialPrice,
      crashPrice,
      positionId,
      stopLossPercent: 8,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "Position was automatically closed during flash crash" 
        : "Position remained open despite price dropping below stop-loss"
    });
  } catch (error: any) {
    console.error("Error in flash crash test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Test endpoint for flash spike scenario (price suddenly jumps above take-profit)
router.post('/flash-spike', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "FLASHSPIKE";
    const initialPrice = 100;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position with take-profit parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 1.0,
      reason: "Flash spike test",
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: 8,
        takeProfitPercent: 10  // 10% take profit - triggered when price goes to $110 or above
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // Wait a moment for the position to be processed
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Now simulate a flash spike - price suddenly jumps to 115 (15% increase)
    const spikePrice = 115; // 15% above initial price, triggering the 10% take-profit
    await paperTradingApi.simulatePriceChange(symbol, spikePrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "flash-spike-test",
      initialPrice,
      spikePrice,
      positionId,
      takeProfitPercent: 10,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "Position was automatically closed during flash spike" 
        : "Position remained open despite price exceeding take-profit"
    });
  } catch (error: any) {
    console.error("Error in flash spike test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Run both flash tests in sequence
router.post('/test-all', async (req: Request, res: Response) => {
  try {
    // First run flash crash test
    const crashResponse = await fetch('http://localhost:5000/api/flash-test/flash-crash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const crashResult = await crashResponse.json();
    
    // Then run flash spike test
    const spikeResponse = await fetch('http://localhost:5000/api/flash-test/flash-spike', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const spikeResult = await spikeResponse.json();
    
    // Return combined results
    return res.json({
      success: true,
      flashCrashTest: crashResult,
      flashSpikeTest: spikeResult,
      overallResult: 
        crashResult.result === "PASS" && spikeResult.result === "PASS" 
          ? "PASS" 
          : "FAIL"
    });
  } catch (error: any) {
    console.error("Error in combined flash tests:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;