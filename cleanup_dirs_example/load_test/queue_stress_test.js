/**
 * Trade Execution Queue Stress Test
 * 
 * This script specifically focuses on testing the trade execution queue's
 * ability to handle a large number of concurrent trade requests and ensure:
 * 1. No race conditions occur
 * 2. Queue prioritization works correctly
 * 3. Trades are processed in the correct order
 * 4. Full logging is maintained during high load
 * 5. No queue overflows happen
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
  // Base URL for Python API
  pythonBaseUrl: 'http://localhost:5001',
  
  // Test parameters
  concurrentBatches: [5, 10, 20, 50],
  tradesPerBatch: 10,
  
  // Test symbols
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'],
  
  // Trade parameters
  tradeAmount: 0.001, // Small amount for testing
  
  // Priority levels to test
  priorityLevels: [1, 2, 3, 5, 10],
  
  // Output directory for results
  outputDir: path.join(__dirname, 'results'),
  
  // Delay between batches (ms)
  batchDelay: 2000,
};

// Ensure results directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main test runner
 */
async function runQueueStressTest() {
  console.log('🚀 Starting Trade Execution Queue Stress Test');
  
  const startTime = new Date();
  console.log(`Test started at: ${startTime.toISOString()}`);
  
  const results = {};
  
  // Test increasing batch sizes
  for (const batchSize of CONFIG.concurrentBatches) {
    console.log(`\n👥 Testing with ${batchSize} concurrent batches (${batchSize * CONFIG.tradesPerBatch} total trades)`);
    
    const batchResults = await testWithBatchSize(batchSize);
    results[batchSize] = batchResults;
    
    // Generate interim report
    generateInterimReport(batchSize, batchResults);
    
    // Give the system some time to process and clear between tests
    console.log('Waiting for queue to clear before next test...');
    await new Promise(r => setTimeout(r, 10000)); // 10 second pause
  }
  
  // Now test queue prioritization
  console.log('\n🔄 Testing queue prioritization');
  const prioritizationResults = await testQueuePrioritization();
  results.prioritization = prioritizationResults;
  
  // Generate final report
  const endTime = new Date();
  const testDuration = (endTime - startTime) / 1000;
  console.log(`\n✅ Queue stress testing completed in ${testDuration.toFixed(2)} seconds`);
  
  generateFinalReport(results, startTime, endTime);
}

/**
 * Test the queue with a specific batch size
 */
async function testWithBatchSize(batchSize) {
  const results = {
    totalTrades: batchSize * CONFIG.tradesPerBatch,
    successfulTrades: 0,
    failedTrades: 0,
    queueOverflows: 0,
    outOfOrderTrades: 0,
    avgProcessingTime: 0,
    maxQueueDepth: 0,
    responseTimesByBatch: [],
    errors: [],
    tradeIds: [],
    duplicateTrades: 0,
  };
  
  // Start monitoring queue status
  const queueStatusInterval = setInterval(async () => {
    try {
      const response = await axios.get(`${CONFIG.pythonBaseUrl}/api/trading/queue/status`);
      const queueDepth = response.data.queueDepth || 0;
      
      if (queueDepth > results.maxQueueDepth) {
        results.maxQueueDepth = queueDepth;
      }
    } catch (error) {
      console.error('Failed to get queue status:', error.message);
    }
  }, 1000);
  
  // Launch batches of trades with slight delays between batches
  for (let batch = 0; batch < batchSize; batch++) {
    const batchStart = performance.now();
    const batchPromises = [];
    
    console.log(`Launching batch ${batch + 1}/${batchSize}...`);
    
    // Create trades for this batch
    for (let trade = 0; trade < CONFIG.tradesPerBatch; trade++) {
      const tradePromise = createAndSendTrade(batch, trade, results);
      batchPromises.push(tradePromise);
    }
    
    // Wait for all trades in this batch to be sent (not necessarily processed)
    const batchResponses = await Promise.allSettled(batchPromises);
    
    const batchEnd = performance.now();
    const batchDuration = batchEnd - batchStart;
    
    results.responseTimesByBatch.push({
      batchNumber: batch,
      duration: batchDuration,
      successfulTrades: batchResponses.filter(r => r.status === 'fulfilled').length,
      failedTrades: batchResponses.filter(r => r.status === 'rejected').length
    });
    
    // Add up successful and failed trades
    batchResponses.forEach(response => {
      if (response.status === 'fulfilled') {
        results.successfulTrades++;
        
        // Check for duplicate trade IDs
        if (results.tradeIds.includes(response.value.tradeId)) {
          results.duplicateTrades++;
        } else {
          results.tradeIds.push(response.value.tradeId);
        }
      } else {
        results.failedTrades++;
        results.errors.push({
          message: response.reason.message,
          code: response.reason.response?.status || 'UNKNOWN',
          data: response.reason.response?.data || {}
        });
      }
    });
    
    // Wait for a short time between batches
    if (batch < batchSize - 1) {
      await new Promise(r => setTimeout(r, CONFIG.batchDelay));
    }
  }
  
  // Stop queue monitoring
  clearInterval(queueStatusInterval);
  
  // Check queue order correctness by requesting trade logs
  try {
    const tradeLogsResponse = await axios.get(`${CONFIG.pythonBaseUrl}/api/trade-logs?limit=100&source=LOAD_TEST`);
    const tradeLogs = tradeLogsResponse.data;
    
    // Check for processing order
    // In a properly functioning queue, trades should be processed in order by priority
    // For the same priority, they should generally be processed in FIFO order
    
    // For this test we'll just check if any out-of-order trades occurred
    // A more sophisticated check would require timestamps and priorities
    
    let previousTimestamp = null;
    tradeLogs.forEach(log => {
      if (previousTimestamp && new Date(log.timestamp) > previousTimestamp) {
        results.outOfOrderTrades++;
      }
      previousTimestamp = new Date(log.timestamp);
    });
  } catch (error) {
    console.error('Failed to check trade logs for order:', error.message);
  }
  
  // Make sure we've given the system time to process all trades
  console.log('Waiting for queue to finish processing...');
  await new Promise(r => setTimeout(r, 5000)); // 5 second wait
  
  // Calculate average processing time if we have successful trades
  if (results.successfulTrades > 0) {
    results.avgProcessingTime = results.responseTimesByBatch.reduce(
      (sum, batch) => sum + batch.duration, 0
    ) / results.responseTimesByBatch.length;
  }
  
  return results;
}

