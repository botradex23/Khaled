"""
Live Prediction Routes

This module defines Flask routes for real-time ML predictions based on the latest OHLCV data.
It provides endpoints for:
1. Getting predictions from the latest 5-minute candle data
2. Comparing predictions from both standard and balanced models
3. Starting a background prediction task for continuous monitoring

These endpoints provide real-time trading signals based on the most recent market data.
"""

from flask import Blueprint, jsonify, request, current_app
import os
import sys
import logging
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the live prediction module
from live_prediction import make_live_prediction, compare_live_predictions

# Update the module to ensure it's reloaded
import importlib
import live_prediction
importlib.reload(live_prediction)

# Create the blueprint
live_prediction_bp = Blueprint('live_prediction', __name__)

def register_routes(app):
    """
    Register the live prediction routes with the Flask application.
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(live_prediction_bp, url_prefix='/api/ml/live-prediction')

@live_prediction_bp.route('/test', methods=['GET'])
def test():
    """Test route to verify the API is working"""
    return jsonify({
        'success': True,
        'message': 'Live prediction API is working',
        'timestamp': datetime.now().isoformat()
    })

@live_prediction_bp.route('/predict/<symbol>', methods=['GET'])
def predict_live(symbol: str):
    """
    Make a real-time prediction for a specific symbol using the latest 5-minute candle.
    
    Args:
        symbol: Symbol name (e.g., 'BTCUSDT')
        
    Query Parameters:
        model_type: The type of model to use ('standard' or 'balanced', default: 'balanced')
        compare: If 'true', return predictions from both models
        
    Returns:
        JSON response with prediction result
    """
    # Format symbol (ensure uppercase without hyphens)
    symbol = symbol.replace('-', '').upper()
    
    # Get query parameters
    model_type = request.args.get('model_type', 'balanced')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # Log the request
    logging.info(f"Received live prediction request for {symbol} using {model_type} model (compare={compare})")
    
    try:
        # Add debug info
        import predict_xgboost
        import inspect
        logging.info(f"Live prediction routes version: 2.0 (updated)")
        logging.info(f"make_live_prediction module: {inspect.getmodule(make_live_prediction)}")
        logging.info(f"predict_xgboost module: {inspect.getmodule(predict_xgboost)}")
        
        if compare:
            # If comparing, use both models
            result = compare_live_predictions(symbol)
            return jsonify(result)
        else:
            # Use just one model type
            try:
                # Check if live_prediction module and methods are properly accessible
                from live_prediction import prepare_features, fetch_historical_candles
                
                # Get historical candles
                df = fetch_historical_candles(symbol, interval='5m', limit=100)
                if df is None or len(df) < 20:
                    return jsonify({
                        'success': False,
                        'error': 'Insufficient historical data',
                        'symbol': symbol,
                        'timestamp': datetime.now().isoformat()
                    })
                
                # Calculate features
                features = prepare_features(df)
                
                # Log features
                logging.info(f"Features calculated: {len(features)}")
                logging.info(f"Features include future_price: {'future_price' in features}")
                logging.info(f"Features include price_change_pct: {'price_change_pct' in features}")
                
                # Add missing features if needed
                if 'future_price' not in features:
                    features['future_price'] = features.get('close', 0.0)
                    logging.info("Added missing feature 'future_price'")
                
                if 'price_change_pct' not in features:
                    features['price_change_pct'] = 0.0
                    logging.info("Added missing feature 'price_change_pct'")
                
                # Make direct prediction using the predict_xgboost module
                predictor = predict_xgboost.XGBoostPredictor('/home/runner/workspace/python_app/models')
                predictor.load_model(symbol.lower(), model_type)
                
                prediction_result = predictor.predict(features, symbol.lower(), model_type)
                
                # Add extra information
                prediction_result['symbol'] = symbol
                prediction_result['model_type'] = model_type
                prediction_result['timestamp'] = datetime.now().isoformat()
                prediction_result['success'] = prediction_result.get('predicted_class') is not None
                prediction_result['current_price'] = features.get('close', 0.0)
                prediction_result['is_live_data'] = True
                
                # Include key indicators for reference
                prediction_result['indicators'] = {
                    'rsi_14': features.get('rsi_14', 0.0),
                    'ema_20': features.get('ema_20', 0.0),
                    'macd': features.get('macd', 0.0),
                    'macd_signal': features.get('macd_signal', 0.0),
                    'macd_hist': features.get('macd_hist', 0.0),
                    'bb_upper': features.get('bb_upper', 0.0),
                    'bb_lower': features.get('bb_lower', 0.0),
                    'stoch_k': features.get('stoch_k', 0.0)
                }
                
                return jsonify(prediction_result)
                
            except Exception as e:
                logging.error(f"Error in direct prediction approach: {e}", exc_info=True)
                
                # Fall back to original approach
                result = make_live_prediction(symbol, model_type)
                return jsonify(result)
    
    except Exception as e:
        logging.error(f"Error processing live prediction request: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }), 500

@live_prediction_bp.route('/batch-predict', methods=['POST'])
def batch_predict_live():
    """
    Make real-time predictions for multiple symbols.
    
    Query Parameters:
        model_type: The type of model to use ('standard' or 'balanced', default: 'balanced')
        compare: If 'true', return predictions from both models
    
    Request body:
        JSON object with list of symbols to predict
        
    Returns:
        JSON response with prediction results for all symbols
    """
    # Get query parameters
    model_type = request.args.get('model_type', 'balanced')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # Get symbols from request body
    try:
        data = request.json
        if not data or 'symbols' not in data or not isinstance(data['symbols'], list):
            return jsonify({
                'success': False,
                'message': 'Invalid request format. Expected {"symbols": ["BTCUSDT", "ETHUSDT", ...]}'
            }), 400
        
        symbols = [s.replace('-', '').upper() for s in data['symbols']]
        
        # Log the request
        logging.info(f"Received batch live prediction request for {len(symbols)} symbols using {model_type} model (compare={compare})")
        
        # Process each symbol
        results = {}
        for symbol in symbols:
            try:
                if compare:
                    result = compare_live_predictions(symbol)
                else:
                    result = make_live_prediction(symbol, model_type)
                
                results[symbol] = result
            except Exception as e:
                logging.error(f"Error processing {symbol}: {e}")
                results[symbol] = {
                    'success': False,
                    'error': str(e),
                    'symbol': symbol,
                    'timestamp': datetime.now().isoformat()
                }
        
        return jsonify({
            'success': True,
            'count': len(symbols),
            'timestamp': datetime.now().isoformat(),
            'model_type': 'comparison' if compare else model_type,
            'results': results
        })
    
    except Exception as e:
        logging.error(f"Error processing batch prediction request: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 500

@live_prediction_bp.route('/latest-indicator-values/<symbol>', methods=['GET'])
def get_latest_indicators(symbol: str):
    """
    Get the latest technical indicator values for a symbol without making a prediction.
    
    Args:
        symbol: Symbol name (e.g., 'BTCUSDT')
        
    Returns:
        JSON response with current indicator values
    """
    # Format symbol
    symbol = symbol.replace('-', '').upper()
    
    # Log the request
    logging.info(f"Received request for latest indicator values for {symbol}")
    
    try:
        # Reuse the prediction function but extract only the indicators
        result = make_live_prediction(symbol, 'balanced')
        
        if not result['success']:
            return jsonify(result), 400
        
        # Extract indicators and current price
        return jsonify({
            'success': True,
            'symbol': symbol,
            'timestamp': datetime.now().isoformat(),
            'current_price': result['current_price'],
            'indicators': result['indicators']
        })
    
    except Exception as e:
        logging.error(f"Error getting latest indicators for {symbol}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }), 500