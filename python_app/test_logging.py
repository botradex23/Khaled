#!/usr/bin/env python3
"""
Test script for the ML Prediction System logging utilities

This script demonstrates the use of our custom logging utilities across
different components of the ML prediction pipeline.
"""

import os
import sys
import time
import logging
from datetime import datetime

# Add the parent directory to the path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import our custom logging utilities
from utils.logging_utils import (
    setup_logger,
    log_with_data,
    get_data_loader_logger,
    get_prediction_engine_logger,
    get_model_logger,
    get_trading_bridge_logger,
    get_validation_logger,
    get_binance_service_logger
)

def simulate_data_loading():
    """Simulate data loading with logging"""
    logger = get_data_loader_logger()
    
    # Log standard messages
    logger.info("Starting data loading process")
    
    # Log with structured data
    symbol = 'BTCUSDT'
    interval = '5m'
    lookback = '7d'
    
    fetch_params = {
        'symbol': symbol,
        'interval': interval,
        'lookback': lookback,
        'start_time': int((datetime.now().timestamp() - 7 * 24 * 3600) * 1000),
        'end_time': int(datetime.now().timestamp() * 1000)
    }
    
    log_with_data(logger, logging.INFO, f"Fetching data for {symbol}", fetch_params)
    
    # Simulate processing time
    time.sleep(1)
    
    # Log indicator calculation
    indicators = {
        'rsi_14': True,
        'macd': True,
        'bollinger_bands': True,
        'ema_20': True,
        'sma_50': True
    }
    
    log_with_data(logger, logging.INFO, "Technical indicators calculated", {
        'symbol': symbol,
        'indicators': indicators,
        'rows_processed': 1000
    })
    
    # Log a warning
    logger.warning("Some indicators have NaN values at the beginning of the dataset")
    
    # Log completion
    logger.info("Data loading and processing complete")
    
    return True

def simulate_prediction():
    """Simulate model prediction with logging"""
    logger = get_prediction_engine_logger()
    model_logger = get_model_logger()
    
    # Log prediction start
    model_name = 'xgboost_btcusdt_balanced'
    symbol = 'BTCUSDT'
    
    log_with_data(logger, logging.INFO, f"Starting prediction for {symbol}", {
        'model': model_name,
        'timestamp': datetime.now().isoformat()
    })
    
    # Log model loading
    log_with_data(model_logger, logging.INFO, f"Loading model: {model_name}", {
        'model_path': f'models/{model_name}.model',
        'model_type': 'XGBoost'
    })
    
    # Simulate processing time
    time.sleep(0.5)
    
    # Log features
    features = {
        'rsi_14': 32.5,
        'macd': 0.125,
        'macd_signal': 0.089,
        'bb_upper': 28950.23,
        'bb_lower': 27850.45,
        'price_change_pct': -0.021
    }
    
    log_with_data(logger, logging.INFO, "Input features prepared for prediction", {
        'symbol': symbol,
        'features': features,
        'feature_count': len(features)
    })
    
    # Simulate processing time
    time.sleep(0.5)
    
    # Log prediction result
    prediction = {
        'label': 'BUY',
        'confidence': 0.87,
        'timestamp': datetime.now().isoformat(),
        'price': 28250.75
    }
    
    log_with_data(logger, logging.INFO, f"Prediction: {prediction['label']} with {prediction['confidence']:.2%} confidence", prediction)
    
    return prediction

def simulate_trading_action():
    """Simulate trading action based on prediction"""
    logger = get_trading_bridge_logger()
    
    # Log bridge action
    action_data = {
        'symbol': 'BTCUSDT',
        'prediction': 'BUY',
        'confidence': 0.87,
        'current_price': 28250.75,
        'timestamp': datetime.now().isoformat()
    }
    
    log_with_data(logger, logging.INFO, "ML prediction received by trading bridge", action_data)
    
    # Apply risk management rules
    risk_data = {
        'max_position_size': '0.01 BTC',
        'account_balance': '$5000 USD',
        'risk_per_trade': '1%',
        'stop_loss_pct': '2%',
        'take_profit_pct': '4%'
    }
    
    log_with_data(logger, logging.INFO, "Applying risk management rules", risk_data)
    
    # Simulate trade execution
    time.sleep(1)
    
    trade_data = {
        'type': 'MARKET',
        'direction': 'BUY',
        'symbol': 'BTCUSDT',
        'quantity': '0.01 BTC',
        'entry_price': 28250.75,
        'stop_loss': 27685.74,
        'take_profit': 29380.78,
        'timestamp': datetime.now().isoformat(),
        'trade_id': 'ML-BTC-12345'
    }
    
    log_with_data(logger, logging.INFO, "Trade executed based on ML prediction", trade_data)
    
    return trade_data

