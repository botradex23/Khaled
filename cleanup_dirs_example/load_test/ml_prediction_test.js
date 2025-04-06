/**
 * Machine Learning Prediction Load Test
 * 
 * This script specifically tests the ML prediction system's performance under load,
 * ensuring that it can handle concurrent prediction requests and provide accurate,
 * timely responses even when heavily utilized.
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
  concurrentRequests: [10, 20, 50, 100],
  requestsPerBatch: 5,
  
  // Test prediction parameters
  timeframes: ['1h', '4h', '1d'],
  predictionHorizons: [12, 24, 48],
  
  // Test symbols
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'],
  
  // Output directory for results
  outputDir: path.join(__dirname, 'results'),
  
  // Delay between batches (ms)
  batchDelay: 1000,
};

// Ensure results directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main test runner
 */
async function runMlPredictionTest() {
  console.log('🚀 Starting ML Prediction Load Test');
  
  const startTime = new Date();
  console.log(`Test started at: ${startTime.toISOString()}`);
  
  const results = {};
  
  // Test with increasing concurrent requests
  for (const concurrentCount of CONFIG.concurrentRequests) {
    console.log(`\n👥 Testing with ${concurrentCount} concurrent prediction requests`);
    
    const testResults = await testWithConcurrentRequests(concurrentCount);
    results[concurrentCount] = testResults;
    
    // Generate interim report
    generateInterimReport(concurrentCount, testResults);
    
    // Give the system time to recover
    console.log('Waiting for system to recover before next test...');
    await new Promise(r => setTimeout(r, 5000));
  }
  
  // Generate final report
  const endTime = new Date();
  const testDuration = (endTime - startTime) / 1000;
  console.log(`\n✅ ML prediction testing completed in ${testDuration.toFixed(2)} seconds`);
  
  generateFinalReport(results, startTime, endTime);
}

/**
 * Test ML prediction system with a specific number of concurrent requests
 */
async function testWithConcurrentRequests(concurrentCount) {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimesByEndpoint: {},
    errors: [],
    // Consistency metrics
    predictionConsistency: {
      consistentPredictions: 0,
      inconsistentPredictions: 0,
      consistencyRate: 0
    },
    // Quality metrics
    predictionQuality: {
      highConfidence: 0,
      mediumConfidence: 0,
      lowConfidence: 0
    }
  };
  
  // Send requests in batches
  const batches = Math.ceil(concurrentCount / CONFIG.requestsPerBatch);
  
  for (let batch = 0; batch < batches; batch++) {
    const requestsInBatch = Math.min(CONFIG.requestsPerBatch, concurrentCount - (batch * CONFIG.requestsPerBatch));
    const batchPromises = [];
    
    console.log(`Sending batch ${batch + 1}/${batches} with ${requestsInBatch} requests...`);
    
    // Create prediction requests for this batch
    for (let i = 0; i < requestsInBatch; i++) {
      const requestPromise = sendPredictionRequest(results);
      batchPromises.push(requestPromise);
    }
    
    // Wait for all requests in this batch to complete
    await Promise.allSettled(batchPromises);
    
    // Add a small delay between batches
    if (batch < batches - 1) {
      await new Promise(r => setTimeout(r, CONFIG.batchDelay));
    }
  }
  
  // Calculate average response time
  if (results.totalRequests > 0) {
    results.avgResponseTime = Object.values(results.responseTimesByEndpoint)
      .flat()
      .reduce((sum, time) => sum + time, 0) / results.totalRequests;
  }
  
  // Calculate consistency rate
  const totalPredictions = results.predictionConsistency.consistentPredictions + 
                           results.predictionConsistency.inconsistentPredictions;
  
  if (totalPredictions > 0) {
    results.predictionConsistency.consistencyRate = 
      results.predictionConsistency.consistentPredictions / totalPredictions;
  }
  
  return results;
}

/**
 * Send a prediction request to the ML system
 */
