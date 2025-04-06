/**
 * Load Testing Runner
 * 
 * This script coordinates and runs all the load testing scripts in sequence,
 * generating a comprehensive report at the end.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG = {
  // Tests to run
  tests: [
    { name: 'General API Load Test', script: 'load_tester.js', description: 'Tests overall system performance with various API endpoint loads' },
    { name: 'Trade Queue Stress Test', script: 'queue_stress_test.js', description: 'Tests the trade execution queue under heavy load' },
    { name: 'ML Prediction Load Test', script: 'ml_prediction_test.js', description: 'Tests the ML prediction system\'s performance under concurrent requests' }
  ],
  
  // System monitoring interval (ms)
  monitoringInterval: 5000,
  
  // Output directory for consolidated results
  outputDir: path.join(__dirname, 'results'),
  
  // Wait time between tests (ms)
  waitBetweenTests: 15000
};

// Ensure results directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main runner function
 */
async function runAllTests() {
  console.log('📊 Starting Comprehensive Load Testing Suite');
  console.log(`System: ${os.platform()} ${os.release()} with ${os.cpus().length} CPUs and ${Math.round(os.totalmem() / (1024 * 1024 * 1024))} GB RAM`);
  
  const startTime = new Date();
  console.log(`Testing started at: ${startTime.toISOString()}`);
  
  const systemStats = [];
  
  // Start system monitoring
  const monitoringInterval = setInterval(() => {
    const memUsage = process.memoryUsage();
    const cpuUsage = os.loadavg()[0]; // 1-minute load average
    
    systemStats.push({
      timestamp: new Date().toISOString(),
      cpuLoad: cpuUsage,
      memoryUsage: {
        heapUsed: Math.round(memUsage.heapUsed / (1024 * 1024)), // MB
        rss: Math.round(memUsage.rss / (1024 * 1024)), // MB
        external: Math.round(memUsage.external / (1024 * 1024)) // MB
      }
    });
  }, CONFIG.monitoringInterval);
  
  const testResults = [];
  
  // Run each test in sequence
  for (const test of CONFIG.tests) {
    console.log(`\n🚀 Running ${test.name}`);
    console.log(`Description: ${test.description}`);
    
    const testStart = new Date();
    
    try {
      await runTest(test.script);
      
      const testEnd = new Date();
      const testDuration = (testEnd - testStart) / 1000;
      
      console.log(`✅ ${test.name} completed in ${testDuration.toFixed(2)} seconds`);
      
      testResults.push({
        name: test.name,
        script: test.script,
        startTime: testStart.toISOString(),
        endTime: testEnd.toISOString(),
        duration: testDuration,
        status: 'success'
      });
    } catch (error) {
      const testEnd = new Date();
      const testDuration = (testEnd - testStart) / 1000;
      
      console.error(`❌ ${test.name} failed after ${testDuration.toFixed(2)} seconds:`, error.message);
      
      testResults.push({
        name: test.name,
        script: test.script,
        startTime: testStart.toISOString(),
        endTime: testEnd.toISOString(),
        duration: testDuration,
        status: 'failed',
        error: error.message
      });
    }
    
    // Wait between tests to let the system recover
    if (CONFIG.tests.indexOf(test) < CONFIG.tests.length - 1) {
      console.log(`\nWaiting ${CONFIG.waitBetweenTests / 1000} seconds before next test...`);
      await new Promise(r => setTimeout(r, CONFIG.waitBetweenTests));
    }
  }
  
  // Stop system monitoring
  clearInterval(monitoringInterval);
  
  const endTime = new Date();
  const totalDuration = (endTime - startTime) / 1000;
  
  console.log(`\n📑 All tests completed in ${totalDuration.toFixed(2)} seconds`);
  
  // Generate consolidated report
  generateConsolidatedReport(testResults, systemStats, startTime, endTime);
}

/**
 * Run a specific test script
 */
function runTest(scriptName) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(__dirname, scriptName);
    
    // Check if the script exists
    if (!fs.existsSync(scriptPath)) {
      return reject(new Error(`Script not found: ${scriptPath}`));
    }
    
    // Spawn the script as a child process
    const child = spawn('node', [scriptPath], {
      stdio: 'inherit' // Redirect the child's stdio to the parent's
    });
    
    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });
    
    child.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Generate a consolidated report of all test results
 */
