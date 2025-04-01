#!/usr/bin/env python3
"""
Test API Script for Live Prediction Routes

This script provides a minimal Flask application to test the live prediction API routes.
It allows us to debug any issues with the prediction endpoints without affecting the main app.
"""

import os
import sys
import json
import logging
from flask import Flask, jsonify, request
from datetime import datetime

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import necessary modules
from live_prediction import make_live_prediction, compare_live_predictions
import predict_xgboost

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Create Flask app
app = Flask(__name__)

# Add test route
@app.route('/api/test', methods=['GET'])
def test():
    """Test route to verify the API is working"""
    return jsonify({
        'success': True,
        'message': 'Test API is working',
        'timestamp': datetime.now().isoformat()
    })

# Add prediction route
@app.route('/api/predict/<symbol>', methods=['GET'])
def predict(symbol):
    """Make a prediction for a symbol"""
    # Format symbol
    symbol = symbol.replace('-', '').upper()
    
    # Get model type from query string
    model_type = request.args.get('model_type', 'balanced')
    
    # Validate model type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'error': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"',
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        })
    
    # Log the request
    logging.info(f"Received prediction request for {symbol} using {model_type} model")
    
    try:
        # Make prediction
        result = make_live_prediction(symbol, model_type)
        logging.info(f"Prediction result: {result}")
        return jsonify(result)
    except Exception as e:
        logging.error(f"Error making prediction: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'error': str(e),
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        })

if __name__ == '__main__':
    print("Starting test API server on port 5002...")
    app.run(host='0.0.0.0', port=5002, debug=True)