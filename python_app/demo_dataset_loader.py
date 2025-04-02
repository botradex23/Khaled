#!/usr/bin/env python3
"""
Demo script for the dataset loader module.

This script demonstrates how to use the dataset loader to fetch historical data
from Binance and apply technical indicators for different symbols and timeframes.
"""

import os
import sys
import time
from datetime import datetime

# Add parent directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the dataset loader
from python_app.data.dataset_loader import load_symbol_data, DatasetLoader


def demo_basic_loading():
    """Demo basic usage of the dataset loader"""
    print("=== Basic Dataset Loading Demo ===")
    
    # 1. Load data for BTC with minimal lookback (5m interval, 30m lookback)
    print("\nLoading BTCUSDT data with minimal lookback...")
    df = load_symbol_data('BTCUSDT', lookback='30m')
    print(f"Loaded {len(df)} rows with {len(df.columns)} columns")
    
    # Print column names
    print("\nAvailable columns:")
    for col in sorted(df.columns):
        print(f"  - {col}")
    
    # Print sample data
    print("\nSample data (most recent 3 rows):")
    print(df.tail(3)[['open', 'high', 'low', 'close', 'volume', 'rsi_14', 'macd']].to_string())


def demo_multiple_symbols():
    """Demo loading data for multiple symbols"""
    print("\n=== Multiple Symbols Demo ===")
    
    # Load data for BTC and ETH with a very short lookback
    symbols = ['BTCUSDT', 'ETHUSDT']  # Reduced to just 2 symbols
    lookback = '30m'  # Very short lookback for quick testing
    
    for symbol in symbols:
        print(f"\nLoading {symbol} data with {lookback} lookback...")
        df = load_symbol_data(symbol, lookback=lookback)
        print(f"Loaded {len(df)} rows with {len(df.columns)} columns")
        
        # Print the latest price
        latest_price = df['close'].iloc[-1]
        print(f"Latest price for {symbol}: {latest_price:.2f}")
        
        # Print RSI
        latest_rsi = df['rsi_14'].iloc[-1]
        print(f"Latest RSI for {symbol}: {latest_rsi:.2f}")
        
        # Print MACD
        latest_macd = df['macd'].iloc[-1]
        print(f"Latest MACD for {symbol}: {latest_macd:.2f}")


def demo_timeframes():
    """Demo loading data for different timeframes"""
    print("\n=== Multiple Timeframes Demo ===")
    
    symbol = 'BTCUSDT'
    timeframes = ['1m', '5m', '15m']  # Using only short timeframes
    lookback = '30m'  # Very short lookback for quick testing
    
    for interval in timeframes:
        print(f"\nLoading {symbol} data with {interval} interval...")
        df = load_symbol_data(symbol, interval=interval, lookback=lookback)
        print(f"Loaded {len(df)} rows with {len(df.columns)} columns")
        
        # Print time range
        start_time = df.index[0]
        end_time = df.index[-1]
        print(f"Data spans from {start_time} to {end_time}")
        
        # Print latest price
        latest_price = df['close'].iloc[-1]
        print(f"Latest price: {latest_price:.2f}")


def demo_custom_time_range():
    """Demo loading data for a custom time range"""
    print("\n=== Custom Time Range Demo ===")
    
    symbol = 'BTCUSDT'
    interval = '5m'
    
    # Calculate timestamps for a very short period (just 1 hour)
    now = int(datetime.now().timestamp() * 1000)
    one_hour_ago = now - (1 * 60 * 60 * 1000)
    
    print(f"\nLoading {symbol} data from {datetime.fromtimestamp(one_hour_ago/1000)} to {datetime.fromtimestamp(now/1000)}...")
    df = load_symbol_data(
        symbol=symbol,
        interval=interval,
        start_time=one_hour_ago,
        end_time=now
    )
    print(f"Loaded {len(df)} rows with {len(df.columns)} columns")
    
    # Print time range
    start_time = df.index[0]
    end_time = df.index[-1]
    print(f"Data spans from {start_time} to {end_time}")


def main():
    """Run all demos"""
    start_time = time.time()
    
    # 1. Basic dataset loading
    demo_basic_loading()
    
    # 2. Multiple symbols
    demo_multiple_symbols()
    
    # 3. Different timeframes
    demo_timeframes()
    
    # 4. Custom time range
    demo_custom_time_range()
    
    # Print total execution time
    elapsed_time = time.time() - start_time
    print(f"\nTotal execution time: {elapsed_time:.2f} seconds")


if __name__ == "__main__":
    main()