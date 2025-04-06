/**
 * Load Tester for Trading System
 * 
 * This script simulates multiple concurrent users interacting with the trading system,
 * generating load to test system performance, stability, and scalability.
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const os = require('os');

// Configuration
const CONFIG = {
  // Base URLs for API endpoints
  baseUrl: 'http://localhost:5000',
  pythonBaseUrl: 'http://localhost:5001',
  
  // Test parameters
  concurrentUsers: [10, 50, 100, 200],
  requestsPerUser: 20,
  delayBetweenRequests: 50, // ms
  
  // Test scenarios
  scenarios: ['market_data', 'trade_signals', 'trade_execution', 'mixed'],
  
  // Output directory for test results
  outputDir: path.join(__dirname, 'results'),
  
  // Test symbols
  symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'SOLUSDT'],
  
  // Trade parameters
  tradeAmount: 0.001, // Small amount for testing
};

// Ensure results directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main test runner
 */
async function runLoadTest() {
  console.log('🚀 Starting load testing suite');
  console.log(`System: ${os.platform()} ${os.release()} with ${os.cpus().length} CPUs and ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB RAM`);
  
  const startTime = new Date();
  console.log(`Test started at: ${startTime.toISOString()}`);
  
  const results = {};
  
  // Test each scenario with different user counts
  for (const scenario of CONFIG.scenarios) {
    results[scenario] = {};
    
    console.log(`\n📊 Running ${scenario} test scenario`);
    
    for (const userCount of CONFIG.concurrentUsers) {
      console.log(`\n👥 Testing with ${userCount} concurrent users`);
      
      const scenarioResults = await runScenario(scenario, userCount);
      results[scenario][userCount] = scenarioResults;
      
      // Generate interim report
      generateInterimReport(scenario, userCount, scenarioResults);
      
      // Add slight delay between tests to let system recover
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  
  const endTime = new Date();
  const testDuration = (endTime - startTime) / 1000;
  
  console.log(`\n✅ Load testing completed in ${testDuration.toFixed(2)} seconds`);
  
  // Generate final report
  generateFinalReport(results, startTime, endTime);
}

/**
 * Run a specific test scenario with a given number of concurrent users
 */
async function runScenario(scenario, userCount) {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    avgResponseTime: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimesMs: [],
    errors: [],
    startTime: new Date(),
    endTime: null,
    cpuUsage: [],
    memoryUsage: [],
  };
  
  // Create a timestamp for monitoring
  const monitoringStart = performance.now();
  
  // Start system monitoring in the background
  const monitoringInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0]; // 1-minute load average
    
    results.cpuUsage.push({
      timestamp: performance.now() - monitoringStart,
      value: cpuUsage
    });
    
    results.memoryUsage.push({
      timestamp: performance.now() - monitoringStart,
      heap: Math.round(memUsage.heapUsed / (1024 * 1024)), // MB
      rss: Math.round(memUsage.rss / (1024 * 1024)), // MB
    });
  }, 1000);
  
  // Create workers for parallel execution
  const workers = [];
  const requestsPerWorker = Math.ceil(userCount * CONFIG.requestsPerUser / os.cpus().length);
  
  for (let i = 0; i < Math.min(os.cpus().length, userCount); i++) {
    const workerConfig = {
      scenario,
      requestCount: requestsPerWorker,
      userId: i,
      baseUrl: CONFIG.baseUrl,
      pythonBaseUrl: CONFIG.pythonBaseUrl,
      symbols: CONFIG.symbols,
      tradeAmount: CONFIG.tradeAmount,
      delayBetweenRequests: CONFIG.delayBetweenRequests
    };
    
    const worker = new Worker(__filename, {
      workerData: workerConfig
    });
    
    worker.on('message', (workerResults) => {
      // Merge results from worker
      results.totalRequests += workerResults.totalRequests;
      results.successfulRequests += workerResults.successfulRequests;
      results.failedRequests += workerResults.failedRequests;
      results.totalDuration += workerResults.totalDuration;
      results.responseTimesMs = results.responseTimesMs.concat(workerResults.responseTimesMs);
      results.errors = results.errors.concat(workerResults.errors);
      
      // Update min/max
      results.minResponseTime = Math.min(results.minResponseTime, workerResults.minResponseTime);
      results.maxResponseTime = Math.max(results.maxResponseTime, workerResults.maxResponseTime);
    });
    
    workers.push(worker);
  }
  
  // Wait for all workers to complete
  await Promise.all(workers.map(worker => {
    return new Promise((resolve) => {
      worker.on('exit', resolve);
    });
  }));
  
  // Stop monitoring
  clearInterval(monitoringInterval);
  
  // Calculate final metrics
  results.endTime = new Date();
  results.totalDuration = (results.endTime - results.startTime) / 1000;
  
  if (results.responseTimesMs.length > 0) {
    results.avgResponseTime = results.responseTimesMs.reduce((sum, time) => sum + time, 0) / results.responseTimesMs.length;
    
    // Calculate percentiles
    results.responseTimesMs.sort((a, b) => a - b);
    results.p50 = results.responseTimesMs[Math.floor(results.responseTimesMs.length * 0.5)];
    results.p90 = results.responseTimesMs[Math.floor(results.responseTimesMs.length * 0.9)];
    results.p95 = results.responseTimesMs[Math.floor(results.responseTimesMs.length * 0.95)];
    results.p99 = results.responseTimesMs[Math.floor(results.responseTimesMs.length * 0.99)];
  }
  
  // Calculate throughput (requests per second)
  results.throughput = results.totalRequests / results.totalDuration;
  
  return results;
}

