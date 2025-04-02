#!/usr/bin/env python3
"""
AI Signal Receiver Service

This script runs a standalone Flask server dedicated to the AI Signal Receiver service.
It accepts trading signals via HTTP POST requests, validates them, and stores them in the database.

Usage:
    python run_ai_signal_service.py [--port PORT]
"""

import os
import sys
import logging
import argparse
from flask import Flask, jsonify, request
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ai_signal_service')

# Make sure the services directory is in the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import services
from services.database_service import DatabaseService
from services.ai_signals.signal_receiver import SignalReceiver

def create_app():
    """
    Create and configure the Flask application.
    
    Returns:
        Flask application object
    """
    app = Flask(__name__)
    CORS(app)
    
    # Initialize services
    try:
        database_service = DatabaseService(data_dir="./data")
        signal_receiver = SignalReceiver(database_service)
        logger.info("AI Signal services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize AI Signal services: {e}")
        raise
    
    @app.route('/api/ai-signal', methods=['POST'])
    def receive_ai_signal():
        """
        Endpoint to receive AI trading signals.
        
        This endpoint accepts POST requests with AI trading signal data,
        validates and processes the signal, and returns the result.
        
        Request body should contain:
        - symbol: Trading pair symbol (e.g., "BTCUSDT")
        - action: Action to take ("BUY", "SELL", "HOLD")
        - confidence: Confidence level (float between 0-1)
        - timestamp: Signal timestamp (ISO format or Unix timestamp)
        
        Optional fields:
        - source: Source of the signal
        - metadata: Additional metadata
        - raw_data: Raw data used to generate the signal
        
        Returns:
            JSON response with processing result
        """
        if not request.is_json:
            logger.warning("Received non-JSON request to AI signal endpoint")
            return jsonify({
                'success': False,
                'message': 'Request must be JSON'
            }), 400
        
        signal_data = request.json
        logger.info(f"Received signal data: {signal_data}")
        
        # Process the signal
        result = signal_receiver.receive_signal(signal_data)
        
        if not result['success']:
            return jsonify(result), 400
        
        return jsonify(result), 201
    
    @app.route('/api/ai-signals', methods=['GET'])
    def list_ai_signals():
        """
        Endpoint to list AI trading signals.
        
        This endpoint returns a list of AI trading signals from the database.
        
        Query parameters:
        - symbol: Filter by symbol (optional)
        - action: Filter by action (optional)
        - limit: Maximum number of signals to return (default: 50)
        
        Returns:
            JSON response with list of signals
        """
        symbol = request.args.get('symbol')
        action = request.args.get('action')
        limit = int(request.args.get('limit', 50))
        
        # Build query
        query = {}
        if symbol:
            query['symbol'] = symbol.upper()
        if action:
            query['action'] = action.upper()
        
        # Get signals from database
        signals = database_service.find('ai_signals', query)
        
        # Sort by timestamp (newest first) and limit
        signals.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        signals = signals[:limit]
        
        return jsonify({
            'success': True,
            'count': len(signals),
            'signals': signals
        })
    
    @app.route('/api/status', methods=['GET'])
    def status():
        """
        Status endpoint to verify the service is running.
        
        Returns:
            JSON response with service status
        """
        return jsonify({
            'success': True,
            'service': 'ai_signal_receiver',
            'status': 'running',
            'message': 'AI Signal Receiver service is running'
        })
    
    return app

def main():
    """Main function to run the service"""
    parser = argparse.ArgumentParser(description='Run the AI Signal Receiver service')
    parser.add_argument('--port', type=int, default=5001, help='Port to run the service on')
    args = parser.parse_args()
    
    logger.info(f"Starting AI Signal Receiver service on port {args.port}")
    
    # Create the Flask app
    app = create_app()
    
    # Run the app
    app.run(host='0.0.0.0', port=args.port, debug=True)

if __name__ == '__main__':
    main()