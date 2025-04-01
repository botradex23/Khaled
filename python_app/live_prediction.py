"""
Live Prediction Module for Cryptocurrency Trading Signals

This module provides real-time predictions using trained XGBoost models based on
the latest 5-minute candle data from Binance. It handles:

1. Fetching the most recent completed 5-minute candle for a symbol
2. Processing the data to calculate technical indicators
3. Making predictions using the balanced XGBoost model
4. Providing a complete prediction result with confidence scores

Functions:
- fetch_latest_candle: Gets the most recent complete 5-minute candle
- prepare_features: Calculates technical indicators needed for prediction
- make_live_prediction: Makes a prediction using the balanced model
- start_live_prediction_service: Runs continuous predictions (for background tasks)
"""

import os
import sys
import logging
import json
import time
from typing import Dict, Any, Optional, List, Tuple
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

# Add parent directory to path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'live_prediction.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

# Import necessary modules
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    from config import active_config
    from predict_xgboost import XGBoostPredictor
    
    # Create a singleton instance of the XGBoost predictor for reuse
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    predictor = XGBoostPredictor(model_dir)
    
except ImportError as e:
    logging.error(f"Required module not found: {e}")
    sys.exit(1)

def get_binance_client() -> Spot:
    """
    Create and configure a Binance client with appropriate settings.
    
    Returns:
        Configured Binance Spot client
    """
    # Setup proxy configuration if enabled
    proxies = {}
    if active_config.USE_PROXY:
        proxy_url = f"http://{active_config.PROXY_USERNAME}:{active_config.PROXY_PASSWORD}@{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        logging.info(f"Using proxy connection to Binance API via {active_config.PROXY_IP}:{active_config.PROXY_PORT}")

    client_options = {
        'base_url': active_config.BINANCE_TEST_URL if active_config.USE_BINANCE_TESTNET else active_config.BINANCE_BASE_URL,
        'timeout': 30,  # Extended timeout for API requests
        'proxies': proxies if active_config.USE_PROXY else None
    }
    
    # Always initialize the Binance Spot client for public data access
    # We don't need authentication for klines/candlestick data
    logging.info("Using public Binance API endpoints for market data")
    client = Spot(**client_options)
    
    return client

def fetch_latest_candle(symbol: str, interval: str = '5m') -> Optional[pd.DataFrame]:
    """
    Fetch the most recent completed candle for a symbol.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        interval: Candle timeframe (default: 5m)
        
    Returns:
        DataFrame with the most recent candle data or None if failed
    """
    try:
        client = get_binance_client()
        
        # Fetch the most recent candles (we'll extract the last complete one)
        klines = client.klines(symbol=symbol, interval=interval, limit=2)
        
        if not klines or len(klines) < 2:
            logging.error(f"Failed to fetch enough candles for {symbol}")
            return None
            
        # The second-to-last candle should be complete
        # (the last one is the current forming candle)
        complete_candle = klines[-2]
        
        # Create DataFrame with the complete candle
        columns = [
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ]
        
        df = pd.DataFrame([complete_candle], columns=columns)
        
        # Convert types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
        
        # Set timestamp as index
        df.set_index('timestamp', inplace=True)
        
        logging.info(f"Successfully fetched latest complete candle for {symbol} ({interval})")
        logging.info(f"Candle timestamp: {df.index[0]}")
        logging.info(f"Current time: {datetime.now()}")
        
        return df
        
    except ClientError as e:
        logging.error(f"Binance API client error: {e}")
        return None
    except Exception as e:
        logging.error(f"Error fetching latest candle: {e}")
        return None

