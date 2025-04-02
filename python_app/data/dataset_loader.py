#!/usr/bin/env python3
"""
Dataset Loader for Cryptocurrency Trading Models

This module provides functionality to load and preprocess historical OHLCV data
for any cryptocurrency trading pair from Binance. It applies the same technical
indicators and preprocessing steps used during model training to ensure consistency.

The processed data can be used for:
1. Training new ML models
2. Making predictions with existing models
3. Backtesting trading strategies
"""

import os
import sys
import time
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Union, Any, Tuple

# Add parent directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)  # python_app directory
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import logging utilities
try:
    from utils.logging_utils import get_data_loader_logger, log_with_data
    logger = get_data_loader_logger()
except ImportError:
    # Fallback to basic logging if utils module is not available
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    logger.warning("Could not import custom logging utilities. Using basic logging configuration.")

# Add parent directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import Binance market service
try:
    from python_app.services.binance.market_service import BinanceMarketService
except ImportError:
    # Try relative import if the absolute import fails
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from services.binance.market_service import BinanceMarketService


class DatasetLoader:
    """
    Dataset loader for cryptocurrency trading data.
    Fetches historical OHLCV data from Binance and applies technical indicators.
    """

    def __init__(self, cache_dir: str = None):
        """
        Initialize the dataset loader.
        
        Args:
            cache_dir: Directory to store raw data cache files
        """
        self.market_service = BinanceMarketService()
        
        # Set up cache directory
        if cache_dir is None:
            self.cache_dir = os.path.join(current_dir, 'raw')
        else:
            self.cache_dir = cache_dir
            
        # Create cache directory if it doesn't exist
        os.makedirs(self.cache_dir, exist_ok=True)
        
        logger.info(f"Dataset loader initialized with cache directory: {self.cache_dir}")
    
    def _convert_lookback_to_milliseconds(self, lookback: str) -> int:
        """
        Convert a lookback period string to milliseconds.
        
        Args:
            lookback: Lookback period as string (e.g., '7d', '24h', '1000m')
            
        Returns:
            Lookback period in milliseconds
        """
        unit = lookback[-1].lower()
        value = int(lookback[:-1])
        
        if unit == 'd':
            return value * 24 * 60 * 60 * 1000
        elif unit == 'h':
            return value * 60 * 60 * 1000
        elif unit == 'm':
            return value * 60 * 1000
        else:
            # Default to interpreting as number of candles
            # For this, we need to convert based on the interval
            # This will be handled in fetch_historical_data
            return value
    
    def _get_interval_in_milliseconds(self, interval: str) -> int:
        """
        Convert an interval string to milliseconds.
        
        Args:
            interval: Interval string (e.g., '1m', '5m', '1h', '1d')
            
        Returns:
            Interval in milliseconds
        """
        unit = interval[-1].lower()
        value = int(interval[:-1]) if len(interval) > 1 else 1
        
        if unit == 'm':
            return value * 60 * 1000
        elif unit == 'h':
            return value * 60 * 60 * 1000
        elif unit == 'd':
            return value * 24 * 60 * 60 * 1000
        elif unit == 'w':
            return value * 7 * 24 * 60 * 60 * 1000
        else:
            raise ValueError(f"Unsupported interval unit: {unit}")

    def fetch_historical_data(self, 
                            symbol: str, 
                            interval: str = "5m",
                            lookback: str = "7d",
                            start_time: Optional[int] = None,
                            end_time: Optional[int] = None,
                            max_retries: int = 3,
                            retry_delay: int = 2) -> pd.DataFrame:
        """
        Fetch historical OHLCV data from Binance.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '1m', '5m', '1h', '1d')
            lookback: Lookback period as string (e.g., '7d', '24h', '1000m')
                     If numeric without unit, interpreted as number of candles
            start_time: Start time in milliseconds (optional)
            end_time: End time in milliseconds (optional)
            max_retries: Maximum number of API call retries
            retry_delay: Delay between retries in seconds
            
        Returns:
            DataFrame with historical OHLCV data
        """
        # Standardize symbol format
        symbol = symbol.replace('-', '').upper()
        
        # Calculate start and end times if not provided
        now = int(datetime.now().timestamp() * 1000)
        
        if end_time is None:
            end_time = now
        
        if start_time is None:
            # Check if lookback is in units or just a number
            if lookback[-1].isdigit():
                # It's a number of candles
                num_candles = int(lookback)
                # Get the interval in milliseconds
                interval_ms = self._get_interval_in_milliseconds(interval)
                # Calculate start time based on number of candles
                start_time = end_time - (num_candles * interval_ms)
            else:
                # It's a time period
                lookback_ms = self._convert_lookback_to_milliseconds(lookback)
                start_time = end_time - lookback_ms
        
        logger.info(f"Fetching {interval} data for {symbol} from {datetime.fromtimestamp(start_time/1000)} to {datetime.fromtimestamp(end_time/1000)}")
        
        # Binance has a limit of 1000 candles per request, so we may need multiple requests
        max_limit = 1000
        all_candles = []
        current_start_time = start_time
        
        while current_start_time < end_time:
            for attempt in range(max_retries):
                try:
                    # Calculate how many candles we need
                    interval_ms = self._get_interval_in_milliseconds(interval)
                    candles_needed = min(max_limit, (end_time - current_start_time) // interval_ms + 1)
                    
                    logger.info(f"Requesting {candles_needed} candles from {datetime.fromtimestamp(current_start_time/1000)}")
                    
                    # Fetch data from Binance
                    candles = self.market_service.get_klines(
                        symbol=symbol,
                        interval=interval,
                        limit=candles_needed,
                        startTime=current_start_time,
                        endTime=end_time
                    )
                    
                    if not candles:
                        logger.warning(f"No data returned for {symbol} at {interval} from {datetime.fromtimestamp(current_start_time/1000)}")
                        break
                    
                    all_candles.extend(candles)
                    
                    # Update start time for next request
                    last_candle_time = candles[-1][0]  # Open time of last candle
                    current_start_time = last_candle_time + interval_ms
                    
                    logger.info(f"Retrieved {len(candles)} candles, new start time: {datetime.fromtimestamp(current_start_time/1000)}")
                    
                    # If we got fewer candles than requested, we've reached the end
                    if len(candles) < candles_needed:
                        current_start_time = end_time  # This will exit the outer loop
                    
                    # Throttle to avoid hitting rate limits
                    time.sleep(0.5)
                    break
                    
                except Exception as e:
                    logger.error(f"Error fetching data (attempt {attempt+1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(retry_delay)
                    else:
                        logger.error(f"Failed to fetch data after {max_retries} attempts")
                        raise
        
        # Convert to DataFrame
        if not all_candles:
            logger.error(f"No data retrieved for {symbol} at {interval}")
            return pd.DataFrame()
        
        df = pd.DataFrame(all_candles, columns=[
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
        
        # Cache the raw data
        cache_file = os.path.join(self.cache_dir, f"{symbol}_{interval}_{int(time.time())}.csv")
        df.to_csv(cache_file)
        logger.info(f"Cached raw data to {cache_file}")
        
        return df
    
    def apply_indicators(self, df: pd.DataFrame, drop_na: bool = False) -> pd.DataFrame:
        """
        Apply technical indicators to the OHLCV data.
        
        Args:
            df: DataFrame with OHLCV data
            drop_na: Whether to drop rows with NaN values (default: False)
                     Set to False to keep rows with partial indicators for small datasets
            
        Returns:
            DataFrame with added technical indicators
        """
        if df.empty:
            logger.error("Cannot apply indicators to empty DataFrame")
            return df
        
        logger.info(f"Applying technical indicators to DataFrame with {len(df)} rows")
        
        # Create a copy to avoid modifying the original
        processed_df = df.copy()
        
        try:
            # Calculate how many periods we have to determine which indicators to apply
            periods = len(processed_df)
            logger.info(f"Available periods: {periods}")
            
            # Simple Moving Averages (only calculate if we have enough data)
            if periods >= 5:
                processed_df['sma_5'] = processed_df['close'].rolling(window=5).mean()
            if periods >= 10:
                processed_df['sma_10'] = processed_df['close'].rolling(window=10).mean()
            if periods >= 20:
                processed_df['sma_20'] = processed_df['close'].rolling(window=20).mean()
            if periods >= 50:
                processed_df['sma_50'] = processed_df['close'].rolling(window=50).mean()
            if periods >= 100:
                processed_df['sma_100'] = processed_df['close'].rolling(window=100).mean()
            
            # Exponential Moving Averages
            processed_df['ema_5'] = processed_df['close'].ewm(span=5, adjust=False).mean()
            processed_df['ema_10'] = processed_df['close'].ewm(span=10, adjust=False).mean()
            processed_df['ema_20'] = processed_df['close'].ewm(span=20, adjust=False).mean()
            if periods >= 50:
                processed_df['ema_50'] = processed_df['close'].ewm(span=50, adjust=False).mean()
            if periods >= 100:
                processed_df['ema_100'] = processed_df['close'].ewm(span=100, adjust=False).mean()
            
            # RSI (14 periods)
            if periods >= 15:  # Need at least 15 periods for meaningful RSI (14 + 1 for diff)
                delta = processed_df['close'].diff()
                gain = delta.where(delta > 0, 0)
                loss = -delta.where(delta < 0, 0)
                avg_gain = gain.rolling(window=min(14, periods-1)).mean()
                avg_loss = loss.rolling(window=min(14, periods-1)).mean()
                rs = avg_gain / avg_loss
                processed_df['rsi_14'] = 100 - (100 / (1 + rs))
            else:
                # Use a shorter window if we don't have enough data
                window = max(5, periods // 2)
                if window >= 2 and periods > window:
                    delta = processed_df['close'].diff()
                    gain = delta.where(delta > 0, 0)
                    loss = -delta.where(delta < 0, 0)
                    avg_gain = gain.rolling(window=window).mean()
                    avg_loss = loss.rolling(window=window).mean()
                    rs = avg_gain / avg_loss
                    processed_df[f'rsi_{window}'] = 100 - (100 / (1 + rs))
                    # Rename to expected column name for consistency
                    processed_df['rsi_14'] = processed_df[f'rsi_{window}']
                else:
                    # Create a placeholder RSI column (middle value)
                    processed_df['rsi_14'] = 50.0
            
            # MACD
            processed_df['ema_12'] = processed_df['close'].ewm(span=min(12, max(2, periods//2)), adjust=False).mean()
            processed_df['ema_26'] = processed_df['close'].ewm(span=min(26, max(4, periods//1.5)), adjust=False).mean()
            processed_df['macd'] = processed_df['ema_12'] - processed_df['ema_26']
            processed_df['macd_signal'] = processed_df['macd'].ewm(span=min(9, max(2, periods//3)), adjust=False).mean()
            processed_df['macd_hist'] = processed_df['macd'] - processed_df['macd_signal']
            
            # Bollinger Bands
            bb_window = min(20, max(5, periods//2))
            processed_df['bb_middle'] = processed_df['close'].rolling(window=bb_window).mean()
            processed_df['bb_std'] = processed_df['close'].rolling(window=bb_window).std()
            processed_df['bb_upper'] = processed_df['bb_middle'] + (processed_df['bb_std'] * 2)
            processed_df['bb_lower'] = processed_df['bb_middle'] - (processed_df['bb_std'] * 2)
            
            # ATR (14 periods)
            atr_window = min(14, max(2, periods//2))
            high_low = processed_df['high'] - processed_df['low']
            high_close = (processed_df['high'] - processed_df['close'].shift()).abs()
            low_close = (processed_df['low'] - processed_df['close'].shift()).abs()
            ranges = pd.concat([high_low, high_close, low_close], axis=1)
            true_range = ranges.max(axis=1)
            processed_df['atr_14'] = true_range.rolling(window=atr_window).mean()
            
            # ROC (Rate of Change)
            roc_window = min(5, max(1, periods//5))
            processed_df['roc_5'] = processed_df['close'].pct_change(periods=roc_window)
            if periods >= 10:
                processed_df['roc_10'] = processed_df['close'].pct_change(periods=min(10, max(2, periods//4)))
            else:
                processed_df['roc_10'] = processed_df['roc_5']  # Use shorter window as fallback
            if periods >= 20:
                processed_df['roc_20'] = processed_df['close'].pct_change(periods=min(20, max(4, periods//3)))
            else:
                processed_df['roc_20'] = processed_df['roc_5']  # Use shorter window as fallback
            
            # Stochastic Oscillator
            stoch_window = min(14, max(3, periods//2))
            processed_df['stoch_k'] = 100 * ((processed_df['close'] - processed_df['low'].rolling(window=stoch_window).min()) / 
                                        (processed_df['high'].rolling(window=stoch_window).max() - processed_df['low'].rolling(window=stoch_window).min()))
            processed_df['stoch_d'] = processed_df['stoch_k'].rolling(window=min(3, max(2, periods//10))).mean()
            
            # Price changes (for label creation if needed)
            # Future price is the price N periods ahead (defaults to the current price for the most recent candles)
            processed_df['future_price'] = processed_df['close'].shift(-1)
            processed_df['price_change_pct'] = (processed_df['future_price'] - processed_df['close']) / processed_df['close'] * 100
            
            # Replace NaN values in future_price and price_change_pct for most recent candle
            processed_df['future_price'] = processed_df['future_price'].fillna(processed_df['close'])
            processed_df['price_change_pct'] = processed_df['price_change_pct'].fillna(0)
            
            # Log statistics before potentially dropping NaN rows
            original_rows = len(processed_df)
            logger.info(f"Original DataFrame: {original_rows} rows")
            
            # For the most recent periods where we have NaN values due to indicator calculations,
            # fill them with the most recent valid values or reasonable defaults
            columns_to_fill = processed_df.columns.difference(['open_time', 'open', 'high', 'low', 'close', 'volume'])
            processed_df[columns_to_fill] = processed_df[columns_to_fill].fillna(method='ffill')
            
            # Fill any remaining NaN values with reasonable defaults
            for col in processed_df.columns:
                if col.startswith('sma_') or col.startswith('ema_') or col.startswith('bb_middle'):
                    # For moving averages, use the close price
                    processed_df[col] = processed_df[col].fillna(processed_df['close'])
                elif col == 'rsi_14':
                    # For RSI, use middle value
                    processed_df[col] = processed_df[col].fillna(50.0)
                elif col.startswith('macd'):
                    # For MACD, use 0
                    processed_df[col] = processed_df[col].fillna(0.0)
                elif col.startswith('bb_std'):
                    # For Bollinger std, use a small percentage of close price
                    processed_df[col] = processed_df[col].fillna(processed_df['close'] * 0.01)
                elif col.startswith('bb_upper'):
                    # For upper band, use close price + 2%
                    processed_df[col] = processed_df[col].fillna(processed_df['close'] * 1.02)
                elif col.startswith('bb_lower'):
                    # For lower band, use close price - 2%
                    processed_df[col] = processed_df[col].fillna(processed_df['close'] * 0.98)
                elif col == 'atr_14':
                    # For ATR, use a small percentage of close price
                    processed_df[col] = processed_df[col].fillna(processed_df['close'] * 0.02)
                elif col.startswith('roc_'):
                    # For ROC, use 0
                    processed_df[col] = processed_df[col].fillna(0.0)
                elif col.startswith('stoch_'):
                    # For stochastics, use middle value
                    processed_df[col] = processed_df[col].fillna(50.0)
            
            # Optionally drop rows with NaN values
            if drop_na:
                before_rows = len(processed_df)
                processed_df = processed_df.dropna()
                after_rows = len(processed_df)
                logger.info(f"After dropping NaN rows: {after_rows} rows ({after_rows/before_rows*100:.2f}% remaining)")
            
            # Calculate and log some feature statistics
            logger.info(f"Feature statistics:")
            for col in ['close', 'rsi_14', 'macd', 'bb_upper', 'bb_lower', 'atr_14']:
                if col in processed_df.columns:
                    try:
                        logger.info(f"  {col}: min={processed_df[col].min():.2f}, max={processed_df[col].max():.2f}, mean={processed_df[col].mean():.2f}")
                    except:
                        logger.warning(f"  Could not calculate statistics for {col}")
            
            return processed_df
            
        except Exception as e:
            logger.error(f"Error applying indicators: {e}")
            raise
    
    def load_symbol_data(self, 
                        symbol: str, 
                        interval: str = "5m", 
                        lookback: str = "7d",
                        start_time: Optional[int] = None,
                        end_time: Optional[int] = None,
                        drop_na: bool = False,
                        additional_lookback: Optional[str] = None) -> pd.DataFrame:
        """
        Load OHLCV data for a symbol, apply indicators, and prepare for ML models.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '1m', '5m', '1h', '1d')
            lookback: Lookback period as string (e.g., '7d', '24h', '1000m')
            start_time: Start time in milliseconds (optional)
            end_time: End time in milliseconds (optional)
            drop_na: Whether to drop rows with NaN values (default: False)
            additional_lookback: Extra lookback period to ensure accurate indicator calculations
            
        Returns:
            Processed DataFrame ready for ML model input
        """
        logger.info(f"Loading data for {symbol} at {interval} interval with {lookback} lookback")
        
        # 1. Fetch historical data
        # If additional lookback is specified, extend the lookback period
        effective_lookback = lookback
        if additional_lookback:
            # Parse the lookback and additional lookback into timedeltas
            lookback_value = int(lookback[:-1])
            lookback_unit = lookback[-1]
            add_lookback_value = int(additional_lookback[:-1])
            add_lookback_unit = additional_lookback[-1]
            
            # Create a combined lookback string (simplified approach)
            if lookback_unit == add_lookback_unit:
                effective_lookback = f"{lookback_value + add_lookback_value}{lookback_unit}"
            else:
                logger.info(f"Using separate lookback periods: {lookback} + {additional_lookback}")
                # In case units differ, we'll just use the main lookback but log the situation
                effective_lookback = lookback
                
            logger.info(f"Extended lookback from {lookback} to {effective_lookback} for accurate indicator calculation")
            
        df = self.fetch_historical_data(
            symbol=symbol,
            interval=interval,
            lookback=effective_lookback,
            start_time=start_time,
            end_time=end_time
        )
        
        if df.empty:
            logger.error(f"Failed to fetch data for {symbol}")
            return pd.DataFrame()
        
        logger.info(f"Fetched {len(df)} candles for {symbol}")
        
        # 2. Apply technical indicators
        processed_df = self.apply_indicators(df, drop_na=drop_na)
        
        if processed_df.empty:
            logger.error(f"Failed to process data for {symbol}")
            return pd.DataFrame()
        
        logger.info(f"Processed {len(processed_df)} candles for {symbol}")
        
        return processed_df


# Singleton instance for use throughout the application
_dataset_loader = None

def get_dataset_loader() -> DatasetLoader:
    """
    Get or create the DatasetLoader singleton instance.
    
    Returns:
        The DatasetLoader instance
    """
    global _dataset_loader
    if _dataset_loader is None:
        _dataset_loader = DatasetLoader()
    return _dataset_loader


# Direct usage functions for convenience
def load_symbol_data(symbol: str, interval: str = "5m", lookback: str = "7d", 
                     start_time: Optional[int] = None, end_time: Optional[int] = None, 
                     drop_na: bool = False, additional_lookback: Optional[str] = None) -> pd.DataFrame:
    """
    Load OHLCV data for a symbol, apply indicators, and prepare for ML models.
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        interval: Timeframe interval (e.g., '1m', '5m', '1h', '1d')
        lookback: Lookback period as string (e.g., '7d', '24h', '1000m')
        start_time: Start time in milliseconds (optional)
        end_time: End time in milliseconds (optional)
        drop_na: Whether to drop rows with NaN values (default: False)
        additional_lookback: Extra lookback period to ensure accurate indicator calculations
        
    Returns:
        Processed DataFrame ready for ML model input
    """
    loader = get_dataset_loader()
    return loader.load_symbol_data(symbol, interval, lookback, start_time, end_time, drop_na, additional_lookback)


if __name__ == "__main__":
    # Simple demo to showcase functionality
    symbol = "BTCUSDT"
    interval = "5m"
    lookback = "1d"
    
    print(f"Loading data for {symbol} at {interval} interval with {lookback} lookback...")
    df = load_symbol_data(symbol, interval, lookback)
    
    if not df.empty:
        print(f"Loaded {len(df)} processed candles for {symbol}")
        print("\nColumn list:")
        for col in df.columns:
            print(f"- {col}")
        
        print("\nSample data:")
        print(df.tail().to_string())
    else:
        print(f"Failed to load data for {symbol}")