/**
 * Risk Management Test Endpoints
 * 
 * This file provides special test endpoints to verify that the stop-loss and take-profit functionality
 * is working correctly. These endpoints are meant for internal testing and should be disabled in production.
 */

import { Router, Request, Response } from 'express';
import { getPaperTradingBridge, TradeDirection } from '../api/paper-trading/PaperTradingBridge';
import paperTradingApi from '../api/paper-trading/PaperTradingApi';
import '../api/risk-management/RiskManager'; // Import for side effects to ensure RiskManager is initialized

const router = Router();

// Test endpoint to create a position with SL/TP and test the risk management functionality
router.post('/test-take-profit', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position with take-profit parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test take-profit functionality",
      confidence: 0.95,
      signalSource: "manual", // Must be one of the allowed signal sources
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // Now simulate price increase above take-profit threshold
    const takeProfitPrice = initialPrice * 1.11; // 11% increase (above 10% TP)
    await paperTradingApi.simulatePriceChange(symbol, takeProfitPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "take-profit-test",
      initialPrice,
      newPrice: takeProfitPrice,
      positionId,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "Position was automatically closed when price exceeded take-profit threshold" 
        : "Take-profit didn't trigger - position still open"
    });
  } catch (error: any) {
    console.error("Error in take-profit test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Test endpoint to test stop-loss functionality
router.post('/test-stop-loss', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a LONG position with stop-loss parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.LONG,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test stop-loss functionality",
      confidence: 0.95,
      signalSource: "manual", // Must be one of the allowed signal sources
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // Now simulate price decrease below stop-loss threshold
    const stopLossPrice = initialPrice * 0.94; // 6% decrease (below 5% SL)
    await paperTradingApi.simulatePriceChange(symbol, stopLossPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "stop-loss-test",
      initialPrice,
      newPrice: stopLossPrice,
      positionId,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "Position was automatically closed when price dropped below stop-loss threshold" 
        : "Stop-loss didn't trigger - position still open"
    });
  } catch (error: any) {
    console.error("Error in stop-loss test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Run both tests in sequence
router.post('/test-all', async (req: Request, res: Response) => {
  try {
    // First run take-profit test
    const tpResponse = await fetch('http://localhost:5000/api/risk-test/test-take-profit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const tpResult = await tpResponse.json();
    
    // Then run stop-loss test
    const slResponse = await fetch('http://localhost:5000/api/risk-test/test-stop-loss', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const slResult = await slResponse.json();
    
    // Return combined results
    return res.json({
      success: true,
      takeProfitTest: tpResult,
      stopLossTest: slResult,
      overallResult: tpResult.result === "PASS" && slResult.result === "PASS" ? "PASS" : "FAIL"
    });
  } catch (error: any) {
    console.error("Error in combined risk tests:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;