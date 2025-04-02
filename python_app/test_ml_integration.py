#!/usr/bin/env python3
"""
ML Prediction System Integration Test

This script tests the direct Python integration of the ML prediction system
without using any HTTP APIs or Flask server.

Run this script directly to see the ML predictions in action.
"""

import os
import sys
import json
import logging
import time
from datetime import datetime
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the trading ML interface
from trading_ml import (
    get_prediction,
    get_trading_signal,
    get_batch_trading_signals
)

def test_prediction(symbol: str):
    """Test prediction for a symbol"""
    logger.info(f"Testing prediction for {symbol}...")
    
    # Get predictions using both models
    standard_prediction = get_prediction(symbol, "standard")
    balanced_prediction = get_prediction(symbol, "balanced")
    
    # Print the results
    print(f"\n=== {symbol} Prediction Results ===\n")
    print("Standard Model:")
    print(json.dumps(standard_prediction, indent=2))
    print("\nBalanced Model:")
    print(json.dumps(balanced_prediction, indent=2))
    
    # Compare the results
    standard_signal = standard_prediction.get('predicted_label', 'UNKNOWN')
    balanced_signal = balanced_prediction.get('predicted_label', 'UNKNOWN')
    standard_confidence = standard_prediction.get('confidence', 0)
    balanced_confidence = balanced_prediction.get('confidence', 0)
    
    print(f"\nComparison:")
    print(f"Standard Model: {standard_signal} with {standard_confidence:.2f} confidence")
    print(f"Balanced Model: {balanced_signal} with {balanced_confidence:.2f} confidence")
    
    if standard_signal == balanced_signal:
        print(f"Both models agree on {standard_signal} signal")
    else:
        print(f"Models disagree: Standard says {standard_signal}, Balanced says {balanced_signal}")

def test_trading_signal(symbol: str, confidence_threshold: float = 0.7):
    """Test the simplified trading signal interface"""
    logger.info(f"Testing trading signal for {symbol} with confidence threshold {confidence_threshold}...")
    
    # Get trading signals using both models
    standard_signal = get_trading_signal(symbol, "standard", confidence_threshold)
    balanced_signal = get_trading_signal(symbol, "balanced", confidence_threshold)
    
    # Print the results
    print(f"\n=== {symbol} Trading Signal Results ===\n")
    print("Standard Model:")
    print(json.dumps(standard_signal, indent=2))
    print("\nBalanced Model:")
    print(json.dumps(balanced_signal, indent=2))

def test_batch_predictions(symbols: List[str], confidence_threshold: float = 0.7):
    """Test batch predictions for multiple symbols"""
    logger.info(f"Testing batch predictions for {len(symbols)} symbols...")
    
    # Get batch trading signals using both models
    standard_signals = get_batch_trading_signals(symbols, "standard", confidence_threshold)
    balanced_signals = get_batch_trading_signals(symbols, "balanced", confidence_threshold)
    
    # Print the results
    print(f"\n=== Batch Trading Signals for {len(symbols)} Symbols ===\n")
    print("Standard Model:")
    print(json.dumps(standard_signals, indent=2))
    print("\nBalanced Model:")
    print(json.dumps(balanced_signals, indent=2))
    
    # Count signal types
    if standard_signals.get('success', False):
        standard_counts = {'BUY': 0, 'SELL': 0, 'HOLD': 0}
        for signal in standard_signals.get('signals', []):
            signal_type = signal.get('signal', 'HOLD')
            standard_counts[signal_type] = standard_counts.get(signal_type, 0) + 1
        
        print("\nStandard Model Signal Distribution:")
        print(json.dumps(standard_counts, indent=2))
    
    if balanced_signals.get('success', False):
        balanced_counts = {'BUY': 0, 'SELL': 0, 'HOLD': 0}
        for signal in balanced_signals.get('signals', []):
            signal_type = signal.get('signal', 'HOLD')
            balanced_counts[signal_type] = balanced_counts.get(signal_type, 0) + 1
        
        print("\nBalanced Model Signal Distribution:")
        print(json.dumps(balanced_counts, indent=2))

def main():
    """Run the ML prediction integration tests"""
    print("\n=== ML Prediction System Integration Test ===\n")
    print("This test demonstrates direct Python integration without using HTTP APIs.\n")
    
    # Test individual symbol predictions
    test_prediction("BTCUSDT")
    
    # Test trading signals
    test_trading_signal("ETHUSDT", 0.6)
    
    # Test batch predictions for multiple symbols
    top_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"]
    test_batch_predictions(top_symbols, 0.6)
    
    print("\n=== Test Completed Successfully ===\n")
    

if __name__ == "__main__":
    main()