async function sendPredictionRequest(results) {
  // Choose random parameters for this request
  const symbol = CONFIG.symbols[Math.floor(Math.random() * CONFIG.symbols.length)];
  const timeframe = CONFIG.timeframes[Math.floor(Math.random() * CONFIG.timeframes.length)];
  const horizon = CONFIG.predictionHorizons[Math.floor(Math.random() * CONFIG.predictionHorizons.length)];
  
  // Generate a unique request signature for consistency checking
  const requestSignature = `${symbol}-${timeframe}-${horizon}`;
  
  // Choose a random prediction endpoint
  const endpoints = [
    `/api/ml/predict/price/${symbol}?timeframe=${timeframe}&horizon=${horizon}`,
    `/api/ml/predict/trend/${symbol}?timeframe=${timeframe}&horizon=${horizon}`,
    `/api/ml/predict/signal/${symbol}?timeframe=${timeframe}`
  ];
  
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  // Initialize responseTimesByEndpoint for this endpoint if not exists
  if (!results.responseTimesByEndpoint[endpoint]) {
    results.responseTimesByEndpoint[endpoint] = [];
  }
  
  const startTime = performance.now();
  
  try {
    const response = await axios.get(`${CONFIG.pythonBaseUrl}${endpoint}`);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Update statistics
    results.totalRequests++;
    results.successfulRequests++;
    results.responseTimesByEndpoint[endpoint].push(duration);
    
    // Update min/max response times
    results.minResponseTime = Math.min(results.minResponseTime, duration);
    results.maxResponseTime = Math.max(results.maxResponseTime, duration);
    
    // Check prediction consistency
    checkPredictionConsistency(requestSignature, response.data, results);
    
    // Check prediction quality/confidence
    checkPredictionQuality(response.data, results);
    
    return {
      success: true,
      endpoint,
      duration,
      data: response.data
    };
  } catch (error) {
    results.totalRequests++;
    results.failedRequests++;
    
    results.errors.push({
      endpoint,
      message: error.message,
      code: error.response?.status || 'UNKNOWN',
      data: error.response?.data || {}
    });
    
    throw error;
  }
}

// Store previous predictions for consistency checks
const previousPredictions = {};

/**
 * Check if predictions are consistent across duplicate requests
 */
function checkPredictionConsistency(requestSignature, predictionData, results) {
  // If we've seen this request before, check consistency
  if (previousPredictions[requestSignature]) {
    const previousPrediction = previousPredictions[requestSignature];
    
    // For simplicity, we'll just check if the prediction direction is the same
    let isConsistent = false;
    
    if (predictionData.direction && previousPrediction.direction) {
      isConsistent = predictionData.direction === previousPrediction.direction;
    } else if (predictionData.prediction && previousPrediction.prediction) {
      // For numerical predictions, allow some small variation (0.5%)
      const variation = Math.abs(predictionData.prediction - previousPrediction.prediction) / 
                       previousPrediction.prediction;
      isConsistent = variation < 0.005;
    } else if (predictionData.signal && previousPrediction.signal) {
      isConsistent = predictionData.signal === previousPrediction.signal;
    }
    
    if (isConsistent) {
      results.predictionConsistency.consistentPredictions++;
    } else {
      results.predictionConsistency.inconsistentPredictions++;
    }
  } else {
    // Store this prediction for future consistency checks
    previousPredictions[requestSignature] = predictionData;
  }
}

/**
 * Check prediction quality based on confidence metrics
 */
function checkPredictionQuality(predictionData, results) {
  // Extract confidence from the prediction response
  let confidence = null;
  
  if (predictionData.confidence) {
    confidence = predictionData.confidence;
  } else if (predictionData.probability) {
    confidence = predictionData.probability;
  } else if (predictionData.score) {
    confidence = predictionData.score;
  }
  
  // Categorize confidence
  if (confidence !== null) {
    if (confidence >= 0.7) {
      results.predictionQuality.highConfidence++;
    } else if (confidence >= 0.4) {
      results.predictionQuality.mediumConfidence++;
    } else {
      results.predictionQuality.lowConfidence++;
    }
  }
}

/**
 * Generate an interim report for a concurrent requests test
 */