def fetch_historical_candles(symbol: str, interval: str = '5m', limit: int = 100) -> Optional[pd.DataFrame]:
    """
    Fetch historical candles to calculate indicators that need historical data.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        interval: Candle timeframe (default: 5m)
        limit: Number of candles to fetch
        
    Returns:
        DataFrame with historical candle data or None if failed
    """
    try:
        client = get_binance_client()
        
        # Fetch historical candles
        klines = client.klines(symbol=symbol, interval=interval, limit=limit)
        
        if not klines:
            logging.error(f"Failed to fetch historical candles for {symbol}")
            return None
            
        # Create DataFrame with all candles
        columns = [
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ]
        
        df = pd.DataFrame(klines, columns=columns)
        
        # Convert types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
        
        # Set timestamp as index
        df.set_index('timestamp', inplace=True)
        
        logging.info(f"Successfully fetched {len(df)} historical candles for {symbol} ({interval})")
        
        return df
        
    except ClientError as e:
        logging.error(f"Binance API client error: {e}")
        return None
    except Exception as e:
        logging.error(f"Error fetching historical candles: {e}")
        return None

def prepare_features(candle_data: pd.DataFrame) -> Dict[str, Any]:
    """
    Calculate technical indicators for the candle data.
    
    Args:
        candle_data: DataFrame with OHLCV data
        
    Returns:
        Dictionary with feature values
    """
    # Make a copy of the DataFrame to avoid modifying the original
    df = candle_data.copy()
    
    # Get the latest values for basic OHLCV features
    latest = df.iloc[-1]
    features = {
        'open': float(latest['open']),
        'high': float(latest['high']),
        'low': float(latest['low']),
        'close': float(latest['close']),
        'volume': float(latest['volume']),
        # Add dummy values for features needed by the model but not available in real-time
        'future_price': float(latest['close']),  # In real-time, we don't know the future price
        'price_change_pct': 0.0,  # No price change prediction available
    }
    
    # Calculate SMA values
    for window in [5, 10, 20, 50, 100]:
        features[f'sma_{window}'] = float(df['close'].rolling(window=min(window, len(df))).mean().iloc[-1])
    
    # Calculate EMA values
    for window in [5, 10, 20, 50, 100]:
        features[f'ema_{window}'] = float(df['close'].ewm(span=window, adjust=False).mean().iloc[-1])
    
    # Calculate RSI (14 periods)
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    # Handle the first 14 periods
    if len(df) >= 14:
        avg_gain.iloc[13] = gain.iloc[0:14].mean()
        avg_loss.iloc[13] = loss.iloc[0:14].mean()
        
        # Calculate subsequent values
        for i in range(14, len(df)):
            avg_gain.iloc[i] = (avg_gain.iloc[i-1] * 13 + gain.iloc[i]) / 14
            avg_loss.iloc[i] = (avg_loss.iloc[i-1] * 13 + loss.iloc[i]) / 14
        
        rs = avg_gain / avg_loss
        features['rsi_14'] = float(100 - (100 / (1 + rs)).iloc[-1])
    else:
        # Not enough data for proper RSI calculation
        features['rsi_14'] = 50.0  # Neutral value
    
    # Calculate MACD
    features['ema_12'] = float(df['close'].ewm(span=12, adjust=False).mean().iloc[-1])
    features['ema_26'] = float(df['close'].ewm(span=26, adjust=False).mean().iloc[-1])
    features['macd'] = features['ema_12'] - features['ema_26']
    features['macd_signal'] = float(df['close'].ewm(span=12, adjust=False).mean().diff(periods=9).iloc[-1])
    features['macd_hist'] = features['macd'] - features['macd_signal']
    
    # Bollinger Bands
    features['bb_middle'] = float(df['close'].rolling(window=20).mean().iloc[-1])
    features['bb_std'] = float(df['close'].rolling(window=20).std().iloc[-1])
    features['bb_upper'] = features['bb_middle'] + (features['bb_std'] * 2)
    features['bb_lower'] = features['bb_middle'] - (features['bb_std'] * 2)
    
    # Average True Range (ATR)
    high_low = df['high'] - df['low']
    high_close = (df['high'] - df['close'].shift()).abs()
    low_close = (df['low'] - df['close'].shift()).abs()
    
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = ranges.max(axis=1)
    features['atr_14'] = float(true_range.rolling(14).mean().iloc[-1])
    
    # Price Rate of Change (ROC)
    features['roc_5'] = float(df['close'].pct_change(periods=5).iloc[-1] * 100)
    features['roc_10'] = float(df['close'].pct_change(periods=10).iloc[-1] * 100)
    features['roc_20'] = float(df['close'].pct_change(periods=20).iloc[-1] * 100)
    
    # Stochastic Oscillator
    low_14 = df['low'].rolling(window=14).min()
    high_14 = df['high'].rolling(window=14).max()
    features['stoch_k'] = float(100 * ((df['close'].iloc[-1] - low_14.iloc[-1]) / (high_14.iloc[-1] - low_14.iloc[-1])))
    features['stoch_d'] = float(df['close'].rolling(window=14).mean().iloc[-1])
    
    # Price relative to EMA (percentage)
    features['close_to_ema_20'] = (features['close'] / features['ema_20'] - 1) * 100
    
    # Volume indicators
    features['volume_change'] = float(df['volume'].pct_change().iloc[-1] * 100)
    features['volume_ma_20'] = float(df['volume'].rolling(window=20).mean().iloc[-1])
    features['volume_relative'] = features['volume'] / features['volume_ma_20']
    
    # Price changes
    features['daily_return'] = float(df['close'].pct_change().iloc[-1] * 100)
    features['weekly_return'] = float(df['close'].pct_change(5).iloc[-1] * 100)
    
    # Replace NaN with 0
    for key, value in features.items():
        if pd.isna(value):
            features[key] = 0.0
    
    return features

