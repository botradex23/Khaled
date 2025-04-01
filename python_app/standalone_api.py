#!/usr/bin/env python3
"""
Standalone API for Live Prediction

This script provides a standalone Flask API for live predictions,
separate from the main application to aid in debugging and testing.
"""

import os
import sys
import json
import logging
from flask import Flask, jsonify, request
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the direct prediction function
from direct_test import direct_predict

# Create Flask app
app = Flask(__name__)

@app.route('/', methods=['GET'])
def home():
    """Home endpoint"""
    return jsonify({
        'success': True,
        'message': 'Standalone Live Prediction API',
        'endpoints': [
            '/test',
            '/predict/<symbol>?model_type=balanced|standard'
        ],
        'timestamp': datetime.now().isoformat()
    })

@app.route('/test', methods=['GET'])
def test():
    """Test endpoint"""
    return jsonify({
        'success': True,
        'message': 'Standalone Live Prediction API is working',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/predict/<symbol>', methods=['GET'])
def predict(symbol):
    """Prediction endpoint"""
    # Get query parameters
    model_type = request.args.get('model_type', 'balanced')
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'error': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"',
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }), 400
    
    # Log the request
    logging.info(f"Received prediction request for {symbol} using {model_type} model")
    
    # Make prediction
    result = direct_predict(symbol, model_type)
    
    if result:
        return jsonify(result)
    else:
        return jsonify({
            'success': False,
            'error': 'Prediction failed',
            'symbol': symbol,
            'timestamp': datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    logging.info(f"Starting standalone API on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)