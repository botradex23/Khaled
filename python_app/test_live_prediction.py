#!/usr/bin/env python3
"""
Test script for the Live Prediction functionality

This script tests the live prediction functionality by:
1. Fetching the latest 5-minute candle for BTCUSDT
2. Calculating technical indicators
3. Making a prediction with the balanced XGBoost model
4. Displaying the result

Usage:
    python test_live_prediction.py [--symbol BTCUSDT] [--model balanced|standard|compare]
"""

import os
import sys
import json
import logging
import argparse
from datetime import datetime

# Add the current directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import the live prediction module
from live_prediction import make_live_prediction, compare_live_predictions, fetch_historical_candles, prepare_features

def main():
    """Main function to test live prediction"""
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Test live prediction functionality')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Symbol to predict (default: BTCUSDT)')
    parser.add_argument('--model', type=str, default='balanced', choices=['standard', 'balanced', 'compare'], 
                        help='Model type to use (default: balanced)')
    
    args = parser.parse_args()
    symbol = args.symbol
    model_type = args.model
    
    print(f"Testing live prediction for {symbol} using {'both models' if model_type == 'compare' else model_type + ' model'}")
    
    # Step 1: Fetch the latest candles
    print("\n1. Fetching historical candles for technical indicators...")
    candles = fetch_historical_candles(symbol, interval='5m', limit=100)
    
    if candles is None:
        print("Failed to fetch candles. Exiting.")
        return
    
    print(f"Successfully fetched {len(candles)} candles.")
    print(f"Latest candle timestamp: {candles.index[-1]}")
    print(f"Latest candle data: Open={candles['open'].iloc[-1]}, High={candles['high'].iloc[-1]}, Low={candles['low'].iloc[-1]}, Close={candles['close'].iloc[-1]}, Volume={candles['volume'].iloc[-1]}")
    
    # Step 2: Calculate technical indicators
    print("\n2. Calculating technical indicators...")
    features = prepare_features(candles)
    
    print(f"Calculated {len(features)} features.")
    print("Key indicators:")
    print(f"- RSI (14): {features['rsi_14']:.2f}")
    print(f"- EMA (20): {features['ema_20']:.2f}")
    print(f"- MACD: {features['macd']:.2f}")
    print(f"- Stochastic K: {features['stoch_k']:.2f}")
    
    # Step 3: Make prediction
    print("\n3. Making prediction...")
    if model_type == 'compare':
        result = compare_live_predictions(symbol)
        
        # Print the results
        print("\nPrediction Results:")
        print("==================")
        
        if result['success']:
            standard_result = result['predictions']['standard']
            balanced_result = result['predictions']['balanced']
            
            print(f"Standard Model: {standard_result['predicted_label']} with {standard_result['confidence']:.2f} confidence")
            print(f"Balanced Model: {balanced_result['predicted_label']} with {balanced_result['confidence']:.2f} confidence")
            
            # Print probabilities
            print("\nProbabilities (Standard Model):")
            for i, prob in enumerate(standard_result['probabilities']):
                label = {0: 'SELL', 1: 'HOLD', 2: 'BUY'}.get(i, 'UNKNOWN')
                print(f"- {label}: {prob:.4f}")
                
            print("\nProbabilities (Balanced Model):")
            for i, prob in enumerate(balanced_result['probabilities']):
                label = {0: 'SELL', 1: 'HOLD', 2: 'BUY'}.get(i, 'UNKNOWN')
                print(f"- {label}: {prob:.4f}")
        else:
            print(f"Prediction failed: {result.get('error', 'Unknown error')}")
    else:
        result = make_live_prediction(symbol, model_type)
        
        # Print the results
        print("\nPrediction Results:")
        print("==================")
        
        if result['success']:
            print(f"Prediction: {result['predicted_label']} with {result['confidence']:.2f} confidence")
            print(f"Current price: {result['current_price']}")
            
            # Print probabilities
            print("\nProbabilities:")
            for i, prob in enumerate(result['probabilities']):
                label = {0: 'SELL', 1: 'HOLD', 2: 'BUY'}.get(i, 'UNKNOWN')
                print(f"- {label}: {prob:.4f}")
                
        else:
            print(f"Prediction failed: {result.get('error', 'Unknown error')}")
    
    # Step 4: Print full result JSON
    print("\n4. Full prediction result (JSON):")
    print("================================")
    print(json.dumps(result, indent=2))
    
    print("\nTest completed successfully!")

if __name__ == "__main__":
    main()