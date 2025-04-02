#!/usr/bin/env python3
"""
ML Prediction Test

This script tests the ML prediction engine by loading the model and making predictions
on the latest market data. It can be used to verify that the prediction system is working
correctly with real data from Binance.
"""

import os
import sys
import json
import time
from datetime import datetime
import argparse

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the ML prediction modules
try:
    from ml_prediction_engine import MLPredictionEngine
    from data.dataset_loader import load_symbol_data
except ImportError as e:
    print(f"Error importing required modules: {e}")
    sys.exit(1)

def format_prediction(prediction):
    """Format the prediction result for display"""
    result = {}
    
    # Add basic prediction info
    result['timestamp'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    result['symbol'] = prediction.get('symbol', 'Unknown')
    result['interval'] = prediction.get('interval', 'Unknown')
    result['prediction'] = prediction.get('prediction', 'Unknown')
    result['confidence'] = prediction.get('confidence', 0)
    result['confidence_pct'] = f"{prediction.get('confidence', 0) * 100:.2f}%"
    
    # Add feature importances if available
    feature_importance = prediction.get('feature_importance', {})
    if feature_importance:
        # Sort by importance (descending)
        sorted_features = sorted(
            feature_importance.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        # Format as a list of dictionaries for better display
        result['top_features'] = [
            {
                'feature': feature,
                'importance': importance,
                'importance_pct': f"{importance * 100:.2f}%"
            }
            for feature, importance in sorted_features[:5]  # Top 5 features
        ]
    
    # Add all the input features
    input_features = prediction.get('input_features', {})
    if input_features:
        # Format numeric values
        result['input_data'] = {
            key: f"{value:.4f}" if isinstance(value, float) else value
            for key, value in input_features.items()
        }
    
    return result

def run_prediction_test(symbol="BTCUSDT", interval="1h", model_type="balanced", verbose=True):
    """Run a prediction test with the specified parameters"""
    if verbose:
        print("=" * 80)
        print(f"TESTING ML PREDICTION ENGINE")
        print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)
        
        print(f"\nTest configuration:")
        print(f"- Symbol: {symbol}")
        print(f"- Interval: {interval}")
        print(f"- Model type: {model_type}")
    
    try:
        # Initialize the prediction engine
        if verbose:
            print("\nInitializing ML prediction engine...")
        
        start_time = time.time()
        engine = MLPredictionEngine(model_type=model_type)
        
        # Load the model
        if verbose:
            print("Loading prediction model...")
        
        model_loaded = engine.load_model(symbol)
        if not model_loaded:
            if verbose:
                print(f"ERROR: Failed to load model for {symbol}")
            return None
        
        if verbose:
            print(f"Successfully loaded model for {symbol}")
        
        # Fetch latest market data
        if verbose:
            print(f"\nFetching latest market data for {symbol}...")
        
        market_data = load_symbol_data(
            symbol=symbol,
            interval=interval,
            lookback="1d",  # Just need enough data to calculate indicators
            drop_na=True
        )
        
        if market_data is None or market_data.empty:
            if verbose:
                print("ERROR: Failed to fetch market data")
            return None
        
        if verbose:
            print(f"Successfully fetched {len(market_data)} candles")
        
        # Get the latest candle
        latest_data = market_data.iloc[-1].to_dict()
        
        # Make prediction
        if verbose:
            print("\nMaking prediction...")
        
        prediction = engine.predict(
            symbol=symbol,
            interval=interval,
            market_data=latest_data
        )
        
        if not prediction:
            if verbose:
                print("ERROR: Failed to make prediction")
            return None
        
        # Calculate execution time
        execution_time = time.time() - start_time
        
        # Format the result
        result = format_prediction(prediction)
        result['execution_time'] = f"{execution_time:.4f} seconds"
        
        # Display the result
        if verbose:
            print("\nPrediction result:")
            print(json.dumps(result, indent=2))
        
        return result
    
    except Exception as e:
        if verbose:
            print(f"ERROR: {e}")
            import traceback
            traceback.print_exc()
        return None

def run_multi_timeframe_test(symbol="BTCUSDT", model_type="balanced"):
    """Run predictions on multiple timeframes for the same symbol"""
    print("=" * 80)
    print(f"MULTI-TIMEFRAME PREDICTION TEST FOR {symbol}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    timeframes = ["5m", "15m", "1h", "4h", "1d"]
    results = {}
    
    for interval in timeframes:
        print(f"\n{'-' * 50}")
        print(f"Testing prediction for {symbol} on {interval} timeframe")
        print(f"{'-' * 50}")
        
        result = run_prediction_test(
            symbol=symbol,
            interval=interval,
            model_type=model_type,
            verbose=False
        )
        
        if result:
            results[interval] = result
            print(f"Prediction for {interval}: {result['prediction']} with {result['confidence_pct']} confidence")
            # Print top 3 features
            if 'top_features' in result:
                print("Top 3 influential features:")
                for i, feature in enumerate(result['top_features'][:3]):
                    print(f"  {i+1}. {feature['feature']}: {feature['importance_pct']}")
        else:
            print(f"Failed to get prediction for {interval}")
    
    if results:
        # Save the results to a file
        output_file = f"prediction_test_{symbol.lower()}.json"
        output_path = os.path.join(current_dir, output_file)
        
        with open(output_path, 'w') as f:
            json.dump(results, f, indent=2)
        
        print(f"\nSaved prediction results to: {output_path}")
    
    return len(results) > 0

def main():
    """Main function for the ML prediction test"""
    parser = argparse.ArgumentParser(description='Test ML prediction engine')
    parser.add_argument('--symbol', type=str, default="BTCUSDT", help='Trading symbol (e.g., BTCUSDT)')
    parser.add_argument('--interval', type=str, default="1h", help='Timeframe interval (e.g., 5m, 1h, 1d)')
    parser.add_argument('--model', type=str, default="balanced", help='Model type (standard or balanced)')
    parser.add_argument('--multi', action='store_true', help='Run multi-timeframe test')
    
    args = parser.parse_args()
    
    if args.multi:
        success = run_multi_timeframe_test(symbol=args.symbol, model_type=args.model)
    else:
        result = run_prediction_test(
            symbol=args.symbol,
            interval=args.interval,
            model_type=args.model
        )
        success = result is not None
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())