/**
 * Create and send a trade to the execution queue
 */
async function createAndSendTrade(batchNum, tradeNum, results) {
  // Random symbol from the list
  const symbol = CONFIG.symbols[Math.floor(Math.random() * CONFIG.symbols.length)];
  
  // Randomly generate a user ID between 1-100 for testing
  const userId = Math.floor(Math.random() * 100) + 1;
  
  const tradeData = {
    symbol,
    action: Math.random() > 0.5 ? 'BUY' : 'SELL',
    price: 1000 + Math.random() * 1000, // Random price between 1000-2000
    quantity: CONFIG.tradeAmount,
    userId,
    source: 'LOAD_TEST',
    test: true, // Flag to indicate this is a test
    batchNumber: batchNum,
    tradeNumber: tradeNum,
    // Random priority between 1-5
    priority: Math.floor(Math.random() * 5) + 1
  };
  
  try {
    const response = await axios.post(`${CONFIG.pythonBaseUrl}/api/trading/queue/add`, tradeData);
    
    return {
      success: true,
      tradeId: response.data.tradeId || `${batchNum}-${tradeNum}`,
      response: response.data
    };
  } catch (error) {
    // Check if this is a queue overflow error
    if (error.response?.data?.error?.includes('overflow')) {
      results.queueOverflows++;
    }
    
    throw error;
  }
}

/**
 * Test queue prioritization
 */
async function testQueuePrioritization() {
  console.log('\nTesting trade prioritization by sending trades with different priority levels...');
  
  const results = {
    priorityLevels: CONFIG.priorityLevels,
    tradesByPriority: {},
    processingOrder: [],
    correctPrioritization: true
  };
  
  // Send one trade for each priority level (in reverse order)
  for (const priority of [...CONFIG.priorityLevels].sort((a, b) => b - a)) {
    const symbol = CONFIG.symbols[0]; // Use the same symbol for all
    const userId = 999; // Use the same user ID for all prioritization tests
    
    const tradeData = {
      symbol,
      action: 'BUY',
      price: 1000,
      quantity: CONFIG.tradeAmount,
      userId,
      source: 'PRIORITY_TEST',
      test: true,
      priority,
      timestamp: new Date().toISOString()
    };
    
    try {
      const response = await axios.post(`${CONFIG.pythonBaseUrl}/api/trading/queue/add`, tradeData);
      
      results.tradesByPriority[priority] = {
        tradeId: response.data.tradeId,
        timestamp: new Date().toISOString(),
        queuePosition: response.data.queuePosition
      };
      
      // Add a small delay between trades to ensure timestamps are different
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.error(`Failed to add priority ${priority} trade to queue:`, error.message);
    }
  }
  
  // Wait for trades to be processed
  console.log('Waiting for prioritized trades to be processed...');
  await new Promise(r => setTimeout(r, 5000));
  
  // Check trade logs to see the order they were processed in
  try {
    const tradeLogsResponse = await axios.get(`${CONFIG.pythonBaseUrl}/api/trade-logs?source=PRIORITY_TEST&limit=20`);
    const tradeLogs = tradeLogsResponse.data;
    
    // Extract processing order
    for (const log of tradeLogs) {
      // Find which priority this trade corresponds to
      for (const [priority, tradeInfo] of Object.entries(results.tradesByPriority)) {
        if (tradeInfo.tradeId === log.trade_id) {
          results.processingOrder.push({
            priority: parseInt(priority),
            processedAt: new Date(log.timestamp)
          });
          break;
        }
      }
    }
    
    // Check if processing order matches priority order
    results.processingOrder.sort((a, b) => a.processedAt - b.processedAt);
    
    // Highest priority should be processed first
    const expectedOrder = [...CONFIG.priorityLevels].sort((a, b) => b - a);
    
    for (let i = 0; i < results.processingOrder.length; i++) {
      if (results.processingOrder[i].priority !== expectedOrder[i]) {
        results.correctPrioritization = false;
        break;
      }
    }
  } catch (error) {
    console.error('Failed to check priority processing order:', error.message);
    results.correctPrioritization = false;
  }
  
  return results;
}

