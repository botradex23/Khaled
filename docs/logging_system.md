# ML Prediction System Logging Framework

## Overview

The ML Prediction System includes a comprehensive logging framework designed to track, monitor, and debug predictions during both live trading and historical validation. This documentation explains how to use the logging system effectively.

## Key Features

- **Consistent Format**: All logs use a standardized format with timestamps, log levels, and module context.
- **Multiple Log Levels**: Support for DEBUG, INFO, WARNING, ERROR, and CRITICAL log levels.
- **Log Rotation**: Logs are automatically rotated daily and by size to prevent excessive disk usage.
- **JSON Support**: Both traditional text logs (.log) and structured JSON logs (.json) are generated for easy parsing and analysis.
- **Component-Specific Loggers**: Dedicated loggers for each component of the ML prediction pipeline.
- **Structured Data Logging**: Support for logging complex data structures along with messages.

## Log Directory Structure

All logs are stored in the `logs/` directory. Each component has its own log files:

- `data_loader.log` / `data_loader.json`: Data fetching and processing logs
- `prediction_engine.log` / `prediction_engine.json`: Prediction process logs
- `model.log` / `model.json`: Model loading and operation logs
- `trading_bridge.log` / `trading_bridge.json`: Trading bridge integration logs
- `validation.log` / `validation.json`: Historical validation logs
- `binance_service.log` / `binance_service.json`: Binance API interaction logs

## How to Use the Logging System

### Basic Import and Setup

```python
# Import the logging utilities
from utils.logging_utils import get_data_loader_logger, log_with_data

# Get a logger for your component
logger = get_data_loader_logger()  # Or any other component-specific logger

# Log a simple message
logger.info("Starting data loading process")
logger.warning("Some indicators have NaN values")
logger.error("Failed to fetch data from Binance API")
```

### Logging with Structured Data

```python
# Import utilities
from utils.logging_utils import get_prediction_engine_logger, log_with_data
import logging

# Get the logger
logger = get_prediction_engine_logger()

# Log with structured data
prediction_data = {
    "symbol": "BTCUSDT",
    "prediction": "BUY",
    "confidence": 0.87,
    "current_price": 28250.75,
    "features": {
        "rsi_14": 32.5,
        "macd": 0.125
    }
}

log_with_data(logger, logging.INFO, "Prediction made: BUY with 87% confidence", prediction_data)
```

### Available Component Loggers

- `get_data_loader_logger()`: For the dataset loader component
- `get_prediction_engine_logger()`: For the ML prediction engine
- `get_model_logger()`: For model operations (loading, saving)
- `get_trading_bridge_logger()`: For the trading bridge component
- `get_validation_logger()`: For historical validation
- `get_binance_service_logger()`: For Binance API interactions

### Using the MLPredictionLogger Class

The `MLPredictionLogger` class provides a higher-level interface for logging predictions:

```python
from ml_prediction_engine_logger import MLPredictionLogger

# Log prediction start
MLPredictionLogger.log_prediction_start("BTCUSDT", "5m", "xgboost_btcusdt_balanced")

# Log data fetch
MLPredictionLogger.log_data_fetch("BTCUSDT", "5m", 120, 
                                ("2023-04-01T00:00:00", "2023-04-02T00:00:00"))

# Log features
features = {
    "rsi_14": 32.5,
    "macd": 0.125,
    "price_change_pct": -0.021
}
MLPredictionLogger.log_features_for_prediction("BTCUSDT", features)

# Log prediction result
MLPredictionLogger.log_prediction_result("BTCUSDT", "BUY", 0.87, 28250.75)

# Log errors
MLPredictionLogger.log_error("BTCUSDT", "API timeout", "ConnectionError", "data_fetch")
```

### Enhanced Historical Validation Logging

The `LogEnhancedValidator` class provides comprehensive logging for historical validation:

```python
from log_enhanced_validator import LogEnhancedValidator

validator = LogEnhancedValidator(
    model_name="xgboost_balanced_model",
    confidence_threshold=0.7
)

# Run validation with full logging
results = validator.validate_historical_predictions(
    symbol="BTCUSDT",
    interval="5m",
    start_date="2023-03-01",
    end_date="2023-03-10"
)
```

## Log Analysis

The logging system produces both human-readable `.log` files and machine-parseable `.json` files. To analyze JSON logs, you can use standard JSON parsing tools:

```python
import json

# Parse JSON logs
with open('logs/prediction_engine.json', 'r') as f:
    for line in f:
        log_entry = json.loads(line)
        # Process log entry as needed
        if 'prediction' in log_entry.get('extra', {}):
            print(f"Found prediction: {log_entry['extra']['prediction']}")
```

## Testing the Logging System

Run the test script to verify that the logging system is working properly:

```bash
python python_app/test_logging.py
```

This will generate sample logs for all components and demonstrate the logging functionality.

## Best Practices

1. **Use Appropriate Log Levels**:
   - DEBUG: Detailed information for debugging
   - INFO: General operational information
   - WARNING: Something unexpected but not an error
   - ERROR: Something failed but execution continues
   - CRITICAL: Fatal errors that prevent operation

2. **Include Contextual Information**:
   - Always include the symbol in trading-related logs
   - Include timestamps for time-sensitive operations
   - Log both inputs and outputs for important functions

3. **Structured Data**:
   - Use the `log_with_data()` function for complex data
   - Keep data structures consistent for easier parsing
   - Include all relevant metrics for analysis

4. **Error Logging**:
   - Always log exceptions with traceback information
   - Include context about what operation was attempted
   - Log both the error message and error type