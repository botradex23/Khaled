"""
CryptoTrade ML Model Training Script

This script trains machine learning models for cryptocurrency trading based on historical data.
It calculates technical indicators (RSI, EMA, MACD) and creates target labels based on future price movements.

Usage:
    python train_model.py --symbol BTCUSDT --threshold 2.0 --window 5 --interval 4h

Parameters:
    --symbol: Trading pair to train model for (e.g., BTCUSDT, ETHUSDT)
    --threshold: Price movement percentage to trigger Buy/Sell signals (default: 2.0)
    --window: Number of future candles to look ahead for labeling (default: 5)
    --interval: Timeframe for historical data (default: 4h)
"""

import os
import sys
import logging
import pickle
import argparse
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional, Union, Any

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, confusion_matrix
import xgboost as xgb

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    from config import active_config
    import requests
except ImportError:
    logging.error("Binance connector SDK not found. Please install it using 'pip install binance-connector'")
    sys.exit(1)
    
# Proxy configuration
USE_PROXY = active_config.USE_PROXY
PROXY_USERNAME = active_config.PROXY_USERNAME
PROXY_PASSWORD = active_config.PROXY_PASSWORD
PROXY_IP = active_config.PROXY_IP
PROXY_PORT = active_config.PROXY_PORT

# Configure proxy
if USE_PROXY:
    logging.info(f"Using proxy connection to Binance API via {PROXY_IP}:{PROXY_PORT}")
    proxies = {
        "http": f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_IP}:{PROXY_PORT}",
        "https": f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_IP}:{PROXY_PORT}"
    }
else:
    logging.info("Not using proxy for Binance API connection")
    proxies = None