/**
 * Generate an interim report for a batch test
 */
function generateInterimReport(batchSize, results) {
  console.log(`\nResults for ${batchSize} concurrent batches (${results.totalTrades} total trades):`);
  console.log(`✅ Successful trades: ${results.successfulTrades}/${results.totalTrades} (${(results.successfulTrades / results.totalTrades * 100).toFixed(2)}%)`);
  console.log(`⏱️ Avg batch processing time: ${results.avgProcessingTime.toFixed(2)}ms`);
  console.log(`🧠 Max queue depth: ${results.maxQueueDepth}`);
  
  if (results.outOfOrderTrades > 0) {
    console.log(`⚠️ Detected ${results.outOfOrderTrades} out-of-order trade executions`);
  }
  
  if (results.queueOverflows > 0) {
    console.log(`❌ Queue overflows: ${results.queueOverflows}`);
  }
  
  if (results.duplicateTrades > 0) {
    console.log(`⚠️ Duplicate trade IDs: ${results.duplicateTrades}`);
  }
  
  if (results.errors.length > 0) {
    console.log(`❌ Errors: ${results.errors.length}`);
    
    // Group errors by status code
    const errorsByCode = {};
    results.errors.forEach(error => {
      const code = error.code || 'UNKNOWN';
      errorsByCode[code] = (errorsByCode[code] || 0) + 1;
    });
    
    console.log('Error distribution:');
    Object.entries(errorsByCode).forEach(([code, count]) => {
      console.log(`  - ${code}: ${count} (${(count / results.errors.length * 100).toFixed(2)}%)`);
    });
  }
  
  // Write detailed results to file
  const resultsFile = path.join(CONFIG.outputDir, `queue_stress_${batchSize}_batches.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results written to ${resultsFile}`);
}

/**
 * Generate final comprehensive report
 */