function generateInterimReport(concurrentCount, results) {
  console.log(`\nResults for ${concurrentCount} concurrent ML prediction requests:`);
  console.log(`✅ Successful requests: ${results.successfulRequests}/${results.totalRequests} (${(results.successfulRequests / results.totalRequests * 100).toFixed(2)}%)`);
  console.log(`⏱️ Avg response time: ${results.avgResponseTime.toFixed(2)}ms`);
  console.log(`⚡ Min/Max response time: ${results.minResponseTime.toFixed(2)}ms / ${results.maxResponseTime.toFixed(2)}ms`);
  
  // Endpoint-specific performance
  console.log('\nEndpoint performance:');
  for (const [endpoint, times] of Object.entries(results.responseTimesByEndpoint)) {
    const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
    console.log(`  ${endpoint}: ${avgTime.toFixed(2)}ms avg (${times.length} requests)`);
  }
  
  // Prediction consistency
  const consistencyRate = results.predictionConsistency.consistencyRate * 100;
  console.log(`\n🔄 Prediction consistency: ${consistencyRate.toFixed(2)}%`);
  
  // Prediction quality
  console.log('\n🎯 Prediction quality:');
  const totalWithConfidence = results.predictionQuality.highConfidence + 
                             results.predictionQuality.mediumConfidence + 
                             results.predictionQuality.lowConfidence;
  
  if (totalWithConfidence > 0) {
    console.log(`  High confidence: ${results.predictionQuality.highConfidence} (${(results.predictionQuality.highConfidence / totalWithConfidence * 100).toFixed(2)}%)`);
    console.log(`  Medium confidence: ${results.predictionQuality.mediumConfidence} (${(results.predictionQuality.mediumConfidence / totalWithConfidence * 100).toFixed(2)}%)`);
    console.log(`  Low confidence: ${results.predictionQuality.lowConfidence} (${(results.predictionQuality.lowConfidence / totalWithConfidence * 100).toFixed(2)}%)`);
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ Errors: ${results.errors.length}`);
    
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
  const resultsFile = path.join(CONFIG.outputDir, `ml_prediction_${concurrentCount}_concurrent.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results written to ${resultsFile}`);
}

/**
 * Generate a final comprehensive report
 */
function generateFinalReport(allResults, startTime, endTime) {
  const reportFile = path.join(CONFIG.outputDir, 'ml_prediction_report.json');
  const textReportFile = path.join(CONFIG.outputDir, 'ml_prediction_report.txt');
  
  const report = {
    testConfig: CONFIG,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: (endTime - startTime) / 1000,
    summary: {},
    recommendations: []
  };
  
  // Generate summary metrics
  for (const concurrentCount of CONFIG.concurrentRequests) {
    const results = allResults[concurrentCount];
    
    report.summary[concurrentCount] = {
      successRate: results.successfulRequests / results.totalRequests,
      avgResponseTime: results.avgResponseTime,
      consistencyRate: results.predictionConsistency.consistencyRate,
      highConfidenceRate: results.predictionQuality.highConfidence / 
        (results.predictionQuality.highConfidence + results.predictionQuality.mediumConfidence + results.predictionQuality.lowConfidence)
    };
  }
  
  // Generate system recommendations based on results
  let lowestSuccessRate = 1;
  let slowestResponseTime = 0;
  let lowestConsistencyRate = 1;
  
  for (const concurrentCount of CONFIG.concurrentRequests) {
    const metrics = report.summary[concurrentCount];
    
    // Check success rate
    if (metrics.successRate < lowestSuccessRate) {
      lowestSuccessRate = metrics.successRate;
    }
    
    // Check response time
    if (metrics.avgResponseTime > slowestResponseTime) {
      slowestResponseTime = metrics.avgResponseTime;
    }
    
    // Check consistency
    if (metrics.consistencyRate < lowestConsistencyRate) {
      lowestConsistencyRate = metrics.consistencyRate;
    }
    
    // Add recommendations for specific concurrency levels
    if (metrics.successRate < 0.95) {
      report.recommendations.push(
        `ML prediction success rate drops below 95% at ${concurrentCount} concurrent requests. Consider optimizing the ML service or adding more capacity.`
      );
    }
    
    if (metrics.avgResponseTime > 2000) {
      report.recommendations.push(
        `ML prediction response time exceeds 2 seconds at ${concurrentCount} concurrent requests. Consider optimizing ML algorithms or caching predictions.`
      );
    }
    
    if (metrics.consistencyRate < 0.9) {
      report.recommendations.push(
        `ML prediction consistency drops below 90% at ${concurrentCount} concurrent requests. Review the prediction algorithms for stability under load.`
      );
    }
  }
  
  // Find optimal concurrency level
  let optimalConcurrency = CONFIG.concurrentRequests[0];
  for (const concurrentCount of CONFIG.concurrentRequests) {
    const metrics = report.summary[concurrentCount];
    
    if (metrics.successRate >= 0.98 && 
        metrics.avgResponseTime <= 1000 &&
        metrics.consistencyRate >= 0.95 && 
        concurrentCount > optimalConcurrency) {
      optimalConcurrency = concurrentCount;
    }
  }
  
  report.recommendations.push(
    `Optimal ML prediction throughput appears to be around ${optimalConcurrency} concurrent requests with good performance metrics.`
  );
  
  // Overall assessment
  if (report.recommendations.length <= 1) {
    report.recommendations.push(
      'The ML prediction system performed well under all test scenarios. Consider implementing prediction caching for frequently requested symbols/timeframes.'
    );
  }
  
  // Write JSON report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📊 Final report written to ${reportFile}`);
  
  // Create text report
  let textReport = `ML PREDICTION LOAD TEST REPORT\n`;
  textReport += `===============================\n\n`;
  textReport += `Test Duration: ${report.duration.toFixed(2)} seconds\n`;
  textReport += `Started: ${report.startTime}\n`;
  textReport += `Finished: ${report.endTime}\n\n`;
  
  textReport += `SUMMARY\n`;
  textReport += `-------\n\n`;
  
  for (const concurrentCount of CONFIG.concurrentRequests) {
    const metrics = report.summary[concurrentCount];
    textReport += `${concurrentCount} Concurrent Requests:\n`;
    textReport += `  Success Rate: ${(metrics.successRate * 100).toFixed(2)}%\n`;
    textReport += `  Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms\n`;
    textReport += `  Prediction Consistency: ${(metrics.consistencyRate * 100).toFixed(2)}%\n`;
    textReport += `  High Confidence Predictions: ${(metrics.highConfidenceRate * 100).toFixed(2)}%\n\n`;
  }
  
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
runMlPredictionTest().catch(error => {
  console.error('❌ ML prediction test failed:', error);
});