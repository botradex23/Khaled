#!/usr/bin/env python3
"""
Trading API Routes

This module defines the API routes for trading operations with user-specific API key management.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from flask import Blueprint, request, jsonify, g, current_app

# Configure logging
logger = logging.getLogger('trading_routes')

# Import services with proper error handling
try:
    from python_app.services.binance.trading_service import get_binance_trading_service
    from python_app.services.api_key_service import get_user_api_keys, validate_api_keys
except ImportError:
    try:
        from services.binance.trading_service import get_binance_trading_service
        from services.api_key_service import get_user_api_keys, validate_api_keys
    except ImportError:
        logger.error("Failed to import required services - trading routes will not function correctly")
        get_binance_trading_service = None
        get_user_api_keys = None
        validate_api_keys = None

# Create blueprint
trading_bp = Blueprint('trading', __name__, url_prefix='/api/trading')

# Authentication middleware for trading routes
@trading_bp.before_request
def authenticate_trading_request():
    """Authenticate trading API requests with proper API keys"""
    # Skip authentication for certain endpoints
    if request.path.endswith('/status'):
        return None
        
    # Get user ID from request
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        # Try to get from query params
        user_id = request.args.get('user_id')
        
    # If still no user ID, check if we're in development mode
    if not user_id and current_app.config.get('DEVELOPMENT_MODE', False):
        user_id = 'admin'  # Use admin by default in development
    
    # Check for API keys in the headers
    api_key = request.headers.get('X-API-Key')
    secret_key = request.headers.get('X-API-Secret')
    
    # Create a request context for downstream handlers
    g.user_id = user_id
    g.api_key = api_key
    g.secret_key = secret_key
    
    # If direct keys are provided, validate and use them
    if api_key and secret_key:
        if validate_api_keys(api_key, secret_key):
            return None
        else:
            return jsonify({
                'success': False,
                'error': 'Invalid API keys provided in headers'
            }), 401
            
    # If user ID is provided but no direct keys, look up keys from storage
    if user_id and get_user_api_keys:
        stored_api_key, stored_secret_key = get_user_api_keys(user_id)
        if stored_api_key and stored_secret_key:
            g.api_key = stored_api_key
            g.secret_key = stored_secret_key
            return None
            
    # If we made it here without returning, we don't have valid keys
    return jsonify({
        'success': False,
        'error': 'Authentication required for trading operations',
        'message': 'Please provide valid API keys or a registered user ID'
    }), 401


@trading_bp.route('/execute', methods=['POST'])
def execute_trade():
    """
    Execute a trade with user-specific API keys
    
    Required fields:
    - symbol: Trading pair (e.g., BTCUSDT)
    - side: Trade side (BUY or SELL)
    - quantity: Trade quantity
    
    Optional fields:
    - order_type: Order type (MARKET or LIMIT, default: MARKET)
    - price: Limit price (required for LIMIT orders)
    - paper_mode: Use paper trading mode (default: True)
    """
    # Get request data
    data = request.json
    if not data:
        return jsonify({
            'success': False,
            'error': 'No request body provided'
        }), 400
        
    # Validate required fields
    required_fields = ['symbol', 'side', 'quantity']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    # Get parameters from request
    symbol = data.get('symbol')
    side = data.get('side')
    quantity = float(data.get('quantity'))
    order_type = data.get('order_type', 'MARKET')
    price = data.get('price')
    paper_mode = data.get('paper_mode', True)
    
    # Create a trading service instance with user-specific keys
    trading_service = get_binance_trading_service(
        paper_mode=paper_mode,
        user_id=g.user_id,
        api_key=g.api_key,
        secret_key=g.secret_key
    )
    
    # Execute the trade
    try:
        result = trading_service.execute_trade(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=order_type,
            price=price
        )
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error executing trade: {e}")
        return jsonify({
            'success': False,
            'error': f'Error executing trade: {str(e)}'
        }), 500


@trading_bp.route('/positions', methods=['GET'])
def get_positions():
    """Get open positions for the authenticated user"""
    # Create a trading service instance with user-specific keys
    paper_mode = request.args.get('paper_mode', 'true').lower() == 'true'
    
    trading_service = get_binance_trading_service(
        paper_mode=paper_mode,
        user_id=g.user_id,
        api_key=g.api_key,
        secret_key=g.secret_key
    )
    
    # Get positions
    try:
        if paper_mode:
            # For paper trading, return tracked positions
            positions = trading_service.positions
            return jsonify({
                'success': True,
                'positions': [p for p in positions if p.get('status') == 'OPEN']
            })
        else:
            # For real trading, get positions from Binance
            # This would need to query open orders and account balances
            # to determine actual positions
            return jsonify({
                'success': True,
                'message': 'Not implemented for real trading yet',
                'positions': []
            })
            
    except Exception as e:
        logger.error(f"Error getting positions: {e}")
        return jsonify({
            'success': False,
            'error': f'Error getting positions: {str(e)}'
        }), 500


@trading_bp.route('/close_position', methods=['POST'])
def close_position():
    """
    Close an open position
    
    Required fields:
    - symbol: Trading pair (e.g., BTCUSDT)
    - position_id: ID of the position to close
    
    Optional fields:
    - quantity: Quantity to close (default: full position)
    - reason: Reason for closing (default: "Manual close")
    - paper_mode: Use paper trading mode (default: True)
    """
    # Get request data
    data = request.json
    if not data:
        return jsonify({
            'success': False,
            'error': 'No request body provided'
        }), 400
        
    # Validate required fields
    required_fields = ['symbol', 'position_id']
    for field in required_fields:
        if field not in data:
            return jsonify({
                'success': False,
                'error': f'Missing required field: {field}'
            }), 400
    
    # Get parameters from request
    symbol = data.get('symbol')
    position_id = int(data.get('position_id'))
    quantity = data.get('quantity')
    reason = data.get('reason', 'Manual close')
    paper_mode = data.get('paper_mode', True)
    
    # Create a trading service instance with user-specific keys
    trading_service = get_binance_trading_service(
        paper_mode=paper_mode,
        user_id=g.user_id,
        api_key=g.api_key,
        secret_key=g.secret_key
    )
    
    # Close the position
    try:
        result = trading_service.close_position(
            symbol=symbol,
            position_id=position_id,
            quantity=quantity,
            reason=reason
        )
        
        return jsonify({
            'success': True,
            'result': result
        })
        
    except Exception as e:
        logger.error(f"Error closing position: {e}")
        return jsonify({
            'success': False,
            'error': f'Error closing position: {str(e)}'
        }), 500


@trading_bp.route('/status', methods=['GET'])
def api_status():
    """Get the API connection status for the current user"""
    # Get user ID from request
    user_id = request.headers.get('X-User-ID') or request.args.get('user_id')
    
    # If user ID is provided, try to get keys
    api_key = None
    secret_key = None
    
    if user_id and get_user_api_keys:
        api_key, secret_key = get_user_api_keys(user_id)
    else:
        # Try to get from headers
        api_key = request.headers.get('X-API-Key')
        secret_key = request.headers.get('X-API-Secret')
    
    # Create response based on whether we have keys
    has_keys = bool(api_key and secret_key)
    
    if has_keys:
        # Create a trading service to test the connection
        paper_mode = request.args.get('paper_mode', 'true').lower() == 'true'
        
        trading_service = get_binance_trading_service(
            paper_mode=paper_mode,
            user_id=user_id,
            api_key=api_key,
            secret_key=secret_key
        )
        
        # Test the connection by initializing the client
        try:
            client = trading_service._create_client()
            return jsonify({
                'success': True,
                'status': 'connected',
                'has_api_keys': True,
                'paper_mode': paper_mode
            })
        except Exception as e:
            logger.error(f"Error testing API connection: {e}")
            return jsonify({
                'success': False,
                'status': 'error',
                'has_api_keys': True,
                'paper_mode': paper_mode,
                'error': str(e)
            })
    else:
        return jsonify({
            'success': False,
            'status': 'disconnected',
            'has_api_keys': False,
            'message': 'No API keys available for this user'
        })