def make_live_prediction(symbol: str, model_type: str = 'balanced') -> Dict[str, Any]:
    """
    Make a real-time prediction using the latest candle data.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        model_type: Type of model to use ('balanced' or 'standard')
        
    Returns:
        Dictionary with prediction results
    """
    logging.info(f"Making live prediction for {symbol} using {model_type} model")
    
    # Format symbol (ensure uppercase without hyphens)
    symbol = symbol.replace('-', '').upper()
    
    # Make sure the model is loaded
    symbol_lower = symbol.lower()
    if not predictor.load_model(symbol_lower, model_type):
        logging.error(f"Failed to load {model_type} model for {symbol_lower}")
        return {
            'success': False,
            'error': f"Model not available for {symbol}",
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }
    
    # Fetch historical candles for technical indicators
    df = fetch_historical_candles(symbol, interval='5m', limit=100)
    if df is None or len(df) < 20:  # Need at least 20 candles for indicators
        logging.error(f"Insufficient historical data for {symbol}")
        return {
            'success': False,
            'error': "Insufficient historical data",
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }
    
    # Calculate features
    features = prepare_features(df)
    
    # Add missing features required by the model
    # Add future_price and price_change_pct if they're missing
    if 'future_price' not in features:
        features['future_price'] = features['close']  # Use current price as placeholder
        logging.info(f"Added missing feature 'future_price' with current price value")
    
    if 'price_change_pct' not in features:
        features['price_change_pct'] = 0.0  # Use 0 as placeholder for no price change
        logging.info(f"Added missing feature 'price_change_pct' with default value 0.0")
    
    # Make prediction using the model
    try:
        prediction_result = predictor.predict(features, symbol_lower, model_type)
        
        # If prediction result is None or prediction failed
        if not prediction_result or prediction_result.get('predicted_class') is None:
            return {
                'success': False,
                'error': "Prediction failed",
                'symbol': symbol,
                'timestamp': datetime.now().isoformat()
            }
        
        # Add extra information
        prediction_result['symbol'] = symbol
        prediction_result['model_type'] = model_type
        prediction_result['timestamp'] = datetime.now().isoformat()
        prediction_result['success'] = prediction_result['predicted_class'] is not None
        prediction_result['current_price'] = features['close']
        prediction_result['is_live_data'] = True
        
        # Include key indicators for reference
        prediction_result['indicators'] = {
            'rsi_14': features['rsi_14'],
            'ema_20': features['ema_20'],
            'macd': features['macd'],
            'macd_signal': features['macd_signal'],
            'macd_hist': features['macd_hist'],
            'bb_upper': features['bb_upper'],
            'bb_lower': features['bb_lower'],
            'stoch_k': features['stoch_k']
        }
        
        logging.info(f"Live prediction for {symbol}: {prediction_result['predicted_label']} with {prediction_result['confidence']:.4f} confidence")
        
        return prediction_result
        
    except Exception as e:
        logging.error(f"Error making prediction: {e}")
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }

