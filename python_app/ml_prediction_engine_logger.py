#!/usr/bin/env python3
"""
ML Prediction Engine with Enhanced Logging

This module integrates the logging system with the ML prediction engine.
It provides a wrapper around prediction functions to add detailed logging.
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional, Union, Tuple

# Add parent directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import logging utilities
from utils.logging_utils import get_prediction_engine_logger, log_with_data

# Get logger for this module
logger = get_prediction_engine_logger()

class MLPredictionLogger:
    """
    Logging wrapper for ML predictions.
    This class provides methods to log various stages of the ML prediction process.
    """
    
    @staticmethod
    def log_prediction_start(symbol: str, interval: str, model_name: str) -> None:
        """
        Log the start of a prediction process
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '5m')
            model_name: Name of the model being used
        """
        data = {
            'symbol': symbol,
            'interval': interval,
            'model': model_name,
            'timestamp': datetime.now().isoformat()
        }
        log_with_data(logger, logging.INFO, f"Starting prediction for {symbol} using {model_name}", data)
    
    @staticmethod
    def log_data_fetch(symbol: str, interval: str, candle_count: int, time_range: Optional[Tuple[str, str]] = None) -> None:
        """
        Log details about data fetching for prediction
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '5m')
            candle_count: Number of candles fetched
            time_range: Optional tuple of (start_time, end_time) as ISO strings
        """
        data = {
            'symbol': symbol,
            'interval': interval,
            'candle_count': candle_count
        }
        
        if time_range:
            data['start_time'] = time_range[0]
            data['end_time'] = time_range[1]
        
        log_with_data(logger, logging.INFO, 
                     f"Fetched {candle_count} {interval} candles for {symbol}", data)
    
    @staticmethod
    def log_indicators_calculation(symbol: str, indicators_list: List[str], nas_count: int) -> None:
        """
        Log details about technical indicator calculation
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            indicators_list: List of indicators that were calculated
            nas_count: Count of NaN values in the dataset
        """
        data = {
            'symbol': symbol,
            'indicators': indicators_list,
            'indicator_count': len(indicators_list),
            'nan_values': nas_count
        }
        
        log_with_data(logger, logging.INFO, 
                     f"Calculated {len(indicators_list)} technical indicators for {symbol}", data)
    
    @staticmethod
    def log_features_for_prediction(symbol: str, features: Dict[str, float], feature_stats: Optional[Dict[str, Dict[str, float]]] = None) -> None:
        """
        Log the features that will be used for prediction
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            features: Dictionary of feature name to value
            feature_stats: Optional statistics about features (min, max, mean, etc.)
        """
        data = {
            'symbol': symbol,
            'features': features,
            'feature_count': len(features),
            'timestamp': datetime.now().isoformat()
        }
        
        if feature_stats:
            data['feature_stats'] = feature_stats
        
        log_with_data(logger, logging.INFO, 
                     f"Prepared {len(features)} features for prediction on {symbol}", data)
    
    @staticmethod
    def log_model_load(model_name: str, model_type: str, model_path: str) -> None:
        """
        Log details about model loading
        
        Args:
            model_name: Name of the model being loaded
            model_type: Type of model (e.g., 'XGBoost', 'RandomForest')
            model_path: Path to the model file
        """
        data = {
            'model_name': model_name,
            'model_type': model_type,
            'model_path': model_path,
            'timestamp': datetime.now().isoformat()
        }
        
        log_with_data(logger, logging.INFO, f"Loaded {model_type} model: {model_name}", data)
    
    @staticmethod
    def log_prediction_result(symbol: str, prediction: str, confidence: float, 
                             current_price: Optional[float] = None, 
                             predicted_movement: Optional[Dict[str, Any]] = None) -> None:
        """
        Log the prediction result
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            prediction: Prediction label (e.g., 'BUY', 'SELL', 'HOLD')
            confidence: Confidence score of the prediction (0-1)
            current_price: Optional current price of the asset
            predicted_movement: Optional details about predicted price movement
        """
        data = {
            'symbol': symbol,
            'prediction': prediction,
            'confidence': confidence,
            'timestamp': datetime.now().isoformat()
        }
        
        if current_price:
            data['current_price'] = current_price
        
        if predicted_movement:
            data['predicted_movement'] = predicted_movement
        
        log_with_data(logger, logging.INFO, 
                     f"Prediction for {symbol}: {prediction} with {confidence:.2%} confidence", data)
    
    @staticmethod
    def log_error(symbol: str, error_message: str, error_type: str, 
                 step: str, additional_info: Optional[Dict[str, Any]] = None) -> None:
        """
        Log an error during the prediction process
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            error_message: Error message
            error_type: Type of error
            step: Step in the prediction process where the error occurred
            additional_info: Optional additional information about the error
        """
        data = {
            'symbol': symbol,
            'error_message': str(error_message),
            'error_type': error_type,
            'step': step,
            'timestamp': datetime.now().isoformat()
        }
        
        if additional_info:
            data['additional_info'] = additional_info
        
        log_with_data(logger, logging.ERROR, 
                     f"Error during {step} for {symbol}: {error_type} - {error_message}", data)
    
    @staticmethod
    def log_prediction_complete(symbol: str, execution_time_ms: float) -> None:
        """
        Log the completion of the prediction process
        
        Args:
            symbol: Trading symbol (e.g., 'BTCUSDT')
            execution_time_ms: Execution time in milliseconds
        """
        data = {
            'symbol': symbol,
            'execution_time_ms': execution_time_ms,
            'timestamp': datetime.now().isoformat()
        }
        
        log_with_data(logger, logging.INFO, 
                     f"Prediction for {symbol} completed in {execution_time_ms:.2f}ms", data)

# Example usage
if __name__ == "__main__":
    # Sample usage
    symbol = "BTCUSDT"
    
    # Log prediction start
    MLPredictionLogger.log_prediction_start(symbol, "5m", "xgboost_btcusdt_balanced")
    
    # Log data fetch 
    MLPredictionLogger.log_data_fetch(symbol, "5m", 120, 
                                    (datetime.now().isoformat(), datetime.now().isoformat()))
    
    # Log indicators calculation
    indicators = ["rsi_14", "macd", "ema_20", "bb_upper", "bb_lower", "price_change_pct"]
    MLPredictionLogger.log_indicators_calculation(symbol, indicators, 10)
    
    # Log features for prediction
    features = {
        "rsi_14": 32.5,
        "macd": 0.125,
        "macd_signal": 0.089,
        "bb_upper": 28950.23,
        "bb_lower": 27850.45,
        "price_change_pct": -0.021
    }
    MLPredictionLogger.log_features_for_prediction(symbol, features)
    
    # Log model load
    MLPredictionLogger.log_model_load("xgboost_btcusdt_balanced", "XGBoost", 
                                     "models/xgboost_btcusdt_balanced.model")
    
    # Log prediction result
    MLPredictionLogger.log_prediction_result(symbol, "BUY", 0.87, 28250.75, 
                                           {"direction": "up", "expected_pct": 2.5})
    
    # Log prediction complete
    MLPredictionLogger.log_prediction_complete(symbol, 352.76)
    
    print("Prediction logging example complete. Check the logs directory for the output.")