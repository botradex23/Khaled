"""
AI Signals Routes Module

This module defines Flask routes for AI signal handling.
"""

import logging
from flask import Blueprint, request, jsonify
import sys
import os

# Add parent directory to Python path to allow absolute imports
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from services.ai_signals import SignalReceiver
from services.database_service import DatabaseService

# Configure logging
logger = logging.getLogger(__name__)

# Create blueprint
ai_signals_bp = Blueprint('ai_signals', __name__)

# Import SignalReceiver directly without using the package import
import os
import sys
sys.path.append(os.path.abspath(os.path.dirname(os.path.dirname(__file__))))
from services.ai_signals.signal_receiver import SignalReceiver
from services.database_service import DatabaseService

# Initialize services
database_service = DatabaseService()
signal_receiver = SignalReceiver(database_service)

@ai_signals_bp.route('/api/ai-signal', methods=['POST'])
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
    logger.debug(f"Received signal data: {signal_data}")
    
    # Process the signal
    result = signal_receiver.receive_signal(signal_data)
    
    if not result['success']:
        return jsonify(result), 400
    
    return jsonify(result), 201

@ai_signals_bp.route('/api/ai-signals', methods=['GET'])
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