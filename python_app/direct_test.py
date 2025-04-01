#!/usr/bin/env python3
"""
Direct test for the live prediction functionality
"""

import os
import sys
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import necessary modules
import predict_xgboost
from live_prediction import fetch_historical_candles, prepare_features

def direct_predict(symbol, model_type='balanced'):
    """Make a prediction directly using the XGBoost predictor"""
    logging.info(f"Making direct prediction for {symbol} using {model_type} model")
    
    # Format symbol
    symbol = symbol.replace('-', '').upper()
    symbol_lower = symbol.lower()
    
    try:
        # Initialize the predictor
        predictor = predict_xgboost.XGBoostPredictor('/home/runner/workspace/python_app/models')
        
        # Load the model
        if not predictor.load_model(symbol_lower, model_type):
            logging.error(f"Failed to load {model_type} model for {symbol_lower}")
            return None
        
        # Fetch historical candles
        df = fetch_historical_candles(symbol, interval='5m', limit=100)
        if df is None or len(df) < 20:
            logging.error(f"Insufficient historical data for {symbol}")
            return None
        
        # Calculate features
        features = prepare_features(df)
        
        # Log features
        logging.info(f"Features calculated: {len(features)}")
        logging.info(f"Features include future_price: {'future_price' in features}")
        logging.info(f"Features include price_change_pct: {'price_change_pct' in features}")
        
        # Add missing features if needed
        if 'future_price' not in features:
            features['future_price'] = features['close']
            logging.info("Added missing feature 'future_price'")
        
        if 'price_change_pct' not in features:
            features['price_change_pct'] = 0.0
            logging.info("Added missing feature 'price_change_pct'")
        
        # Make prediction
        prediction_result = predictor.predict(features, symbol_lower, model_type)
        
        # Add extra information
        prediction_result['symbol'] = symbol
        prediction_result['model_type'] = model_type
        prediction_result['timestamp'] = datetime.now().isoformat()
        prediction_result['success'] = prediction_result.get('predicted_class') is not None
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
        
        logging.info(f"Prediction result: {prediction_result}")
        return prediction_result
    
    except Exception as e:
        logging.error(f"Error making direct prediction: {e}", exc_info=True)
        return None

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Direct Live Prediction Test')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Symbol to predict (default: BTCUSDT)')
    parser.add_argument('--model', type=str, default='balanced', choices=['standard', 'balanced'], 
                        help='Model type to use (default: balanced)')
    
    args = parser.parse_args()
    
    logging.info(f"Starting direct prediction test for {args.symbol} using {args.model} model")
    
    result = direct_predict(args.symbol, args.model)
    
    if result:
        print(json.dumps(result, indent=2))
    else:
        print("Prediction failed")