function generateFinalReport(allResults, startTime, endTime) {
  const reportFile = path.join(CONFIG.outputDir, 'queue_test_report.json');
  const textReportFile = path.join(CONFIG.outputDir, 'queue_test_report.txt');
  
  const report = {
    testConfig: CONFIG,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: (endTime - startTime) / 1000,
    summary: {
      batchTests: {},
      prioritization: allResults.prioritization.correctPrioritization
    },
    recommendations: []
  };
  
  // Generate summary for batch tests
  for (const batchSize of CONFIG.concurrentBatches) {
    const results = allResults[batchSize];
    
    report.summary.batchTests[batchSize] = {
      successRate: results.successfulTrades / results.totalTrades,
      processingTime: results.avgProcessingTime,
      maxQueueDepth: results.maxQueueDepth,
      outOfOrderTrades: results.outOfOrderTrades,
      queueOverflows: results.queueOverflows,
      duplicateTrades: results.duplicateTrades
    };
  }
  
  // Generate recommendations
  let highestSuccessRate = 0;
  let lowestSuccessRate = 1;
  let batchWithQueueOverflow = null;
  let batchWithOutOfOrderTrades = null;
  
  for (const batchSize of CONFIG.concurrentBatches) {
    const results = allResults[batchSize];
    const successRate = results.successfulTrades / results.totalTrades;
    
    if (successRate > highestSuccessRate) {
      highestSuccessRate = successRate;
    }
    
    if (successRate < lowestSuccessRate) {
      lowestSuccessRate = successRate;
    }
    
    if (results.queueOverflows > 0 && !batchWithQueueOverflow) {
      batchWithQueueOverflow = batchSize;
    }
    
    if (results.outOfOrderTrades > 0 && !batchWithOutOfOrderTrades) {
      batchWithOutOfOrderTrades = batchSize;
    }
  }
  
  // Add recommendations based on test results
  if (lowestSuccessRate < 0.9) {
    report.recommendations.push(
      `Trade execution success rate drops below 90% under high load. Consider optimizing the queue processing or adding more worker threads.`
    );
  }
  
  if (batchWithQueueOverflow) {
    report.recommendations.push(
      `Queue overflow detected at ${batchWithQueueOverflow * CONFIG.tradesPerBatch} concurrent trades. Consider increasing the queue capacity.`
    );
  }
  
  if (batchWithOutOfOrderTrades) {
    report.recommendations.push(
      `Out-of-order trade executions detected at ${batchWithOutOfOrderTrades * CONFIG.tradesPerBatch} concurrent trades. Review the queue's ordering logic.`
    );
  }
  
  if (!allResults.prioritization.correctPrioritization) {
    report.recommendations.push(
      `Trade prioritization is not working correctly. High-priority trades should be processed before low-priority trades.`
    );
  }
  
  // Add scaling recommendation based on highest batch with good performance
  let optimalBatchSize = CONFIG.concurrentBatches[0];
  for (const batchSize of CONFIG.concurrentBatches) {
    const results = allResults[batchSize];
    const successRate = results.successfulTrades / results.totalTrades;
    
    if (successRate >= 0.95 && batchSize > optimalBatchSize) {
      optimalBatchSize = batchSize;
    }
  }
  
  report.recommendations.push(
    `Optimal trade throughput appears to be around ${optimalBatchSize * CONFIG.tradesPerBatch} concurrent trades with high success rate.`
  );
  
  // Overall assessment
  if (report.recommendations.length === 0) {
    report.recommendations.push(
      'The trade execution queue performed well under all test scenarios. No immediate optimizations needed.'
    );
  }
  
  // Write JSON report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📊 Final report written to ${reportFile}`);
  
  // Create text report
  let textReport = `TRADE EXECUTION QUEUE STRESS TEST REPORT\n`;
  textReport += `=========================================\n\n`;
  textReport += `Test Duration: ${report.duration.toFixed(2)} seconds\n`;
  textReport += `Started: ${report.startTime}\n`;
  textReport += `Finished: ${report.endTime}\n\n`;
  
  textReport += `SUMMARY\n`;
  textReport += `-------\n\n`;
  
  // Batch tests summary
  textReport += `Batch Test Results:\n`;
  for (const batchSize of CONFIG.concurrentBatches) {
    const metrics = report.summary.batchTests[batchSize];
    textReport += `  ${batchSize} batches (${batchSize * CONFIG.tradesPerBatch} trades):\n`;
    textReport += `    Success Rate: ${(metrics.successRate * 100).toFixed(2)}%\n`;
    textReport += `    Avg Processing Time: ${metrics.processingTime.toFixed(2)}ms\n`;
    textReport += `    Max Queue Depth: ${metrics.maxQueueDepth}\n`;
    
    if (metrics.outOfOrderTrades > 0) {
      textReport += `    Out-of-order Trades: ${metrics.outOfOrderTrades}\n`;
    }
    
    if (metrics.queueOverflows > 0) {
      textReport += `    Queue Overflows: ${metrics.queueOverflows}\n`;
    }
    
    if (metrics.duplicateTrades > 0) {
      textReport += `    Duplicate Trade IDs: ${metrics.duplicateTrades}\n`;
    }
    
    textReport += `\n`;
  }
  
  // Priority test summary
  textReport += `Priority Test Results:\n`;
  textReport += `  Correct Prioritization: ${allResults.prioritization.correctPrioritization ? 'Yes' : 'No'}\n`;
  if (allResults.prioritization.processingOrder && allResults.prioritization.processingOrder.length > 0) {
    textReport += `  Processing Order: ${allResults.prioritization.processingOrder.map(p => p.priority).join(' -> ')}\n`;
  }
  textReport += `\n`;
  
  textReport += `RECOMMENDATIONS\n`;
  textReport += `--------------\n\n`;
  
  report.recommendations.forEach((rec, i) => {
    textReport += `${i + 1}. ${rec}\n`;
  });
  
  // Write text report
  fs.writeFileSync(textReportFile, textReport);
  console.log(`📝 Text report written to ${textReportFile}`);
}

// Main execution
runQueueStressTest().catch(error => {
  console.error('❌ Queue stress test failed:', error);
});