/**
 * Worker thread function to execute requests in parallel
 */
async function workerFunction(config) {
  const results = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    totalDuration: 0,
    minResponseTime: Infinity,
    maxResponseTime: 0,
    responseTimesMs: [],
    errors: []
  };
  
  for (let i = 0; i < config.requestCount; i++) {
    try {
      const requestType = await executeRequest(config.scenario, config);
      
      results.totalRequests++;
      results.successfulRequests++;
      
      // Record response time
      results.responseTimesMs.push(requestType.duration);
      results.minResponseTime = Math.min(results.minResponseTime, requestType.duration);
      results.maxResponseTime = Math.max(results.maxResponseTime, requestType.duration);
      
      // Add a small delay between requests to simulate real user behavior
      await new Promise(r => setTimeout(r, config.delayBetweenRequests));
    } catch (error) {
      results.totalRequests++;
      results.failedRequests++;
      
      results.errors.push({
        message: error.message,
        code: error.response?.status || 'UNKNOWN',
        data: error.response?.data || {}
      });
    }
  }
  
  return results;
}

/**
 * Execute a request based on the scenario
 */
async function executeRequest(scenario, config) {
  const startTime = performance.now();
  let response;
  
  // Random symbol from the list
  const symbol = config.symbols[Math.floor(Math.random() * config.symbols.length)];
  
  // Randomly generate a user ID between 1-1000 for testing
  const userId = Math.floor(Math.random() * 1000) + 1;
  
  switch (scenario) {
    case 'market_data':
      // Choose a random market data endpoint
      const marketEndpoints = [
        '/api/market/prices',
        `/api/market/ticker/${symbol}`,
        '/api/market/summary',
        `/api/binance/klines/${symbol}/1h`,
      ];
      
      const endpoint = marketEndpoints[Math.floor(Math.random() * marketEndpoints.length)];
      response = await axios.get(`${config.baseUrl}${endpoint}`);
      break;
      
    case 'trade_signals':
      // Simulate generating trade signals
      const signalTypes = ['AI_GRID_BOT', 'MACD_BOT', 'DCA_BOT', 'MANUAL'];
      const signalType = signalTypes[Math.floor(Math.random() * signalTypes.length)];
      const confidence = Math.random() * 100;
      
      const signalData = {
        symbol,
        action: Math.random() > 0.5 ? 'BUY' : 'SELL',
        price: 1000 + Math.random() * 1000, // Random price between 1000-2000
        quantity: config.tradeAmount,
        userId,
        source: signalType,
        confidence
      };
      
      response = await axios.post(`${config.pythonBaseUrl}/api/trade-logs/signals`, signalData);
      break;
      
    case 'trade_execution':
      // Simulate trade execution requests
      const tradeData = {
        symbol,
        action: Math.random() > 0.5 ? 'BUY' : 'SELL',
        price: 1000 + Math.random() * 1000,
        quantity: config.tradeAmount,
        userId,
        source: 'LOAD_TEST',
        test: true // Flag to indicate this is a test
      };
      
      response = await axios.post(`${config.pythonBaseUrl}/api/trading/paper/execute`, tradeData);
      break;
      
    case 'mixed':
      // Choose a random action
      const actions = ['market_data', 'trade_signals', 'trade_execution'];
      const randomAction = actions[Math.floor(Math.random() * actions.length)];
      return executeRequest(randomAction, config);
      
    default:
      throw new Error(`Unknown scenario: ${scenario}`);
  }
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  return {
    duration,
    status: response.status,
    endpoint: response.config.url
  };
}

/**
 * Generate an interim report for a single scenario
 */
