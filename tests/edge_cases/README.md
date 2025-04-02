# Edge Case Testing Framework

## Purpose

This framework provides comprehensive testing for edge cases and exceptional conditions in the cryptocurrency trading platform. It is designed to ensure the system behaves correctly even when faced with unexpected inputs, service outages, or other abnormal conditions.

## Structure

The framework is organized into seven key testing categories:

```
tests/edge_cases/
├── api_failures/               # Tests for API timeouts, rate limits, connectivity issues
├── balance_issues/             # Tests for insufficient funds, leverage limits
├── duplicate_orders/           # Tests for duplicate signals, concurrent orders
├── invalid_inputs/             # Tests for malformed requests, invalid parameters
├── market_movements/           # Tests for slippage, volatility, price feed issues
├── permission_errors/          # Tests for authentication, authorization issues
├── service_downtime/           # Tests for recovery after outages, persistence
├── results/                    # Test execution results and reports
├── EDGE_CASE_TESTING_SUMMARY.md # Overview of all edge case tests
└── run_edge_case_tests.py      # Main script to run all or selected tests
```

## Running Tests

### Run All Test Categories

```bash
python tests/edge_cases/run_edge_case_tests.py
```

### Run Specific Category

```bash
python tests/edge_cases/run_edge_case_tests.py --category api
```

Available categories:
- `api` - API failures
- `inputs` - Invalid inputs
- `balance` - Balance/leverage issues
- `market` - Rapid market movements
- `duplicate` - Duplicate orders/signals
- `permission` - User permission errors
- `downtime` - Service downtime

### Run Individual Test Files

Each test file can be run directly:

```bash
python tests/edge_cases/api_failures/test_api_failures.py
```

## Expected Output

Test results are logged to:
1. Console output with colorized pass/fail indicators
2. JSON result file in `results/edge_case_results_TIMESTAMP.json`
3. Log file at `tests/edge_cases/edge_case_tests.log`

## Adding New Tests

To extend the framework with new test cases:

1. Identify the appropriate category for your test
2. Add a new test method to the relevant test class
3. Follow the existing pattern with proper assertions and error handling
4. Update the test suite to include your new test

Example:

```python
def test_new_edge_case(self):
    """Test description of what this tests"""
    # Setup
    
    # Action
    
    # Assertions
    self.assertEqual(expected, actual)
```

## Design Principles

1. **Comprehensive Coverage**: Test all possible edge cases and failure modes
2. **Isolation**: Each test should run independently without side effects
3. **Realistic Scenarios**: Tests should model real-world edge conditions
4. **Clear Feedback**: Test failures should provide actionable information
5. **Maintainability**: Keep tests modular and well-documented

## Dependencies

- Python 3.8+
- unittest (standard library)
- colorama (for colored console output)
- mock (for patching dependencies)

## Integration with CI/CD

These tests are designed to be included in the CI/CD pipeline:

1. Run on pull requests to detect regressions
2. Run nightly to ensure ongoing system resilience
3. Generate reports for review by development team