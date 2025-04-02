#!/usr/bin/env python3
"""
ML Prediction Engine

A production-ready ML prediction engine that can be imported and used directly
within Python code without requiring HTTP API calls.

This module loads the XGBoost models and provides functions for making predictions
based on real-time data from the Binance SDK.
"""

import os
import sys
import json
import logging
import time
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Dict, List, Union, Optional, Tuple, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path to ensure all imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import XGBoost predictor
from predict_xgboost import XGBoostPredictor

# Import Binance SDK utilities
from services.binance.market_service import BinanceMarketService

class MLPredictionEngine:
    """ML Prediction Engine for cryptocurrency price predictions"""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize the ML Prediction Engine
        
        Args:
            model_dir: Directory containing the trained models
        """
        self.model_dir = model_dir or os.path.join(current_dir, 'models')
        logger.info(f"Initializing ML Prediction Engine with model directory: {self.model_dir}")
        
        # Initialize XGBoost predictor
        self.xgboost_predictor = XGBoostPredictor(model_dir=self.model_dir)
        
        # Initialize Binance market service
        self.market_service = BinanceMarketService()
        
        logger.info("ML Prediction Engine initialized successfully")
    
    def get_live_data(self, symbol: str, interval: str = '5m', limit: int = 100) -> pd.DataFrame:
        """
        Get live historical data for a symbol from Binance
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
            limit: Number of candles to retrieve
            
        Returns:
            DataFrame with historical data
        """
        try:
            # Use Binance SDK to get klines data
            klines = self.market_service.get_klines(symbol, interval, limit)
            
            # Convert to DataFrame
            df = pd.DataFrame(klines, columns=[
                'open_time', 'open', 'high', 'low', 'close', 'volume',
                'close_time', 'quote_asset_volume', 'number_of_trades',
                'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
            ])
            
            # Convert data types
            numeric_columns = ['open', 'high', 'low', 'close', 'volume', 
                              'quote_asset_volume', 'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume']
            
            for col in numeric_columns:
                df[col] = pd.to_numeric(df[col])
            
            # Convert timestamps to datetime
            df['open_time'] = pd.to_datetime(df['open_time'], unit='ms')
            df['close_time'] = pd.to_datetime(df['close_time'], unit='ms')
            
            # Set index to open_time
            df.set_index('open_time', inplace=True)
            
            logger.info(f"Retrieved {len(df)} candles for {symbol} at {interval} interval")
            return df
            
        except Exception as e:
            logger.error(f"Error getting live data for {symbol}: {e}", exc_info=True)
            return None
    
    def predict(self, 
                symbol: str, 
                model_type: str = 'balanced', 
                interval: str = '5m',
                limit: int = 100) -> Dict[str, Any]:
        """
        Make a prediction for a symbol using the specified model
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            model_type: Model type to use ('balanced' or 'standard')
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
            limit: Number of candles to retrieve
            
        Returns:
            Dictionary containing prediction results
        """
        try:
            # Standardize symbol format (ensure uppercase and no hyphen)
            symbol = symbol.upper().replace('-', '')
            
            # Get live data
            df = self.get_live_data(symbol, interval, limit)
            if df is None or len(df) < 30:  # Need enough data for indicators
                logger.error(f"Insufficient data for {symbol}")
                return {
                    'success': False,
                    'error': 'Insufficient historical data',
                    'symbol': symbol,
                    'timestamp': datetime.now().isoformat()
                }
            
            # Get current price from the latest candle
            current_price = float(df['close'].iloc[-1])
            
            # Make prediction using XGBoost predictor
            result = self.xgboost_predictor.predict_live(
                symbol=symbol,
                df=df,
                model_type=model_type
            )
            
            if not result:
                logger.error(f"Prediction failed for {symbol}")
                return {
                    'success': False,
                    'error': 'Prediction failed',
                    'symbol': symbol,
                    'timestamp': datetime.now().isoformat()
                }
            
            # Add current price and timestamp
            result['current_price'] = current_price
            result['timestamp'] = datetime.now().isoformat()
            result['success'] = True
            
            return result
        
        except Exception as e:
            logger.error(f"Error in prediction for {symbol}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'symbol': symbol,
                'timestamp': datetime.now().isoformat()
            }
    
    def batch_predict(self, 
                     symbols: List[str], 
                     model_type: str = 'balanced',
                     interval: str = '5m',
                     limit: int = 100) -> Dict[str, Any]:
        """
        Make predictions for multiple symbols
        
        Args:
            symbols: List of trading pairs
            model_type: Model type to use ('balanced' or 'standard')
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
            limit: Number of candles to retrieve
            
        Returns:
            Dictionary containing prediction results for all symbols
        """
        results = {
            'success': True,
            'predictions': [],
            'timestamp': datetime.now().isoformat(),
            'failed_symbols': []
        }
        
        for symbol in symbols:
            try:
                prediction = self.predict(symbol, model_type, interval, limit)
                if prediction['success']:
                    results['predictions'].append(prediction)
                else:
                    results['failed_symbols'].append({
                        'symbol': symbol,
                        'error': prediction.get('error', 'Unknown error')
                    })
            except Exception as e:
                logger.error(f"Error in batch prediction for {symbol}: {e}", exc_info=True)
                results['failed_symbols'].append({
                    'symbol': symbol,
                    'error': str(e)
                })
        
        # Set success flag based on whether we got any successful predictions
        if not results['predictions'] and results['failed_symbols']:
            results['success'] = False
            results['error'] = 'All predictions failed'
        
        return results


# Singleton instance for use across the application
_prediction_engine = None

def get_prediction_engine() -> MLPredictionEngine:
    """
    Get or create the ML Prediction Engine singleton instance
    
    Returns:
        The MLPredictionEngine instance
    """
    global _prediction_engine
    if _prediction_engine is None:
        _prediction_engine = MLPredictionEngine()
    return _prediction_engine


# Direct usage examples

def direct_predict(symbol: str, model_type: str = 'balanced') -> Dict[str, Any]:
    """
    Make a direct prediction for a symbol
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        model_type: Model type to use ('balanced' or 'standard')
        
    Returns:
        Dictionary containing prediction results
    """
    engine = get_prediction_engine()
    return engine.predict(symbol, model_type)


def direct_batch_predict(symbols: List[str], model_type: str = 'balanced') -> Dict[str, Any]:
    """
    Make direct predictions for multiple symbols
    
    Args:
        symbols: List of trading pairs
        model_type: Model type to use ('balanced' or 'standard')
        
    Returns:
        Dictionary containing prediction results for all symbols
    """
    engine = get_prediction_engine()
    return engine.batch_predict(symbols, model_type)


# Testing function
if __name__ == "__main__":
    # Test prediction for BTC
    print("Testing prediction for BTCUSDT...")
    result = direct_predict("BTCUSDT", "balanced")
    print(json.dumps(result, indent=2))
    
    # Test batch prediction
    print("\nTesting batch prediction for BTCUSDT, ETHUSDT, BNBUSDT...")
    batch_result = direct_batch_predict(["BTCUSDT", "ETHUSDT", "BNBUSDT"], "balanced")
    print(json.dumps(batch_result, indent=2))