def compare_live_predictions(symbol: str) -> Dict[str, Any]:
    """
    Make predictions using both standard and balanced models for comparison.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        
    Returns:
        Dictionary with prediction results from both models
    """
    logging.info(f"Comparing live predictions for {symbol} using both models")
    
    # Get predictions from both models
    standard_result = make_live_prediction(symbol, 'standard')
    balanced_result = make_live_prediction(symbol, 'balanced')
    
    # Combine results
    return {
        'success': standard_result['success'] and balanced_result['success'],
        'symbol': symbol,
        'compare': True,
        'timestamp': datetime.now().isoformat(),
        'predictions': {
            'standard': standard_result,
            'balanced': balanced_result
        }
    }

def start_live_prediction_service(symbol: str, interval_seconds: int = 300) -> None:
    """
    Start continuous live prediction service for a symbol.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        interval_seconds: Seconds between predictions (default: 5 minutes)
    """
    logging.info(f"Starting live prediction service for {symbol} at {interval_seconds}s intervals")
    
    try:
        # Initialize predictor and load models
        symbol_lower = symbol.lower()
        predictor.load_all_models(symbol_lower)
        
        while True:
            try:
                # Make prediction with both models
                result = compare_live_predictions(symbol)
                
                # Log the result
                if result['success']:
                    standard_signal = result['predictions']['standard']['predicted_label']
                    balanced_signal = result['predictions']['balanced']['predicted_label']
                    standard_conf = result['predictions']['standard']['confidence']
                    balanced_conf = result['predictions']['balanced']['confidence']
                    
                    logging.info(f"[{symbol}] Standard: {standard_signal} ({standard_conf:.2f}), Balanced: {balanced_signal} ({balanced_conf:.2f})")
                else:
                    logging.warning(f"[{symbol}] Prediction failed: {result.get('error', 'Unknown error')}")
                
                # Save results to a JSON file with timestamp
                output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data', 'live_predictions')
                os.makedirs(output_dir, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_file = os.path.join(output_dir, f"{symbol.lower()}_{timestamp}.json")
                
                with open(output_file, 'w') as f:
                    json.dump(result, f, indent=2)
                
            except Exception as e:
                logging.error(f"Error in prediction loop: {e}")
            
            # Wait for the next interval
            logging.info(f"Waiting {interval_seconds} seconds until next prediction")
            time.sleep(interval_seconds)
            
    except KeyboardInterrupt:
        logging.info("Live prediction service stopped by user")
    except Exception as e:
        logging.error(f"Live prediction service error: {e}")


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Live Prediction Service for BTCUSDT')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Symbol to predict (default: BTCUSDT)')
    parser.add_argument('--model', type=str, default='balanced', choices=['standard', 'balanced', 'compare'], 
                        help='Model type to use (default: balanced)')
    parser.add_argument('--interval', type=int, default=300, help='Seconds between predictions (default: 300)')
    parser.add_argument('--continuous', action='store_true', help='Run in continuous mode')
    
    args = parser.parse_args()
    
    if args.continuous:
        logging.info(f"Starting continuous prediction service for {args.symbol}")
        start_live_prediction_service(args.symbol, args.interval)
    else:
        if args.model == 'compare':
            result = compare_live_predictions(args.symbol)
        else:
            result = make_live_prediction(args.symbol, args.model)
        
        # Print the result
        print(json.dumps(result, indent=2))