function generateConsolidatedReport(testResults, systemStats, startTime, endTime) {
  const reportFile = path.join(CONFIG.outputDir, 'consolidated_report.json');
  const textReportFile = path.join(CONFIG.outputDir, 'consolidated_report.txt');
  
  // Load individual test reports
  const testReports = {};
  
  for (const test of CONFIG.tests) {
    const reportPath = path.join(CONFIG.outputDir, test.script.replace('.js', '_report.json'));
    
    if (fs.existsSync(reportPath)) {
      try {
        const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        testReports[test.name] = reportData;
      } catch (error) {
        console.error(`Failed to load report for ${test.name}:`, error.message);
      }
    }
  }
  
  // Create consolidated report
  const report = {
    summary: {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      totalDuration: (endTime - startTime) / 1000,
      testsRun: testResults.length,
      successfulTests: testResults.filter(t => t.status === 'success').length,
      failedTests: testResults.filter(t => t.status === 'failed').length,
      systemStats: {
        maxCpuLoad: Math.max(...systemStats.map(s => s.cpuLoad)),
        maxMemoryUsage: Math.max(...systemStats.map(s => s.memoryUsage.rss))
      }
    },
    tests: testResults,
    systemStatsOverTime: systemStats,
    testReports,
    consolidatedFindings: [],
    recommendations: []
  };
  
  // Generate consolidated findings and recommendations
  
  // Check for overall system performance issues
  if (report.summary.maxCpuLoad > os.cpus().length * 0.8) {
    report.consolidatedFindings.push('CPU utilization exceeded 80% during testing.');
    report.recommendations.push('The system appears to be CPU-bound. Consider adding more CPU cores or optimizing CPU-intensive operations.');
  }
  
  if (report.summary.maxMemoryUsage > os.totalmem() * 0.8 / (1024 * 1024 * 1024)) {
    report.consolidatedFindings.push('Memory utilization exceeded 80% of available RAM.');
    report.recommendations.push('The system appears to be memory-bound. Consider adding more RAM or optimizing memory usage.');
  }
  
  // Check for common patterns across test results
  const allRecommendations = [];
  
  // Gather all recommendations from individual tests
  for (const [testName, testReport] of Object.entries(testReports)) {
    if (testReport.recommendations) {
      allRecommendations.push(...testReport.recommendations.map(rec => ({ test: testName, recommendation: rec })));
    }
  }
  
  // Find common themes in recommendations
  const recommendationThemes = {};
  
  allRecommendations.forEach(rec => {
    const text = rec.recommendation.toLowerCase();
    
    if (text.includes('response time') || text.includes('latency')) {
      recommendationThemes.responseTime = (recommendationThemes.responseTime || 0) + 1;
    }
    
    if (text.includes('error rate') || text.includes('failures')) {
      recommendationThemes.errorRate = (recommendationThemes.errorRate || 0) + 1;
    }
    
    if (text.includes('throughput') || text.includes('concurrent')) {
      recommendationThemes.throughput = (recommendationThemes.throughput || 0) + 1;
    }
    
    if (text.includes('queue') || text.includes('overflow')) {
      recommendationThemes.queueManagement = (recommendationThemes.queueManagement || 0) + 1;
    }
    
    if (text.includes('ml') || text.includes('prediction')) {
      recommendationThemes.mlPerformance = (recommendationThemes.mlPerformance || 0) + 1;
    }
  });
  
  // Add consolidated findings based on themes
  if (recommendationThemes.responseTime && recommendationThemes.responseTime >= 2) {
    report.consolidatedFindings.push('Multiple tests identified response time issues under load.');
    report.recommendations.push('Consider implementing a caching layer for frequently accessed data to improve response times.');
  }
  
  if (recommendationThemes.errorRate && recommendationThemes.errorRate >= 2) {
    report.consolidatedFindings.push('Multiple tests identified increased error rates under load.');
    report.recommendations.push('Review error handling and implement circuit breakers or graceful degradation strategies.');
  }
  
  if (recommendationThemes.throughput && recommendationThemes.throughput >= 2) {
    report.consolidatedFindings.push('Multiple tests identified throughput limitations.');
    report.recommendations.push('Consider implementing a load balancing strategy or horizontal scaling to increase throughput.');
  }
  
  if (recommendationThemes.queueManagement) {
    report.consolidatedFindings.push('Trade queue management issues were identified under load.');
    report.recommendations.push('Review the trade queue implementation, consider increasing capacity or implementing a backpressure mechanism.');
  }
  
  if (recommendationThemes.mlPerformance) {
    report.consolidatedFindings.push('ML prediction performance issues were identified under load.');
    report.recommendations.push('Consider optimizing ML models or implementing prediction caching for common queries.');
  }
  
  // Add general recommendations if we don't have specific ones
  if (report.recommendations.length === 0) {
    report.recommendations.push(
      'Overall, the system performed well under the tested loads. Consider implementing regular load testing as part of the CI/CD pipeline.'
    );
  }
  
  // Write JSON report
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(`📊 Consolidated report written to ${reportFile}`);
  
  // Create text report
  let textReport = `CONSOLIDATED LOAD TEST REPORT\n`;
  textReport += `===========================\n\n`;
  textReport += `Test Duration: ${report.summary.totalDuration.toFixed(2)} seconds\n`;
  textReport += `Started: ${report.summary.startTime}\n`;
  textReport += `Finished: ${report.summary.endTime}\n\n`;
  
  textReport += `SUMMARY\n`;
  textReport += `-------\n\n`;
  textReport += `Tests Run: ${report.summary.testsRun}\n`;
  textReport += `Successful: ${report.summary.successfulTests}\n`;
  textReport += `Failed: ${report.summary.failedTests}\n\n`;
  
  textReport += `System Stats:\n`;
  textReport += `  Max CPU Load: ${report.summary.systemStats.maxCpuLoad.toFixed(2)}\n`;
  textReport += `  Max Memory Usage: ${report.summary.systemStats.maxMemoryUsage} MB\n\n`;
  
  textReport += `TEST RESULTS\n`;
  textReport += `-----------\n\n`;
  
  for (const test of report.tests) {
    textReport += `${test.name}:\n`;
    textReport += `  Status: ${test.status}\n`;
    textReport += `  Duration: ${test.duration.toFixed(2)} seconds\n`;
    
    if (test.status === 'failed') {
      textReport += `  Error: ${test.error}\n`;
    }
    
    textReport += `\n`;
  }
  
  textReport += `FINDINGS\n`;
  textReport += `--------\n\n`;
  
  report.consolidatedFindings.forEach((finding, i) => {
    textReport += `${i + 1}. ${finding}\n`;
  });
  
  textReport += `\n`;
  
  textReport += `RECOMMENDATIONS\n`;
  textReport += `---------------\n\n`;
  
  report.recommendations.forEach((rec, i) => {
    textReport += `${i + 1}. ${rec}\n`;
  });
  
  // Write text report
  fs.writeFileSync(textReportFile, textReport);
  console.log(`📝 Text report written to ${textReportFile}`);
}

// Run all tests
runAllTests().catch(error => {
  console.error('Failed to run tests:', error);
});