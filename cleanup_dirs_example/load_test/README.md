# Load Testing System for Cryptocurrency Trading Platform

This directory contains a comprehensive load testing suite to evaluate the performance, reliability, and scalability of the cryptocurrency trading platform under various load conditions.

## Overview

The load testing system is designed to simulate real-world scenarios, including:

1. Multiple concurrent users accessing various API endpoints
2. High-volume trade execution through the trade execution queue
3. Intensive ML prediction requests for different cryptocurrencies and timeframes

## Directory Structure

- `load_tester.js` - General API load testing tool
- `queue_stress_test.js` - Trade execution queue testing tool
- `ml_prediction_test.js` - ML prediction service testing tool
- `run_load_tests.js` - Script to run all tests in sequence
- `system_check.js` - Pre-test system health checker
- `replit_adapter.js` - Adapts test parameters for Replit environment
- `generate_charts.js` - Generates visualization charts from test results
- `results/` - Directory for storing test results
- `charts/` - Directory for generated performance charts
- `LOAD_TEST_REPORT_TEMPLATE.md` - Template for creating load test reports

## Running Tests

You can run the tests using the provided shell script in the project root:

```bash
./run_load_tests.sh
```

Alternatively, you can run individual tests directly:

```bash
# Run general API load test
node load_test/load_tester.js

# Run trade execution queue test
node load_test/queue_stress_test.js

# Run ML prediction test
node load_test/ml_prediction_test.js

# Run all tests
node load_test/run_load_tests.js

# Generate charts from test results
node load_test/generate_charts.js
```

## Test Configuration

Each test script includes configurable parameters at the top of the file:

### General API Load Test

```javascript
// Configuration parameters
const CONCURRENT_USERS = [10, 50, 100, 200]; // Number of concurrent users to simulate
const TEST_DURATION = 60; // Test duration in seconds
const API_ENDPOINTS = [
  '/api/binance/market/prices',
  '/api/binance/market/24hr',
  '/api/trading-bots/status',
  // Add more endpoints as needed
];
```

### Trade Execution Queue Test

```javascript
// Configuration parameters
const CONCURRENT_BATCHES = [5, 10, 20, 50]; // Number of concurrent trade batches
const TRADES_PER_BATCH = 10; // Number of trades per batch
const TEST_DURATION = 120; // Test duration in seconds
const TRADE_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOGEUSDT'];
```

### ML Prediction Test

```javascript
// Configuration parameters
const CONCURRENT_REQUESTS = [10, 20, 50, 100]; // Number of concurrent prediction requests
const TEST_DURATION = 90; // Test duration in seconds
const PREDICTION_TYPES = ['price', 'trend', 'signal'];
const TIMEFRAMES = ['1h', '4h', '1d'];
```

## Understanding Test Results

Each test generates results in JSON format with the following metrics:

- **Response Time**: Average, minimum, maximum, and percentiles (p50, p95, p99)
- **Throughput**: Requests per second
- **Success Rate**: Percentage of successful requests
- **Error Rate**: Percentage and types of errors
- **Resource Utilization**: CPU and memory usage during the test

## Generating Reports

After running tests, you can generate a comprehensive report using the provided template:

1. Copy `LOAD_TEST_REPORT_TEMPLATE.md` to create a new report
2. Fill in the test results and observations
3. Add the generated charts from the `charts/` directory

## Troubleshooting

If tests fail to run or produce unexpected results, check the following:

1. Ensure the application is running (`npm run dev`)
2. Verify that all required services are accessible
3. Check for sufficient system resources
4. Examine `system_check.js` output for any identified issues

## Best Practices

1. **Run tests in isolation**: Avoid running other resource-intensive processes during testing
2. **Start with low concurrency**: Begin with smaller loads and gradually increase
3. **Monitor system resources**: Keep an eye on CPU, memory, and network utilization
4. **Test regularly**: Run load tests after significant changes to detect performance regressions
5. **Compare results**: Maintain a history of test results to track performance over time