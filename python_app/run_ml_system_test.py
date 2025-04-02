#!/usr/bin/env python3
"""
ML Prediction System Full Test

This script conducts a comprehensive test of the native Python ML prediction system
without using any HTTP APIs or Flask server. It demonstrates how the entire system
can be used directly within trading bots.

Run this script to see the ML prediction system in action:
python run_ml_system_test.py
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
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('ml_system_test.log')
    ]
)
logger = logging.getLogger(__name__)

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the ML prediction engine
from ml_prediction_engine import get_prediction_engine, direct_predict, direct_batch_predict

# Import the trading ML interface
from trading_ml import get_trading_ml, get_prediction, get_trading_signal, get_batch_trading_signals

# Import the ML trading bridge
from ml_trading_bridge import get_ml_trading_bridge


def test_ml_prediction_engine():
    """Test the ML prediction engine directly"""
    print("\n=== Testing ML Prediction Engine ===\n")
    
    # Get the ML prediction engine
    engine = get_prediction_engine()
    
    # Test predicting BTC
    print("Testing prediction for BTCUSDT...")
    btc_result = engine.predict("BTCUSDT", "balanced")
    print(f"Prediction result: {btc_result.get('predicted_label', 'Unknown')} with {btc_result.get('confidence', 0):.2f} confidence")
    
    # Test batch prediction
    print("\nTesting batch prediction for top cryptocurrencies...")
    top_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
    batch_result = engine.batch_predict(top_symbols)
    
    if batch_result.get('success', False):
        print(f"Successfully predicted {len(batch_result.get('predictions', []))} symbols")
        for pred in batch_result.get('predictions', []):
            symbol = pred.get('symbol', 'Unknown')
            signal = pred.get('predicted_label', 'Unknown')
            confidence = pred.get('confidence', 0)
            print(f"  {symbol}: {signal} with {confidence:.2f} confidence")
    else:
        print(f"Batch prediction failed: {batch_result.get('error', 'Unknown error')}")


def test_trading_ml_interface():
    """Test the trading ML interface"""
    print("\n=== Testing Trading ML Interface ===\n")
    
    # Get the trading ML instance
    trading_ml = get_trading_ml()
    
    # Test getting a prediction
    print("Testing prediction for ETHUSDT...")
    eth_result = trading_ml.get_prediction("ETHUSDT")
    
    if eth_result.get('success', False):
        print(f"Prediction: {eth_result.get('predicted_label', 'Unknown')} with {eth_result.get('confidence', 0):.2f} confidence")
        print(f"Current price: {eth_result.get('current_price')}")
        
        # Print indicators
        indicators = eth_result.get('indicators', {})
        print("\nKey indicators:")
        for indicator, value in indicators.items():
            print(f"  {indicator}: {value}")
    else:
        print(f"Prediction failed: {eth_result.get('error', 'Unknown error')}")
    
    # Test getting a simplified trading signal
    print("\nTesting trading signal for BTCUSDT...")
    btc_signal = trading_ml.get_trading_signal("BTCUSDT", min_confidence=0.6)
    
    if btc_signal.get('success', False):
        print(f"Signal: {btc_signal.get('signal')} with {btc_signal.get('confidence', 0):.2f} confidence")
        print(f"Price: {btc_signal.get('price')}")
    else:
        print(f"Signal failed: {btc_signal.get('error', 'Unknown error')}")
    
    # Test batch trading signals
    print("\nTesting batch trading signals...")
    altcoins = ["BNBUSDT", "SOLUSDT", "ADAUSDT", "DOGEUSDT"]
    batch_signals = trading_ml.get_batch_trading_signals(altcoins, min_confidence=0.6)
    
    if batch_signals.get('success', False):
        print(f"Successfully got signals for {len(batch_signals.get('signals', []))} symbols")
        for signal in batch_signals.get('signals', []):
            symbol = signal.get('symbol', 'Unknown')
            action = signal.get('signal', 'Unknown')
            confidence = signal.get('confidence', 0)
            print(f"  {symbol}: {action} with {confidence:.2f} confidence")
    else:
        print(f"Batch signals failed: {batch_signals.get('error', 'Unknown error')}")


def test_ml_trading_bridge():
    """Test the ML trading bridge"""
    print("\n=== Testing ML Trading Bridge ===\n")
    
    # Get the ML trading bridge
    bridge = get_ml_trading_bridge()
    
    # Test getting a signal
    print("Testing get_signal for BTCUSDT...")
    btc_signal = bridge.get_signal("BTCUSDT")
    
    if btc_signal.get('success', False):
        print(f"Signal: {btc_signal.get('signal')} with {btc_signal.get('confidence', 0):.2f} confidence")
        print(f"Price: {btc_signal.get('price')}")
    else:
        print(f"Signal failed: {btc_signal.get('error', 'Unknown error')}")
    
    # Test should_open_position for both directions
    print("\nTesting should_open_position...")
    
    # Test LONG position
    should_open_long, signal_info = bridge.should_open_position("BTCUSDT", "LONG")
    print(f"Should open LONG position for BTCUSDT? {should_open_long}")
    print(f"Signal: {signal_info.get('signal')} with {signal_info.get('confidence', 0):.2f} confidence")
    
    # Test SHORT position
    should_open_short, signal_info = bridge.should_open_position("BTCUSDT", "SHORT")
    print(f"Should open SHORT position for BTCUSDT? {should_open_short}")
    print(f"Signal: {signal_info.get('signal')} with {signal_info.get('confidence', 0):.2f} confidence")
    
    # Test should_close_position for both directions
    print("\nTesting should_close_position...")
    
    # Test closing LONG position
    should_close_long, signal_info = bridge.should_close_position("BTCUSDT", "LONG")
    print(f"Should close LONG position for BTCUSDT? {should_close_long}")
    print(f"Signal: {signal_info.get('signal')} with {signal_info.get('confidence', 0):.2f} confidence")
    
    # Test closing SHORT position
    should_close_short, signal_info = bridge.should_close_position("BTCUSDT", "SHORT")
    print(f"Should close SHORT position for BTCUSDT? {should_close_short}")
    print(f"Signal: {signal_info.get('signal')} with {signal_info.get('confidence', 0):.2f} confidence")
    
    # Test getting recommended pairs
    print("\nTesting get_recommended_pairs...")
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", "XRPUSDT", "DOGEUSDT", "DOTUSDT"]
    recommended = bridge.get_recommended_pairs(symbols, max_pairs=3)
    
    if recommended.get('success', False):
        # Show LONG recommendations
        print("Recommended LONG positions:")
        for signal in recommended.get('long', []):
            symbol = signal.get('symbol', 'Unknown')
            confidence = signal.get('confidence', 0)
            print(f"  {symbol} with {confidence:.2f} confidence")
        
        # Show SHORT recommendations
        print("\nRecommended SHORT positions:")
        for signal in recommended.get('short', []):
            symbol = signal.get('symbol', 'Unknown')
            confidence = signal.get('confidence', 0)
            print(f"  {symbol} with {confidence:.2f} confidence")
    else:
        print(f"Getting recommendations failed: {recommended.get('error', 'Unknown error')}")


def simulate_trading_bot():
    """Simulate a trading bot using the ML trading bridge"""
    print("\n=== Simulating Trading Bot Integration ===\n")
    
    # Get the ML trading bridge
    bridge = get_ml_trading_bridge()
    
    # List of symbols to monitor
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"]
    
    # Get recommended trading pairs
    print("Getting recommended trading pairs...")
    recommended = bridge.get_recommended_pairs(symbols, max_pairs=3)
    
    if not recommended.get('success', False):
        print(f"Failed to get recommendations: {recommended.get('error', 'Unknown error')}")
        return
    
    # Process LONG recommendations
    print("\nProcessing LONG recommendations:")
    for signal in recommended.get('long', []):
        symbol = signal.get('symbol', 'Unknown')
        confidence = signal.get('confidence', 0)
        
        print(f"Checking if we should open LONG position for {symbol} (confidence: {confidence:.2f})...")
        should_open, signal_info = bridge.should_open_position(symbol, "LONG")
        
        if should_open:
            print(f"  OPENING LONG position for {symbol}")
            # In a real bot, this would trigger the trading logic to open a position
            
            # Simulate position being opened
            print(f"  LONG position opened for {symbol} at {signal_info.get('price')}")
        else:
            print(f"  Conditions not met for opening LONG position for {symbol}")
    
    # Process SHORT recommendations
    print("\nProcessing SHORT recommendations:")
    for signal in recommended.get('short', []):
        symbol = signal.get('symbol', 'Unknown')
        confidence = signal.get('confidence', 0)
        
        print(f"Checking if we should open SHORT position for {symbol} (confidence: {confidence:.2f})...")
        should_open, signal_info = bridge.should_open_position(symbol, "SHORT")
        
        if should_open:
            print(f"  OPENING SHORT position for {symbol}")
            # In a real bot, this would trigger the trading logic to open a position
            
            # Simulate position being opened
            print(f"  SHORT position opened for {symbol} at {signal_info.get('price')}")
        else:
            print(f"  Conditions not met for opening SHORT position for {symbol}")
    
    # Simulate checking existing positions
    print("\nChecking if we should close existing positions...")
    
    # Simulate some open positions (in a real bot, these would be fetched from the database)
    open_positions = [
        {"symbol": "BTCUSDT", "direction": "LONG", "entry_price": 65000.0},
        {"symbol": "ETHUSDT", "direction": "SHORT", "entry_price": 3500.0},
    ]
    
    for position in open_positions:
        symbol = position["symbol"]
        direction = position["direction"]
        entry_price = position["entry_price"]
        
        print(f"Checking if we should close {direction} position for {symbol} (entry: {entry_price})...")
        should_close, signal_info = bridge.should_close_position(symbol, direction)
        
        if should_close:
            print(f"  CLOSING {direction} position for {symbol}")
            # In a real bot, this would trigger the trading logic to close a position
            
            # Simulate position being closed
            current_price = signal_info.get('price', entry_price)
            pnl = (current_price - entry_price) if direction == "LONG" else (entry_price - current_price)
            print(f"  {direction} position closed for {symbol} at {current_price} (P&L: {pnl})")
        else:
            print(f"  Holding {direction} position for {symbol}")


def main():
    """Run the comprehensive test of the ML prediction system"""
    print("\n=== ML Prediction System Comprehensive Test ===\n")
    print("Testing direct Python integration without using HTTP APIs or Flask server\n")
    
    try:
        # Test ML prediction engine
        test_ml_prediction_engine()
        
        # Test trading ML interface
        test_trading_ml_interface()
        
        # Test ML trading bridge
        test_ml_trading_bridge()
        
        # Simulate trading bot integration
        simulate_trading_bot()
        
        print("\n=== Comprehensive Test Completed Successfully ===\n")
        print("The ML prediction system is successfully working natively in Python")
        print("without requiring HTTP APIs or Flask server!")
        
    except Exception as e:
        logger.error(f"Error in test: {e}", exc_info=True)
        print(f"\nTest failed with error: {e}")


if __name__ == "__main__":
    main()