def simulate_validation():
    """Simulate historical validation"""
    logger = get_validation_logger()
    
    # Log validation start
    validation_params = {
        'model': 'xgboost_btcusdt_balanced',
        'symbol': 'BTCUSDT',
        'interval': '5m',
        'start_date': '2023-01-01',
        'end_date': '2023-01-31',
        'total_candles': 8640
    }
    
    log_with_data(logger, logging.INFO, "Starting historical prediction validation", validation_params)
    
    # Log progress
    for i in range(1, 5):
        progress = i * 25
        log_with_data(logger, logging.INFO, f"Validation progress: {progress}%", {
            'records_processed': progress * 86,
            'timestamp': datetime.now().isoformat()
        })
        time.sleep(0.5)
    
    # Log validation results
    results = {
        'total_predictions': 8640,
        'buy_signals': 125,
        'sell_signals': 142,
        'hold_signals': 8373,
        'accuracy': 0.876,
        'precision_buy': 0.83,
        'recall_buy': 0.79,
        'f1_score_buy': 0.81,
        'precision_sell': 0.85,
        'recall_sell': 0.82,
        'f1_score_sell': 0.83
    }
    
    log_with_data(logger, logging.INFO, "Validation complete", results)
    
    return results

def simulate_binance_service():
    """Simulate Binance service operations"""
    logger = get_binance_service_logger()
    
    # Log API connection
    connection_info = {
        'api_type': 'REST',
        'endpoint': 'api.binance.com',
        'using_proxy': True,
        'proxy_location': 'UK',
        'request_timeout': 30
    }
    
    log_with_data(logger, logging.INFO, "Connecting to Binance API", connection_info)
    
    # Log API requests
    for endpoint in ['klines', 'ticker/24hr', 'depth']:
        request_info = {
            'endpoint': endpoint,
            'method': 'GET',
            'params': {'symbol': 'BTCUSDT', 'interval': '5m', 'limit': 1000},
            'timestamp': datetime.now().isoformat()
        }
        
        log_with_data(logger, logging.INFO, f"Making API request to Binance: {endpoint}", request_info)
        time.sleep(0.3)
        
        # Log response
        response_info = {
            'endpoint': endpoint,
            'status_code': 200,
            'response_time_ms': 125 + (endpoint == 'depth') * 150,
            'data_size_bytes': 45000 + (endpoint == 'depth') * 100000
        }
        
        log_with_data(logger, logging.INFO, f"Received response from Binance: {endpoint}", response_info)
    
    # Log a rate limit warning
    log_with_data(logger, logging.WARNING, "Approaching Binance API rate limit", {
        'current_weight': 850,
        'weight_limit': 1200,
        'reset_time': (datetime.now().timestamp() + 60) * 1000
    })
    
    return True

def run_logging_demo():
    """Run the full logging demonstration"""
    print("Starting ML System Logging Demonstration")
    print("---------------------------------------")
    
    # Create logs directory
    logs_dir = os.path.join(os.path.dirname(current_dir), 'logs')
    os.makedirs(logs_dir, exist_ok=True)
    
    # Set up main logger
    main_logger = setup_logger('logging_demo', 'info', json_logging=True)
    main_logger.info("ML System logging demonstration started")
    
    # Step 1: Data Loading
    print("\n1. Simulating Data Loading...")
    simulate_data_loading()
    
    # Step 2: Model Prediction
    print("\n2. Simulating Model Prediction...")
    prediction = simulate_prediction()
    
    # Step 3: Trading Action
    print("\n3. Simulating Trading Action...")
    trade = simulate_trading_action()
    
    # Step 4: Historical Validation
    print("\n4. Simulating Historical Validation...")
    validation = simulate_validation()
    
    # Step 5: Binance Service
    print("\n5. Simulating Binance Service...")
    simulate_binance_service()
    
    # Summary
    main_logger.info("ML System logging demonstration completed")
    print("\nLogging Demonstration Complete!")
    print(f"Log files have been created in: {logs_dir}")
    print("Check the following log files:")
    print("  - data_loader.log / data_loader.json")
    print("  - prediction_engine.log / prediction_engine.json")
    print("  - model.log / model.json")
    print("  - trading_bridge.log / trading_bridge.json")
    print("  - validation.log / validation.json")
    print("  - binance_service.log / binance_service.json")
    print("  - logging_demo.log / logging_demo.json")

if __name__ == "__main__":
    run_logging_demo()