# Helper function to fetch historical OHLCV data from Binance
def fetch_historical_data(symbol: str, interval: str = '4h', limit: int = 200) -> pd.DataFrame:
    """
    Fetch historical OHLCV (Open, High, Low, Close, Volume) data from Binance API.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        interval: Kline/Candlestick interval (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
        limit: Maximum number of records to fetch (max 1000)
        
    Returns:
        DataFrame with historical OHLCV data
    """
    try:
        logging.info(f"Fetching historical data for {symbol} ({interval} timeframe)")
        
        # Initialize Binance client
        # Check if API keys are available in environment
        api_key = os.environ.get('BINANCE_API_KEY')
        api_secret = os.environ.get('BINANCE_API_SECRET')
        
        # Create request kwargs with proxy settings if enabled
        kwargs = {}
        if USE_PROXY:
            kwargs['proxies'] = proxies
            kwargs['timeout'] = 30  # Extended timeout for proxy connections
            logging.info("Using configured proxy for Binance API request")
        
        if api_key and api_secret:
            logging.info("Using Binance API keys from environment")
            client = Spot(key=api_key, secret=api_secret, **kwargs)
        else:
            logging.info("No API keys found. Using public API endpoints")
            client = Spot(**kwargs)
        
        # Fetch klines (candlestick) data
        klines = client.klines(symbol=symbol, interval=interval, limit=limit)
        
        # Convert to DataFrame
        df = pd.DataFrame(klines, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # Convert types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
        
        # Set timestamp as index
        df.set_index('timestamp', inplace=True)
        
        logging.info(f"Successfully fetched {len(df)} records for {symbol}")
        return df
    
    except ClientError as e:
        logging.error(f"Binance API client error: {e}")
        raise
    except Exception as e:
        logging.error(f"Error fetching historical data: {e}")
        raise

# Calculate technical indicators
def add_technical_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Calculate technical indicators (RSI, EMA, MACD) and add them to the DataFrame.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        DataFrame with added technical indicators
    """
    # Make a copy of the DataFrame to avoid modifying the original
    df = df.copy()
    
    # Calculate RSI (14 periods)
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    # Handle the first 14 periods
    avg_gain.iloc[13] = gain.iloc[0:14].mean()
    avg_loss.iloc[13] = loss.iloc[0:14].mean()
    
    # Calculate subsequent values
    for i in range(14, len(df)):
        avg_gain.iloc[i] = (avg_gain.iloc[i-1] * 13 + gain.iloc[i]) / 14
        avg_loss.iloc[i] = (avg_loss.iloc[i-1] * 13 + loss.iloc[i]) / 14
    
    rs = avg_gain / avg_loss
    df['rsi_14'] = 100 - (100 / (1 + rs))
    
    # Calculate EMA (20 periods)
    df['ema_20'] = df['close'].ewm(span=20, adjust=False).mean()
    
    # Calculate MACD
    df['ema_12'] = df['close'].ewm(span=12, adjust=False).mean()
    df['ema_26'] = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = df['ema_12'] - df['ema_26']
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # Price relative to EMA (percentage)
    df['close_to_ema_20'] = (df['close'] / df['ema_20'] - 1) * 100
    
    # Volatility indicators
    df['atr_14'] = (
        df['high'].rolling(14).max() - df['low'].rolling(14).min()
    ) / df['close'].rolling(14).mean() * 100
    
    # Volume indicators
    df['volume_change'] = df['volume'].pct_change() * 100
    df['volume_ma_20'] = df['volume'].rolling(window=20).mean()
    df['volume_relative'] = df['volume'] / df['volume_ma_20']
    
    # Price changes
    df['daily_return'] = df['close'].pct_change() * 100
    df['weekly_return'] = df['close'].pct_change(5) * 100
    
    # Drop NaN values
    df = df.dropna()
    
    logging.info(f"Added technical indicators to DataFrame")
    return df

# Create target labels based on future price movement
def add_target_labels(df: pd.DataFrame, window: int = 5, threshold: float = 2.0) -> pd.DataFrame:
    """
    Add target labels based on future price movements.
    
    Args:
        df: DataFrame with OHLCV data
        window: Number of periods to look ahead
        threshold: Price movement percentage threshold for Buy/Sell signals
        
    Returns:
        DataFrame with target labels
    """
    df = df.copy()
    
    # Calculate future price movement
    future_close = df['close'].shift(-window)
    price_change_pct = (future_close - df['close']) / df['close'] * 100
    
    # Create target labels
    conditions = [
        price_change_pct > threshold,  # Price increases by more than threshold% -> BUY
        price_change_pct < -threshold, # Price decreases by more than threshold% -> SELL
    ]
    choices = [1, -1]  # 1 = BUY, -1 = SELL, 0 = HOLD
    df['target'] = np.select(conditions, choices, default=0)
    
    # Remove rows where we don't know the future price
    df = df.iloc[:-window]
    
    # Log class distribution
    class_counts = df['target'].value_counts()
    total = len(df)
    logging.info(f"Target class distribution:")
    for label, count in class_counts.items():
        label_name = "BUY" if label == 1 else "SELL" if label == -1 else "HOLD"
        logging.info(f"  {label_name}: {count} ({count/total*100:.2f}%)")
    
    return df

# Train XGBoost model
def train_model(df: pd.DataFrame, symbol: str) -> Tuple[xgb.XGBClassifier, StandardScaler, List[str]]:
    """
    Train an XGBoost classifier on the prepared data.
    
    Args:
        df: DataFrame with features and target labels
        symbol: Symbol name for logging purposes
        
    Returns:
        Tuple of (trained model, feature scaler, feature names)
    """
    # Separate features and target
    features = [
        'open', 'high', 'low', 'close', 'volume',
        'rsi_14', 'ema_20', 'macd', 'macd_signal', 'macd_hist',
        'close_to_ema_20', 'atr_14', 'volume_change', 'volume_relative',
        'daily_return', 'weekly_return'
    ]
    
    X = df[features]
    y = df['target']
    
    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train XGBoost model
    logging.info(f"Training XGBoost model for {symbol}...")
    model = xgb.XGBClassifier(
        objective='multi:softmax',
        num_class=3,  # SELL (-1), HOLD (0), BUY (1) - mapped to 0, 1, 2
        n_estimators=50,  # Reduced from 100
        learning_rate=0.1,
        max_depth=4,      # Reduced from 5
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        tree_method='hist'  # Faster training method
    )
    
    # Map target values (-1, 0, 1) to (0, 1, 2) for multi-class classification
    y_train_mapped = y_train.map({-1: 0, 0: 1, 1: 2})
    y_test_mapped = y_test.map({-1: 0, 0: 1, 1: 2})
    
    model.fit(
        X_train_scaled,
        y_train_mapped,
        eval_set=[(X_test_scaled, y_test_mapped)],
        eval_metric='mlogloss',
        early_stopping_rounds=10,
        verbose=True
    )
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    
    # Map predictions back to original labels for reporting
    y_pred_original = np.select([y_pred == 0, y_pred == 1, y_pred == 2], [-1, 0, 1])
    y_test_original = y_test.values
    
    # Print classification report
    logging.info(f"Classification Report for {symbol}:")
    target_names = ['SELL', 'HOLD', 'BUY']
    report = classification_report(y_test_original, y_pred_original, target_names=target_names)
    logging.info(f"\n{report}")
    
    # Print confusion matrix
    logging.info(f"Confusion Matrix for {symbol}:")
    cm = confusion_matrix(y_test_original, y_pred_original)
    logging.info(f"\n{cm}")
    
    # Feature importance
    logging.info(f"Feature Importance for {symbol}:")
    importance = model.feature_importances_
    for i, feature in enumerate(features):
        logging.info(f"  {feature}: {importance[i]:.4f}")
    
    return model, scaler, features

# Save the trained model, scaler, and features
def save_model(model: xgb.XGBClassifier, scaler: StandardScaler, features: List[str], symbol: str):
    """
    Save the trained model and associated metadata to disk.
    
    Args:
        model: Trained XGBoost model
        scaler: Feature scaler used during training
        features: List of feature names
        symbol: Symbol name for file naming
    """
    # Create directory if it doesn't exist
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    # Determine file path
    symbol_lower = symbol.lower()
    model_path = os.path.join(model_dir, f'model_{symbol_lower}.pkl')
    
    # Save model, scaler, and feature list
    with open(model_path, 'wb') as f:
        pickle.dump({
            'model': model,
            'scaler': scaler,
            'features': features,
            'trained_at': datetime.now().isoformat(),
            'symbol': symbol
        }, f)
    
    logging.info(f"Model saved to {model_path}")

# Main function
def create_dummy_model(symbol: str) -> Tuple[xgb.XGBClassifier, StandardScaler, List[str]]:
    """
    Create a dummy model for demonstration purposes if the real model cannot be trained.
    
    Args:
        symbol: Symbol name for logging purposes
        
    Returns:
        Tuple of (trained model, feature scaler, feature names)
    """
    logging.warning(f"Creating dummy model for {symbol} due to data access issues")
    
    # Define feature list (same as real model)
    features = [
        'open', 'high', 'low', 'close', 'volume',
        'rsi_14', 'ema_20', 'macd', 'macd_signal', 'macd_hist',
        'close_to_ema_20', 'atr_14', 'volume_change', 'volume_relative',
        'daily_return', 'weekly_return'
    ]
    
    # Create a minimal dataset for training
    np.random.seed(42)
    n_samples = 100
    X = np.random.randn(n_samples, len(features))
    y = np.random.choice([-1, 0, 1], size=n_samples, p=[0.3, 0.4, 0.3])
    
    # Create DataFrame with proper column names
    df_X = pd.DataFrame(X, columns=features)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        df_X, y, test_size=0.2, random_state=42
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    
    # Create and fit model
    model = xgb.XGBClassifier(
        objective='multi:softmax',
        num_class=3,
        n_estimators=10,
        max_depth=3,
        random_state=42
    )
    
    # Map labels for multi-class
    y_train_mapped = pd.Series(y_train).map({-1: 0, 0: 1, 1: 2})
    
    # Fit model
    model.fit(X_train_scaled, y_train_mapped)
    
    logging.warning(f"Dummy model created for {symbol} with {n_samples} synthetic data points")
    logging.warning("This model is for demonstration only and should not be used for real trading decisions")
    
    return model, scaler, features

def main():
    """
    Main function to parse arguments and run the training pipeline.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train ML model for cryptocurrency trading')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Trading pair symbol (e.g., BTCUSDT)')
    parser.add_argument('--threshold', type=float, default=2.0, help='Price movement threshold percentage')
    parser.add_argument('--window', type=int, default=5, help='Number of future candles to look ahead')
    parser.add_argument('--interval', type=str, default='4h', help='Timeframe for historical data')
    parser.add_argument('--dummy', action='store_true', help='Create dummy model if set')
    
    args = parser.parse_args()
    
    # If dummy flag is set, create a dummy model
    if args.dummy:
        try:
            model, scaler, features = create_dummy_model(args.symbol)
            save_model(model, scaler, features, args.symbol)
            logging.info(f"Successfully saved dummy model for {args.symbol} (FOR DEMONSTRATION ONLY)")
            return
        except Exception as e:
            logging.error(f"Error creating dummy model: {e}")
            raise
    
    try:
        # Fetch historical data
        df = fetch_historical_data(args.symbol, args.interval)
        
        # Add technical indicators
        df = add_technical_indicators(df)
        
        # Add target labels
        df = add_target_labels(df, args.window, args.threshold)
        
        # Train model
        model, scaler, features = train_model(df, args.symbol)
        
        # Save model
        save_model(model, scaler, features, args.symbol)
        
        logging.info(f"Successfully trained and saved model for {args.symbol}")
        
    except Exception as e:
        logging.error(f"Error during model training: {e}")
        logging.warning(f"Falling back to dummy model for {args.symbol}")
        
        try:
            model, scaler, features = create_dummy_model(args.symbol)
            save_model(model, scaler, features, args.symbol)
            logging.info(f"Successfully saved dummy model for {args.symbol} (FOR DEMONSTRATION ONLY)")
        except Exception as e2:
            logging.error(f"Error creating dummy model: {e2}")
            raise

# Entry point
if __name__ == "__main__":
    main()