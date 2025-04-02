/**
 * Load Test Results Visualization
 * 
 * This script generates charts from the load test results to visualize
 * system performance under various load conditions.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Input directory with test results
  inputDir: path.join(__dirname, 'results'),
  
  // Output directory for charts
  outputDir: path.join(__dirname, 'charts'),
  
  // Chart dimensions
  chartWidth: 800,
  chartHeight: 500
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

/**
 * Main function to generate all charts
 */
function generateCharts() {
  console.log('🎨 Generating performance charts from load test results');
  
  // Load consolidated report
  const consolidatedReportPath = path.join(CONFIG.inputDir, 'consolidated_report.json');
  
  if (!fs.existsSync(consolidatedReportPath)) {
    console.error('❌ Consolidated report not found. Run the load tests first.');
    return;
  }
  
  let consolidatedReport;
  try {
    consolidatedReport = JSON.parse(fs.readFileSync(consolidatedReportPath, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to parse consolidated report:', error.message);
    return;
  }
  
  // Generate system resource usage chart
  generateSystemResourceChart(consolidatedReport);
  
  // Generate charts for each test type
  
  // Load tester charts
  try {
    const loadTestReports = getTestReports('load_tester');
    if (loadTestReports.length > 0) {
      generateResponseTimeChart(loadTestReports, 'api');
      generateThroughputChart(loadTestReports, 'api');
      generateErrorRateChart(loadTestReports, 'api');
    }
  } catch (error) {
    console.error('❌ Failed to generate API load test charts:', error.message);
  }
  
  // Queue stress test charts
  try {
    const queueTestReports = getTestReports('queue_stress');
    if (queueTestReports.length > 0) {
      generateQueueDepthChart(queueTestReports);
      generateQueueSuccessRateChart(queueTestReports);
    }
  } catch (error) {
    console.error('❌ Failed to generate queue stress test charts:', error.message);
  }
  
  // ML prediction test charts
  try {
    const mlTestReports = getTestReports('ml_prediction');
    if (mlTestReports.length > 0) {
      generateResponseTimeChart(mlTestReports, 'ml');
      generatePredictionConsistencyChart(mlTestReports);
    }
  } catch (error) {
    console.error('❌ Failed to generate ML prediction test charts:', error.message);
  }
  
  // Generate comparative chart across all tests
  generateComparativeChart(consolidatedReport);
  
  console.log('✅ Charts generation complete');
}

/**
 * Get all test reports of a specific type
 */
function getTestReports(prefix) {
  const reports = [];
  
  // Read all files in the results directory
  const files = fs.readdirSync(CONFIG.inputDir);
  
  for (const file of files) {
    if (file.startsWith(prefix) && file.endsWith('.json') && !file.includes('report')) {
      try {
        const reportPath = path.join(CONFIG.inputDir, file);
        const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        reports.push({
          filename: file,
          data: reportData
        });
      } catch (error) {
        console.warn(`⚠️ Failed to parse ${file}:`, error.message);
      }
    }
  }
  
  return reports;
}

/**
 * Generate system resource usage chart
 */
function generateSystemResourceChart(report) {
  console.log('📊 Generating system resource usage chart');
  
  // Extract CPU and memory usage over time
  const timestamps = report.systemStatsOverTime.map(stat => new Date(stat.timestamp).getTime());
  const cpuUsage = report.systemStatsOverTime.map(stat => stat.cpuLoad);
  const memoryUsage = report.systemStatsOverTime.map(stat => stat.memoryUsage.rss);
  
  // Create chart data
  const chartData = {
    title: 'System Resource Usage During Load Tests',
    xAxis: {
      title: 'Time',
      values: timestamps
    },
    series: [
      {
        name: 'CPU Load',
        data: cpuUsage,
        color: '#FF6384'
      },
      {
        name: 'Memory Usage (MB)',
        data: memoryUsage,
        color: '#36A2EB'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, 'system_resources.json');
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ System resource chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart('system_resources', chartData, 'line', true);
}

/**
 * Generate response time chart for a test type
 */
function generateResponseTimeChart(testReports, type) {
  console.log(`📊 Generating response time chart for ${type} tests`);
  
  // Extract concurrency levels and response times
  const concurrencyLevels = [];
  const avgResponseTimes = [];
  const p95ResponseTimes = [];
  
  for (const report of testReports) {
    // Extract concurrency level from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const concurrency = parseInt(match[1]);
      concurrencyLevels.push(concurrency);
      
      // Extract response times
      avgResponseTimes.push(report.data.avgResponseTime || 0);
      p95ResponseTimes.push(report.data.p95 || 0);
    }
  }
  
  // Sort by concurrency level
  const indices = concurrencyLevels.map((_, i) => i);
  indices.sort((a, b) => concurrencyLevels[a] - concurrencyLevels[b]);
  
  const sortedConcurrency = indices.map(i => concurrencyLevels[i]);
  const sortedAvgTimes = indices.map(i => avgResponseTimes[i]);
  const sortedP95Times = indices.map(i => p95ResponseTimes[i]);
  
  // Create chart data
  const chartData = {
    title: `${type.toUpperCase()} Response Times Under Load`,
    xAxis: {
      title: 'Concurrent Users/Requests',
      values: sortedConcurrency
    },
    series: [
      {
        name: 'Average Response Time (ms)',
        data: sortedAvgTimes,
        color: '#FF6384'
      },
      {
        name: '95th Percentile Response Time (ms)',
        data: sortedP95Times,
        color: '#36A2EB'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, `${type}_response_times.json`);
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ ${type} response time chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart(`${type}_response_times`, chartData, 'line');
}

/**
 * Generate throughput chart for a test type
 */
function generateThroughputChart(testReports, type) {
  console.log(`📊 Generating throughput chart for ${type} tests`);
  
  // Extract concurrency levels and throughput
  const concurrencyLevels = [];
  const throughputValues = [];
  
  for (const report of testReports) {
    // Extract concurrency level from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const concurrency = parseInt(match[1]);
      concurrencyLevels.push(concurrency);
      
      // Extract throughput
      throughputValues.push(report.data.throughput || 0);
    }
  }
  
  // Sort by concurrency level
  const indices = concurrencyLevels.map((_, i) => i);
  indices.sort((a, b) => concurrencyLevels[a] - concurrencyLevels[b]);
  
  const sortedConcurrency = indices.map(i => concurrencyLevels[i]);
  const sortedThroughput = indices.map(i => throughputValues[i]);
  
  // Create chart data
  const chartData = {
    title: `${type.toUpperCase()} Throughput (Requests/Second)`,
    xAxis: {
      title: 'Concurrent Users/Requests',
      values: sortedConcurrency
    },
    series: [
      {
        name: 'Throughput (req/sec)',
        data: sortedThroughput,
        color: '#4BC0C0'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, `${type}_throughput.json`);
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ ${type} throughput chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart(`${type}_throughput`, chartData, 'line');
}

/**
 * Generate error rate chart for a test type
 */
function generateErrorRateChart(testReports, type) {
  console.log(`📊 Generating error rate chart for ${type} tests`);
  
  // Extract concurrency levels and error rates
  const concurrencyLevels = [];
  const errorRates = [];
  
  for (const report of testReports) {
    // Extract concurrency level from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const concurrency = parseInt(match[1]);
      concurrencyLevels.push(concurrency);
      
      // Calculate error rate
      const totalRequests = report.data.totalRequests || 0;
      const failedRequests = report.data.failedRequests || 0;
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      
      errorRates.push(errorRate);
    }
  }
  
  // Sort by concurrency level
  const indices = concurrencyLevels.map((_, i) => i);
  indices.sort((a, b) => concurrencyLevels[a] - concurrencyLevels[b]);
  
  const sortedConcurrency = indices.map(i => concurrencyLevels[i]);
  const sortedErrorRates = indices.map(i => errorRates[i]);
  
  // Create chart data
  const chartData = {
    title: `${type.toUpperCase()} Error Rates Under Load`,
    xAxis: {
      title: 'Concurrent Users/Requests',
      values: sortedConcurrency
    },
    series: [
      {
        name: 'Error Rate (%)',
        data: sortedErrorRates,
        color: '#FF9F40'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, `${type}_error_rates.json`);
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ ${type} error rate chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart(`${type}_error_rates`, chartData, 'line');
}

/**
 * Generate queue depth chart
 */
function generateQueueDepthChart(queueTestReports) {
  console.log('📊 Generating queue depth chart');
  
  // Extract batch sizes and max queue depths
  const batchSizes = [];
  const maxQueueDepths = [];
  
  for (const report of queueTestReports) {
    // Extract batch size from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const batchSize = parseInt(match[1]);
      batchSizes.push(batchSize);
      
      // Extract max queue depth
      maxQueueDepths.push(report.data.maxQueueDepth || 0);
    }
  }
  
  // Sort by batch size
  const indices = batchSizes.map((_, i) => i);
  indices.sort((a, b) => batchSizes[a] - batchSizes[b]);
  
  const sortedBatchSizes = indices.map(i => batchSizes[i]);
  const sortedMaxQueueDepths = indices.map(i => maxQueueDepths[i]);
  
  // Create chart data
  const chartData = {
    title: 'Queue Depth Under Load',
    xAxis: {
      title: 'Concurrent Batches',
      values: sortedBatchSizes
    },
    series: [
      {
        name: 'Max Queue Depth',
        data: sortedMaxQueueDepths,
        color: '#9966FF'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, 'queue_depth.json');
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ Queue depth chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart('queue_depth', chartData, 'line');
}

/**
 * Generate queue success rate chart
 */
function generateQueueSuccessRateChart(queueTestReports) {
  console.log('📊 Generating queue success rate chart');
  
  // Extract batch sizes and success rates
  const batchSizes = [];
  const successRates = [];
  
  for (const report of queueTestReports) {
    // Extract batch size from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const batchSize = parseInt(match[1]);
      batchSizes.push(batchSize);
      
      // Calculate success rate
      const totalTrades = report.data.totalTrades || 0;
      const successfulTrades = report.data.successfulTrades || 0;
      const successRate = totalTrades > 0 ? (successfulTrades / totalTrades) * 100 : 0;
      
      successRates.push(successRate);
    }
  }
  
  // Sort by batch size
  const indices = batchSizes.map((_, i) => i);
  indices.sort((a, b) => batchSizes[a] - batchSizes[b]);
  
  const sortedBatchSizes = indices.map(i => batchSizes[i]);
  const sortedSuccessRates = indices.map(i => successRates[i]);
  
  // Create chart data
  const chartData = {
    title: 'Queue Processing Success Rate',
    xAxis: {
      title: 'Concurrent Batches',
      values: sortedBatchSizes
    },
    series: [
      {
        name: 'Success Rate (%)',
        data: sortedSuccessRates,
        color: '#4BC0C0'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, 'queue_success_rate.json');
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ Queue success rate chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart('queue_success_rate', chartData, 'line');
}

/**
 * Generate prediction consistency chart
 */
function generatePredictionConsistencyChart(mlTestReports) {
  console.log('📊 Generating prediction consistency chart');
  
  // Extract concurrency levels and consistency rates
  const concurrencyLevels = [];
  const consistencyRates = [];
  const confidenceRates = [];
  
  for (const report of mlTestReports) {
    // Extract concurrency level from filename
    const match = report.filename.match(/(\d+)_/);
    if (match) {
      const concurrency = parseInt(match[1]);
      concurrencyLevels.push(concurrency);
      
      // Extract consistency rate
      const consistencyRate = report.data.predictionConsistency?.consistencyRate || 0;
      consistencyRates.push(consistencyRate * 100);
      
      // Calculate high confidence rate
      const highConfidence = report.data.predictionQuality?.highConfidence || 0;
      const mediumConfidence = report.data.predictionQuality?.mediumConfidence || 0;
      const lowConfidence = report.data.predictionQuality?.lowConfidence || 0;
      const total = highConfidence + mediumConfidence + lowConfidence;
      
      const highConfidenceRate = total > 0 ? (highConfidence / total) * 100 : 0;
      confidenceRates.push(highConfidenceRate);
    }
  }
  
  // Sort by concurrency level
  const indices = concurrencyLevels.map((_, i) => i);
  indices.sort((a, b) => concurrencyLevels[a] - concurrencyLevels[b]);
  
  const sortedConcurrency = indices.map(i => concurrencyLevels[i]);
  const sortedConsistencyRates = indices.map(i => consistencyRates[i]);
  const sortedConfidenceRates = indices.map(i => confidenceRates[i]);
  
  // Create chart data
  const chartData = {
    title: 'ML Prediction Consistency and Confidence',
    xAxis: {
      title: 'Concurrent Requests',
      values: sortedConcurrency
    },
    series: [
      {
        name: 'Consistency Rate (%)',
        data: sortedConsistencyRates,
        color: '#FF6384'
      },
      {
        name: 'High Confidence Rate (%)',
        data: sortedConfidenceRates,
        color: '#36A2EB'
      }
    ]
  };
  
  // Save chart data to file
  const outputPath = path.join(CONFIG.outputDir, 'ml_consistency.json');
  fs.writeFileSync(outputPath, JSON.stringify(chartData, null, 2));
  
  console.log(`✅ ML prediction consistency chart data saved to ${outputPath}`);
  
  // Generate HTML chart visualization
  generateHtmlChart('ml_consistency', chartData, 'line');
}

/**
 * Generate comparative chart across all tests
 */
function generateComparativeChart(consolidatedReport) {
  console.log('📊 Generating comparative performance chart');
  
  // Extract key metrics from each test type
  const testNames = [];
  const successRates = [];
  const avgResponseTimes = [];
  const throughputs = [];
  
  // Extract data from test reports
  for (const [testName, testReport] of Object.entries(consolidatedReport.testReports)) {
    if (testReport.summary) {
      testNames.push(testName);
      
      // Find average success rate across concurrency levels
      const concurrencyLevels = Object.keys(testReport.summary).filter(k => k !== 'prioritization');
      let avgSuccessRate = 0;
      let avgResponseTime = 0;
      let avgThroughput = 0;
      let count = 0;
      
      for (const level of concurrencyLevels) {
        const metrics = testReport.summary[level];
        if (metrics) {
          avgSuccessRate += metrics.successRate || 0;
          avgResponseTime += metrics.avgResponseTime || 0;
          avgThroughput += metrics.throughput || 0;
          count++;
        }
      }
      
      if (count > 0) {
        successRates.push((avgSuccessRate / count) * 100);
        avgResponseTimes.push(avgResponseTime / count);
        throughputs.push(avgThroughput / count);
      } else {
        successRates.push(0);
        avgResponseTimes.push(0);
        throughputs.push(0);
      }
    }
  }
  
  // Create chart data for success rates
  const successRateChartData = {
    title: 'Success Rate Comparison Across Test Types',
    xAxis: {
      title: 'Test Type',
      values: testNames
    },
    series: [
      {
        name: 'Average Success Rate (%)',
        data: successRates,
        color: '#4BC0C0'
      }
    ]
  };
  
  // Create chart data for response times
  const responseTimeChartData = {
    title: 'Response Time Comparison Across Test Types',
    xAxis: {
      title: 'Test Type',
      values: testNames
    },
    series: [
      {
        name: 'Average Response Time (ms)',
        data: avgResponseTimes,
        color: '#FF6384'
      }
    ]
  };
  
  // Create chart data for throughput
  const throughputChartData = {
    title: 'Throughput Comparison Across Test Types',
    xAxis: {
      title: 'Test Type',
      values: testNames
    },
    series: [
      {
        name: 'Average Throughput (req/sec)',
        data: throughputs,
        color: '#36A2EB'
      }
    ]
  };
  
  // Save chart data to files
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'comparative_success_rates.json'),
    JSON.stringify(successRateChartData, null, 2)
  );
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'comparative_response_times.json'),
    JSON.stringify(responseTimeChartData, null, 2)
  );
  
  fs.writeFileSync(
    path.join(CONFIG.outputDir, 'comparative_throughput.json'),
    JSON.stringify(throughputChartData, null, 2)
  );
  
  console.log('✅ Comparative charts data saved');
  
  // Generate HTML chart visualizations
  generateHtmlChart('comparative_success_rates', successRateChartData, 'bar');
  generateHtmlChart('comparative_response_times', responseTimeChartData, 'bar');
  generateHtmlChart('comparative_throughput', throughputChartData, 'bar');
}

/**
 * Generate HTML chart visualization
 */
function generateHtmlChart(name, chartData, chartType = 'line', isDualAxis = false) {
  const chartFile = path.join(CONFIG.outputDir, `${name}.html`);
  
  let htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <title>${chartData.title}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
    }
    .chart-container {
      width: ${CONFIG.chartWidth}px;
      height: ${CONFIG.chartHeight}px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      color: #333;
    }
  </style>
</head>
<body>
  <h1>${chartData.title}</h1>
  <div class="chart-container">
    <canvas id="chart"></canvas>
  </div>
  
  <script>
    // Chart data
    const chartData = ${JSON.stringify(chartData)};
    
    // Create datasets
    const datasets = chartData.series.map((series, index) => {
      return {
        label: series.name,
        data: series.data,
        borderColor: series.color,
        backgroundColor: series.color + '33',
        borderWidth: 2,
        fill: ${chartType === 'area' ? 'true' : 'false'},
        ${isDualAxis && index === 1 ? 'yAxisID: "y2",' : ''}
        tension: 0.1
      };
    });
    
    // Create chart
    const ctx = document.getElementById('chart').getContext('2d');
    new Chart(ctx, {
      type: '${chartType === 'bar' ? 'bar' : 'line'}',
      data: {
        labels: chartData.xAxis.values,
        datasets: datasets
      },
      options: {
        responsive: true,
        scales: {
          x: {
            title: {
              display: true,
              text: chartData.xAxis.title
            }
          },
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: chartData.series[0].name
            }
          }
          ${isDualAxis ? `,
          y2: {
            beginAtZero: true,
            position: 'right',
            title: {
              display: true,
              text: chartData.series[1].name
            },
            grid: {
              drawOnChartArea: false
            }
          }` : ''}
        }
      }
    });
  </script>
</body>
</html>
  `;
  
  fs.writeFileSync(chartFile, htmlContent);
  console.log(`✅ Generated HTML chart: ${chartFile}`);
}

// Generate all charts
generateCharts();