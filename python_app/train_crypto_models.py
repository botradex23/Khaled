"""
CryptoTrade ML Model Training Automation Script

This script trains machine learning models for multiple cryptocurrency trading pairs.
It uses the train_model.py script to train models for each specified symbol.

Usage:
    python train_crypto_models.py [--threshold 2.0] [--window 5] [--interval 4h]

Parameters:
    --threshold: Price movement percentage to trigger Buy/Sell signals (default: 2.0)
    --window: Number of future candles to look ahead for labeling (default: 5)
    --interval: Timeframe for historical data (default: 4h)
"""

import os
import sys
import logging
import subprocess
import argparse
from datetime import datetime
import time

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'model_training_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)

# Configure symbols to train models for
DEFAULT_SYMBOLS = ['BTCUSDT', 'ETHUSDT']

def train_model_for_symbol(symbol, threshold, window, interval, use_dummy=False):
    """
    Run the train_model.py script for a specific symbol.
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        threshold: Price movement threshold percentage
        window: Number of future candles to look ahead
        interval: Timeframe for historical data
        use_dummy: If True, create a dummy model instead of training a real one
    
    Returns:
        True if successful, False otherwise
    """
    try:
        if use_dummy:
            logging.info(f"Creating dummy model for {symbol}...")
        else:
            logging.info(f"Starting model training for {symbol}...")
        
        # Construct command to run train_model.py
        script_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'train_model.py')
        cmd = [
            sys.executable,
            script_path,
            f'--symbol={symbol}',
            f'--threshold={threshold}',
            f'--window={window}',
            f'--interval={interval}'
        ]
        
        # Add dummy flag if needed
        if use_dummy:
            cmd.append('--dummy')
        
        # Run the command
        logging.info(f"Executing command: {' '.join(cmd)}")
        start_time = time.time()
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Stream output in real-time
        for line in iter(process.stdout.readline, ''):
            logging.info(f"[{symbol}] {line.rstrip()}")
        
        # Get final output and error
        stdout, stderr = process.communicate()
        
        if process.returncode != 0:
            logging.error(f"Error training model for {symbol}: {stderr}")
            return False
        
        duration = time.time() - start_time
        logging.info(f"Successfully trained model for {symbol} in {duration:.2f} seconds")
        return True
    
    except Exception as e:
        logging.error(f"Error during training for {symbol}: {e}")
        return False

def main():
    """
    Main function to parse arguments and train models for all specified symbols.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Train ML models for multiple cryptocurrency trading pairs')
    parser.add_argument('--symbols', nargs='+', default=DEFAULT_SYMBOLS, help='List of trading pair symbols')
    parser.add_argument('--threshold', type=float, default=2.0, help='Price movement threshold percentage')
    parser.add_argument('--window', type=int, default=5, help='Number of future candles to look ahead')
    parser.add_argument('--interval', type=str, default='4h', help='Timeframe for historical data')
    parser.add_argument('--dummy', action='store_true', help='Create dummy models instead of training real ones')
    
    args = parser.parse_args()
    
    # Summary of training configuration
    logging.info("=" * 80)
    logging.info("CryptoTrade ML Model Training")
    logging.info("=" * 80)
    logging.info(f"Symbols: {args.symbols}")
    logging.info(f"Threshold: {args.threshold}%")
    logging.info(f"Window: {args.window} candles")
    logging.info(f"Interval: {args.interval}")
    logging.info(f"Dummy mode: {'Enabled' if args.dummy else 'Disabled'}")
    logging.info("-" * 80)
    
    # Train models for each symbol
    results = {}
    for symbol in args.symbols:
        success = train_model_for_symbol(symbol, args.threshold, args.window, args.interval, args.dummy)
        results[symbol] = "SUCCESS" if success else "FAILED"
    
    # Print summary of results
    logging.info("=" * 80)
    logging.info("Training Results")
    logging.info("=" * 80)
    for symbol, result in results.items():
        logging.info(f"{symbol}: {result}")
    
    # Check if any training failed
    if "FAILED" in results.values():
        logging.error("Some model training tasks failed. Check the logs for details.")
        sys.exit(1)
    else:
        logging.info("All model training tasks completed successfully!")
        sys.exit(0)

# Entry point
if __name__ == "__main__":
    main()