# ML Prediction System for Trading Bots

This directory contains the machine learning prediction system for cryptocurrency trading. The system is designed to be used directly by trading bots without requiring HTTP API calls.

## Key Components

### 1. ML Prediction Engine (`ml_prediction_engine.py`)
- Core prediction engine that loads the ML models and makes predictions
- Handles data fetching and processing from the Binance SDK
- Provides direct prediction functionality without requiring API calls

### 2. Trading ML Interface (`trading_ml.py`)
- Simplified interface for trading bots to use ML predictions
- Provides both detailed predictions and simplified trading signals
- Handles batch predictions for multiple symbols

### 3. ML Trading Bridge (`ml_trading_bridge.py`)
- High-level bridge between ML predictions and trading bots
- Handles caching of predictions to avoid unnecessary API calls
- Provides decision-making functions for opening and closing positions
- Recommends trading pairs based on ML predictions

### 4. Binance Market Service (`services/binance/market_service.py`)
- Fetches market data from Binance using the official SDK
- Handles proxy configuration for geo-restricted regions
- Provides a clean interface for market data access

### 5. XGBoost Predictor (`predict_xgboost.py`)
- Manages loading and using the trained XGBoost models
- Processes market data to create feature vectors
- Makes predictions with confidence scores

## Testing Scripts

1. **Test ML Integration** (`test_ml_integration.py`): Tests the direct Python integration without HTTP APIs
2. **Run ML System Test** (`run_ml_system_test.py`): Comprehensive test of the entire ML prediction system
3. **Demo Trading Bot** (`demo_trading_bot.py`): Demonstrates using ML predictions in a trading bot

## Usage

### Basic Prediction

```python
from ml_prediction_engine import direct_predict

# Make a prediction for a single symbol
result = direct_predict("BTCUSDT", model_type="balanced")
print(f"Prediction: {result['predicted_label']} with {result['confidence']:.2f} confidence")
```

### Using Trading ML Interface

```python
from trading_ml import get_trading_signal

# Get a simplified trading signal
signal = get_trading_signal("BTCUSDT", model_type="balanced", min_confidence=0.7)
print(f"Signal: {signal['signal']} with {signal['confidence']:.2f} confidence")
```

### Using ML Trading Bridge in a Bot

```python
from ml_trading_bridge import get_ml_trading_bridge

# Initialize the bridge
bridge = get_ml_trading_bridge()

# Check if a position should be opened
should_open, signal_info = bridge.should_open_position("BTCUSDT", "LONG")
if should_open:
    print("Open LONG position for BTCUSDT")
    
# Check if a position should be closed
should_close, signal_info = bridge.should_close_position("BTCUSDT", "LONG")
if should_close:
    print("Close LONG position for BTCUSDT")
    
# Get recommended trading pairs
recommended = bridge.get_recommended_pairs(["BTCUSDT", "ETHUSDT", "BNBUSDT"])
print(f"Recommended LONG pairs: {[s['symbol'] for s in recommended['long']]}")
print(f"Recommended SHORT pairs: {[s['symbol'] for s in recommended['short']]}")
```

## Model Types

The system supports two types of XGBoost models:

1. **Standard**: Trained on the original dataset with class weighting to address imbalance
2. **Balanced**: Trained on a balanced dataset using oversampling techniques

The balanced model is typically more sensitive to BUY/SELL signals, while the standard model is more conservative.