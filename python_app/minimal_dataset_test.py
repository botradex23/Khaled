#!/usr/bin/env python3
"""
Minimal Dataset Test

This script tests the dataset loader functionality by loading and displaying a small dataset
with technical indicators for a given cryptocurrency.
"""

import os
import sys
import json
import pandas as pd
from datetime import datetime

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the dataset loader
from data.dataset_loader import load_symbol_data

def print_dataframe_info(df, title="DataFrame Information"):
    """Print information about a DataFrame"""
    print("\n" + "=" * 80)
    print(f"{title}")
    print("=" * 80)
    
    print(f"Shape: {df.shape}")
    print(f"Timeframe: {df.index[0]} to {df.index[-1]}")
    print(f"Duration: {df.index[-1] - df.index[0]}")
    print(f"Number of rows: {len(df)}")
    
    print("\nFirst few rows:")
    print(df.head(3).to_string())
    
    print("\nLast few rows:")
    print(df.tail(3).to_string())
    
    print("\nColumn information:")
    for col in df.columns:
        non_null = df[col].count()
        null_pct = (len(df) - non_null) / len(df) * 100 if len(df) > 0 else 0
        print(f"- {col}: {non_null} non-null values ({null_pct:.2f}% missing)")
    
    print("\nColumn statistics:")
    numeric_cols = df.select_dtypes(include=['number']).columns
    for col in numeric_cols:
        print(f"- {col}: min={df[col].min():.4f}, max={df[col].max():.4f}, mean={df[col].mean():.4f}, std={df[col].std():.4f}")

def run_minimal_test(symbol="BTCUSDT", interval="1h", lookback="2d"):
    """Run a minimal test of the dataset loader"""
    print("=" * 80)
    print(f"TESTING DATASET LOADER WITH MINIMAL CONFIGURATION")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    print(f"\nTest configuration:")
    print(f"- Symbol: {symbol}")
    print(f"- Interval: {interval}")
    print(f"- Lookback period: {lookback}")
    
    # Load data with indicators
    print("\nLoading data with technical indicators...")
    try:
        df = load_symbol_data(
            symbol=symbol,
            interval=interval,
            lookback=lookback,
            drop_na=True
        )
        
        if df is None or df.empty:
            print("ERROR: Failed to load data")
            return False
        
        print(f"Successfully loaded data with {len(df)} rows and {len(df.columns)} columns")
        
        # Print dataframe info
        print_dataframe_info(df, f"Dataset for {symbol} ({interval})")
        
        # Save sample to file
        sample_file = f"sample_{symbol.lower()}_{interval}.json"
        sample_path = os.path.join(current_dir, "data", sample_file)
        
        # Convert to JSON
        sample_data = df.tail(10).reset_index()
        sample_data['timestamp'] = sample_data['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
        
        # Save to file
        with open(sample_path, 'w') as f:
            json.dump(json.loads(sample_data.to_json(orient='records')), f, indent=2)
        
        print(f"\nSaved sample data to: {sample_path}")
        
        return True
    
    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Parse command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Test dataset loader with minimal configuration')
    parser.add_argument('--symbol', type=str, default="BTCUSDT", help='Trading symbol (e.g., BTCUSDT)')
    parser.add_argument('--interval', type=str, default="1h", help='Timeframe interval (e.g., 5m, 1h, 1d)')
    parser.add_argument('--lookback', type=str, default="2d", help='Lookback period (e.g., 1d, 7d)')
    
    args = parser.parse_args()
    
    success = run_minimal_test(
        symbol=args.symbol,
        interval=args.interval,
        lookback=args.lookback
    )
    
    sys.exit(0 if success else 1)