function generateInterimReport(scenario, userCount, results) {
  console.log(`\nResults for ${scenario} with ${userCount} users:`);
  console.log(`✅ Successful requests: ${results.successfulRequests}/${results.totalRequests} (${(results.successfulRequests / results.totalRequests * 100).toFixed(2)}%)`);
  console.log(`⏱️ Avg response time: ${results.avgResponseTime.toFixed(2)}ms`);
  console.log(`⚡ Min/Max response time: ${results.minResponseTime.toFixed(2)}ms / ${results.maxResponseTime.toFixed(2)}ms`);
  console.log(`📈 Throughput: ${results.throughput.toFixed(2)} requests/second`);
  console.log(`🧠 Memory usage (RSS): ${results.memoryUsage[results.memoryUsage.length - 1]?.rss || 0} MB`);
  
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
  const resultsFile = path.join(CONFIG.outputDir, `${scenario}_${userCount}_users.json`);
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results written to ${resultsFile}`);
}

/**
 * Generate a final comprehensive report
 */
function generateFinalReport(allResults, startTime, endTime) {
  const reportFile = path.join(CONFIG.outputDir, 'final_report.json');
  const textReportFile = path.join(CONFIG.outputDir, 'load_test_report.txt');
  
  const report = {
    testConfig: CONFIG,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    duration: (endTime - startTime) / 1000,
    summary: {},
    recommendations: []
  };
  
  // Generate summary metrics
  for (const scenario of CONFIG.scenarios) {
    report.summary[scenario] = {};
    
    for (const userCount of CONFIG.concurrentUsers) {
      const results = allResults[scenario][userCount];
      
      report.summary[scenario][userCount] = {
        successRate: results.successfulRequests / results.totalRequests,
        avgResponseTime: results.avgResponseTime,
        throughput: results.throughput,
        p95ResponseTime: results.p95,
        errorCount: results.errors.length
      };
    }
  }
  
  // Generate system recommendations based on results
  let slowestScenario = '';
  let slowestResponseTime = 0;
  let highestErrorRate = 0;
  let highestErrorScenario = '';
  let highestErrorUserCount = 0;
  
  // Find bottlenecks
  for (const scenario of CONFIG.scenarios) {
    for (const userCount of CONFIG.concurrentUsers) {
      const results = allResults[scenario][userCount];
      
      // Check for slow responses
      if (results.avgResponseTime > slowestResponseTime) {
        slowestResponseTime = results.avgResponseTime;
        slowestScenario = `${scenario} with ${userCount} users`;
      }
      
      // Check for high error rates
      const errorRate = results.failedRequests / results.totalRequests;
      if (errorRate > highestErrorRate) {
        highestErrorRate = errorRate;
        highestErrorScenario = scenario;
        highestErrorUserCount = userCount;
      }
      
      // Add recommendations based on response times
      if (results.p95 > 1000) { // Response times over 1 second at p95
        report.recommendations.push(
          `Optimize ${scenario} for better response times. P95 is ${results.p95.toFixed(2)}ms at ${userCount} users.`
        );
      }
      
      // Add recommendations based on error rates
      if (errorRate > 0.05) { // Error rate over 5%
        const errorTypes = {};
        results.errors.forEach(err => {
          errorTypes[err.code] = (errorTypes[err.code] || 0) + 1;
        });
        
        const mostCommonError = Object.entries(errorTypes)
          .sort((a, b) => b[1] - a[1])
          .map(([code, count]) => `${code} (${count} occurrences)`)
          .slice(0, 3)
          .join(', ');
        
        report.recommendations.push(
          `Fix high error rate (${(errorRate * 100).toFixed(2)}%) in ${scenario} at ${userCount} users. Most common errors: ${mostCommonError}`
        );
      }
      
      // Add scaling recommendations
      if (userCount === Math.max(...CONFIG.concurrentUsers) && results.avgResponseTime > 500) {
        report.recommendations.push(
          `The system shows performance degradation at ${userCount} concurrent users for ${scenario}. Consider optimizing or scaling.`
        );
      }
    }
  }
  
  // Overall performance assessment
  if (report.recommendations.length === 0) {
    report.recommendations.push(
      'The system performed well under all test scenarios. No immediate optimizations needed.'
    );
  }
  
  // Write JSON report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📊 Final report written to ${reportFile}`);
  
  // Create text report
  let textReport = `LOAD TEST REPORT\n`;
  textReport += `==================\n\n`;
  textReport += `Test Duration: ${report.duration.toFixed(2)} seconds\n`;
  textReport += `Started: ${report.startTime}\n`;
  textReport += `Finished: ${report.endTime}\n\n`;
  
  textReport += `SUMMARY\n`;
  textReport += `-------\n\n`;
  
  for (const scenario of CONFIG.scenarios) {
    textReport += `${scenario.toUpperCase()}\n`;
    
    for (const userCount of CONFIG.concurrentUsers) {
      const metrics = report.summary[scenario][userCount];
      textReport += `  ${userCount} users:\n`;
      textReport += `    Success Rate: ${(metrics.successRate * 100).toFixed(2)}%\n`;
      textReport += `    Avg Response Time: ${metrics.avgResponseTime.toFixed(2)}ms\n`;
      textReport += `    P95 Response Time: ${metrics.p95ResponseTime.toFixed(2)}ms\n`;
      textReport += `    Throughput: ${metrics.throughput.toFixed(2)} req/sec\n`;
      textReport += `    Errors: ${metrics.errorCount}\n\n`;
    }
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
if (isMainThread) {
  runLoadTest().catch(error => {
    console.error('❌ Load test failed:', error);
  });
} else {
  // Worker thread execution
  const results = workerFunction(workerData)
    .then(results => {
      parentPort.postMessage(results);
    })
    .catch(error => {
      console.error(`Worker ${workerData.userId} error:`, error);
      parentPort.postMessage({
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalDuration: 0,
        minResponseTime: 0,
        maxResponseTime: 0,
        responseTimesMs: [],
        errors: [{ message: error.message }]
      });
    });
}