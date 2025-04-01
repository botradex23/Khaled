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
import { z } from 'zod';

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

// Test endpoint for SHORT position stop-loss
router.post('/test-short-stop-loss', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a SHORT position with stop-loss parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.SHORT,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test SHORT stop-loss functionality",
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test SHORT position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // For SHORT positions, price INCREASE triggers stop-loss
    const stopLossPrice = initialPrice * 1.06; // 6% increase (above 5% SL for SHORT)
    await paperTradingApi.simulatePriceChange(symbol, stopLossPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "short-stop-loss-test",
      initialPrice,
      newPrice: stopLossPrice,
      positionId,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "SHORT position was automatically closed when price rose above stop-loss threshold" 
        : "Stop-loss didn't trigger for SHORT position - position still open"
    });
  } catch (error: any) {
    console.error("Error in SHORT stop-loss test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Test endpoint for SHORT position take-profit
router.post('/test-short-take-profit', async (req: Request, res: Response) => {
  try {
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = "BTCUSDT";
    const initialPrice = 70000;
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a SHORT position with take-profit parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: TradeDirection.SHORT,
      entryPrice: initialPrice,
      quantity: 0.1,
      reason: "Test SHORT take-profit functionality",
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: 5,
        takeProfitPercent: 10
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test SHORT position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    
    // For SHORT positions, price DECREASE triggers take-profit
    const takeProfitPrice = initialPrice * 0.89; // 11% decrease (beyond 10% TP for SHORT)
    await paperTradingApi.simulatePriceChange(symbol, takeProfitPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    return res.json({
      success: true,
      testName: "short-take-profit-test",
      initialPrice,
      newPrice: takeProfitPrice,
      positionId,
      positionClosed,
      result: positionClosed ? "PASS" : "FAIL",
      message: positionClosed 
        ? "SHORT position was automatically closed when price dropped below take-profit threshold" 
        : "Take-profit didn't trigger for SHORT position - position still open"
    });
  } catch (error: any) {
    console.error("Error in SHORT take-profit test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Run all tests in sequence
router.post('/test-all', async (req: Request, res: Response) => {
  try {
    // When running multiple tests, we need to stagger the start time to avoid
    // resource contention and race conditions
    const runTest = async (url: string) => {
      const response = await fetch(`http://localhost:5000/api/risk-test/${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      return await response.json();
    };
    
    // Run tests with delay between each to avoid interference
    console.log("Starting LONG position take-profit test...");
    const tpLongResult = await runTest('test-take-profit');
    console.log(`LONG TP result: ${tpLongResult.result}`);
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Starting LONG position stop-loss test...");
    const slLongResult = await runTest('test-stop-loss');
    console.log(`LONG SL result: ${slLongResult.result}`);
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Starting SHORT position take-profit test...");
    const tpShortResult = await runTest('test-short-take-profit');
    console.log(`SHORT TP result: ${tpShortResult.result}`);
    
    // Delay between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log("Starting SHORT position stop-loss test...");
    const slShortResult = await runTest('test-short-stop-loss');
    console.log(`SHORT SL result: ${slShortResult.result}`);
    
    // Analyze results
    const allTests = [tpLongResult, slLongResult, tpShortResult, slShortResult];
    const allPassed = allTests.every(test => test.result === "PASS");
    const passCount = allTests.filter(test => test.result === "PASS").length;
    
    // Return combined results
    return res.json({
      success: true,
      longPositionTests: {
        takeProfit: tpLongResult,
        stopLoss: slLongResult
      },
      shortPositionTests: {
        takeProfit: tpShortResult,
        stopLoss: slShortResult
      },
      summary: {
        totalTests: allTests.length,
        passingTests: passCount,
        overallResult: allPassed ? "PASS" : "FAIL (some tests failed)",
        completionRatio: `${passCount}/${allTests.length}`,
        completionPercentage: `${(passCount / allTests.length * 100).toFixed(0)}%`
      }
    });
  } catch (error: any) {
    console.error("Error in combined risk tests:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Custom test endpoint with user-specified SL/TP percentages
const customTestSchema = z.object({
  direction: z.enum(['LONG', 'SHORT']),
  symbol: z.string().default('BTCUSDT'),
  stopLossPercent: z.number().min(0.1).max(50),
  takeProfitPercent: z.number().min(0.1).max(100),
  quantity: z.number().positive().default(0.1),
  initialPrice: z.number().positive().optional(),
  testBoth: z.boolean().default(false),
  priceMovePercent: z.number().min(-20).max(20).default(6) // Allow negative values for price decrease
});

router.post('/custom-test', async (req: Request, res: Response) => {
  try {
    // Validate the input parameters
    const validationResult = customTestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid parameters',
        validationErrors: validationResult.error.format()
      });
    }
    
    const params = validationResult.data;
    const userId = 1; // Default test user
    const bridge = getPaperTradingBridge(userId);
    await bridge.initialize();
    
    // Create a test position
    const symbol = params.symbol;
    const initialPrice = params.initialPrice || 70000; // Default to a reasonable BTC price if not specified
    
    // Set initial price
    await paperTradingApi.simulatePriceChange(symbol, initialPrice);
    
    // Create a position with the specified SL/TP parameters
    const tradeResult = await bridge.executeTrade({
      symbol,
      direction: params.direction as TradeDirection,
      entryPrice: initialPrice,
      quantity: params.quantity,
      reason: `Custom risk test (${params.direction}) - SL: ${params.stopLossPercent}%, TP: ${params.takeProfitPercent}%`,
      confidence: 0.95,
      signalSource: "manual",
      metadata: {
        stopLossPercent: params.stopLossPercent,
        takeProfitPercent: params.takeProfitPercent
      }
    });
    
    if (!tradeResult.success) {
      return res.status(400).json({
        success: false,
        error: `Failed to create test position: ${tradeResult.error}`
      });
    }
    
    const positionId = tradeResult.positionId;
    let newPrice = initialPrice;
    let targetThreshold = '';
    
    // Determine which threshold to test (SL, TP, or both)
    if (params.testBoth) {
      // First test the stop-loss
      if (params.direction === 'LONG') {
        // For LONG positions, price decrease triggers stop-loss
        newPrice = initialPrice * (1 - (params.stopLossPercent + 1) / 100);
        targetThreshold = 'stop-loss';
      } else {
        // For SHORT positions, price increase triggers stop-loss
        newPrice = initialPrice * (1 + (params.stopLossPercent + 1) / 100);
        targetThreshold = 'stop-loss';
      }
    } else {
      // Test based on price move percentage
      if (params.direction === 'LONG') {
        // For LONG: negative move -> SL, positive move -> TP
        if (params.priceMovePercent < 0) {
          // Test stop-loss
          newPrice = initialPrice * (1 + params.priceMovePercent / 100);
          targetThreshold = 'stop-loss';
        } else {
          // Test take-profit
          newPrice = initialPrice * (1 + params.priceMovePercent / 100);
          targetThreshold = 'take-profit';
        }
      } else {
        // For SHORT: positive move -> SL, negative move -> TP
        if (params.priceMovePercent < 0) {
          // Test take-profit (for SHORT, price decrease is profit)
          newPrice = initialPrice * (1 + params.priceMovePercent / 100);
          targetThreshold = 'take-profit';
        } else {
          // Test stop-loss (for SHORT, price increase is loss)
          newPrice = initialPrice * (1 + params.priceMovePercent / 100);
          targetThreshold = 'stop-loss';
        }
      }
    }
    
    // Apply the price change
    await paperTradingApi.simulatePriceChange(symbol, newPrice);
    
    // Give risk manager time to process
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check if position was automatically closed
    const openPositions = await bridge.getOpenPositions();
    const positionClosed = !openPositions.some(p => p.id === positionId);
    
    // Calculate the price percent change
    const pricePercentChange = ((newPrice - initialPrice) / initialPrice * 100).toFixed(2);
    
    // Determine if the test should have passed
    let shouldTrigger = false;
    let triggerExplanation = '';
    
    if (params.direction === 'LONG') {
      if (newPrice < initialPrice) {
        // Price decreased - check if SL should trigger
        const priceDropPercent = Math.abs(parseFloat(pricePercentChange));
        shouldTrigger = priceDropPercent >= params.stopLossPercent;
        triggerExplanation = `Price dropped ${priceDropPercent.toFixed(2)}%, ${shouldTrigger ? 'exceeding' : 'not reaching'} ${params.stopLossPercent}% stop-loss threshold`;
      } else {
        // Price increased - check if TP should trigger
        const priceGainPercent = parseFloat(pricePercentChange);
        shouldTrigger = priceGainPercent >= params.takeProfitPercent;
        triggerExplanation = `Price increased ${priceGainPercent.toFixed(2)}%, ${shouldTrigger ? 'exceeding' : 'not reaching'} ${params.takeProfitPercent}% take-profit threshold`;
      }
    } else { // SHORT
      if (newPrice > initialPrice) {
        // Price increased - check if SL should trigger for SHORT
        const priceGainPercent = parseFloat(pricePercentChange);
        shouldTrigger = priceGainPercent >= params.stopLossPercent;
        triggerExplanation = `Price increased ${priceGainPercent.toFixed(2)}%, ${shouldTrigger ? 'exceeding' : 'not reaching'} ${params.stopLossPercent}% stop-loss threshold for SHORT`;
      } else {
        // Price decreased - check if TP should trigger for SHORT
        const priceDropPercent = Math.abs(parseFloat(pricePercentChange));
        shouldTrigger = priceDropPercent >= params.takeProfitPercent;
        triggerExplanation = `Price dropped ${priceDropPercent.toFixed(2)}%, ${shouldTrigger ? 'exceeding' : 'not reaching'} ${params.takeProfitPercent}% take-profit threshold for SHORT`;
      }
    }
    
    // Evaluate test outcome
    const testResult = (positionClosed === shouldTrigger) ? "PASS" : "FAIL";
    let resultExplanation = '';
    
    if (testResult === "PASS") {
      if (positionClosed) {
        resultExplanation = `Position was correctly closed when ${triggerExplanation}`;
      } else {
        resultExplanation = `Position correctly remained open when ${triggerExplanation}`;
      }
    } else {
      if (positionClosed) {
        resultExplanation = `Position was unexpectedly closed when ${triggerExplanation}`;
      } else {
        resultExplanation = `Position unexpectedly remained open when ${triggerExplanation}`;
      }
    }
    
    return res.json({
      success: true,
      testName: `custom-${params.direction.toLowerCase()}-${targetThreshold}-test`,
      initialPrice,
      newPrice,
      priceChange: `${pricePercentChange}%`,
      positionId,
      positionClosed,
      shouldTrigger,
      triggerExplanation,
      result: testResult,
      resultExplanation,
      settings: params
    });
  } catch (error: any) {
    console.error("Error in custom risk test:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

export default router;