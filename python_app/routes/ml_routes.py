"""
ML Routes Blueprint

This module defines API routes for ML-based predictions and trading signals.
"""

from flask import Blueprint, jsonify, request, current_app
import logging
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import prediction functionality
from predict import make_prediction, get_sample_data

# Create blueprint
ml_bp = Blueprint('ml', __name__, url_prefix='/api/ml')

@ml_bp.route('/status', methods=['GET'])
def status():
    """Check if ML models are available and ready"""
    try:
        # Get the models directory path
        models_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        
        # Check for available models
        available_models = []
        for file in os.listdir(models_dir):
            if file.startswith('model_') and file.endswith('.pkl'):
                symbol = file.replace('model_', '').replace('.pkl', '').upper()
                available_models.append(symbol)
        
        return jsonify({
            'success': True,
            'status': 'operational',
            'available_models': available_models
        })
    except Exception as e:
        logging.error(f"Error checking ML status: {e}")
        return jsonify({
            'success': False,
            'status': 'error',
            'error': str(e)
        }), 500

@ml_bp.route('/predict/<symbol>', methods=['GET'])
def predict(symbol):
    """
    Get ML prediction for a specific trading pair
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
    """
    try:
        # Check for query parameters
        use_sample = request.args.get('sample', '').lower() == 'true'
        interval = request.args.get('interval', '4h')
        
        # Get prediction
        result = make_prediction(symbol.upper(), interval, use_sample)
        
        if not result['success']:
            return jsonify({
                'success': False,
                'error': result['error'],
                'symbol': symbol.upper()
            }), 400
        
        return jsonify(result)
    
    except Exception as e:
        logging.error(f"Error making prediction for {symbol}: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'symbol': symbol.upper()
        }), 500

@ml_bp.route('/predictions', methods=['POST'])
def batch_predictions():
    """Get predictions for multiple symbols in a single request"""
    try:
        # Get request data
        data = request.get_json()
        
        if not data or not isinstance(data, dict):
            return jsonify({
                'success': False,
                'error': 'Invalid request data. Expected JSON object'
            }), 400
        
        # Get symbols list
        symbols = data.get('symbols', [])
        if not symbols or not isinstance(symbols, list):
            return jsonify({
                'success': False,
                'error': 'Missing or invalid symbols list'
            }), 400
        
        # Get other parameters
        use_sample = data.get('sample', False)
        interval = data.get('interval', '4h')
        
        # Get predictions for each symbol
        results = {}
        for symbol in symbols:
            if not isinstance(symbol, str):
                continue
                
            symbol = symbol.upper()
            result = make_prediction(symbol, interval, use_sample)
            results[symbol] = result
        
        return jsonify({
            'success': True,
            'predictions': results
        })
    
    except Exception as e:
        logging.error(f"Error processing batch predictions: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_bp.route('/train', methods=['POST'])
def train_model():
    """
    Train a new model for a specific symbol
    
    Note: This endpoint is for development/demonstration purposes only
    and should not be used in production.
    """
    # This would be the real implementation, but for now we'll just return a message
    return jsonify({
        'success': False,
        'message': 'Model training through API is not enabled in this version',
        'info': 'Use the command-line tools to train models'
    }), 403