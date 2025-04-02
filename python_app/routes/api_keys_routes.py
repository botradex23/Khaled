#!/usr/bin/env python3
"""
API Keys Management Routes

This module defines API routes for managing user API keys for various exchanges.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from flask import Blueprint, request, jsonify, g, current_app

# Configure logging
logger = logging.getLogger('api_keys_routes')

# Import services with proper error handling
try:
    from python_app.services.api_key_service import get_user_api_keys, set_user_api_keys, delete_user_api_keys, validate_api_keys
    from python_app.services.binance.trading_service import get_binance_trading_service
except ImportError:
    try:
        from services.api_key_service import get_user_api_keys, set_user_api_keys, delete_user_api_keys, validate_api_keys
        from services.binance.trading_service import get_binance_trading_service
    except ImportError:
        logger.error("Failed to import required services - API keys routes will not function correctly")
        get_user_api_keys = None
        set_user_api_keys = None
        delete_user_api_keys = None
        validate_api_keys = None
        get_binance_trading_service = None

# Create blueprint
api_keys_bp = Blueprint('api_keys', __name__, url_prefix='/api/keys')

# Authentication middleware for API key routes
@api_keys_bp.before_request
def authenticate_api_keys_request():
    """Authenticate API key management requests"""
    # Get user ID from request
    user_id = request.headers.get('X-User-ID')
    if not user_id:
        # Try to get from query params
        user_id = request.args.get('user_id')
        
    # If still no user ID, check if we're in development mode
    if not user_id and current_app.config.get('DEVELOPMENT_MODE', False):
        user_id = 'admin'  # Use admin by default in development
    
    # Require authentication for all API key operations
    if not user_id:
        return jsonify({
            'success': False,
            'error': 'Authentication required for API key management',
            'message': 'Please provide a user ID in X-User-ID header or user_id query parameter'
        }), 401
        
    # Add user_id to request context
    g.user_id = user_id
    
    # Pass through to the next handler
    return None


@api_keys_bp.route('/exchanges', methods=['GET'])
def get_supported_exchanges():
    """Get list of supported exchanges for API key management"""
    # Return the supported exchanges
    return jsonify({
        'success': True,
        'exchanges': [
            {
                'id': 'binance',
                'name': 'Binance',
                'description': 'Binance cryptocurrency exchange',
                'website': 'https://www.binance.com/',
                'logo': '/static/img/exchanges/binance.png',
                'api_doc_url': 'https://www.binance.com/en/support/faq/how-to-create-api-keys-on-binance-360002502072'
            }
        ]
    })


@api_keys_bp.route('/get/<exchange>', methods=['GET'])
def get_api_keys(exchange):
    """
    Get stored API keys for a specific exchange
    
    This endpoint returns a masked version of the API keys if they exist
    """
    # Only Binance is supported for now
    if exchange.lower() != 'binance':
        return jsonify({
            'success': False,
            'error': f'Unsupported exchange: {exchange}',
            'message': 'Only Binance is supported at this time'
        }), 400
    
    # Get user ID from request context
    user_id = g.user_id
    
    # Get API keys (will be None if not found)
    api_key, secret_key = get_user_api_keys(user_id)
    
    # Mask the keys for security
    masked_api_key = None
    masked_secret_key = None
    
    if api_key:
        # Show first 4 and last 4 characters, mask the rest
        masked_api_key = f"{api_key[:4]}...{api_key[-4:]}"
    
    if secret_key:
        # Show only first 4 characters, mask the rest
        masked_secret_key = f"{secret_key[:4]}..."
    
    return jsonify({
        'success': True,
        'exchange': exchange,
        'has_api_keys': bool(api_key and secret_key),
        'api_key': masked_api_key,
        'secret_key': masked_secret_key
    })


@api_keys_bp.route('/set/<exchange>', methods=['POST'])
def set_api_keys(exchange):
    """
    Set API keys for a specific exchange
    
    Required fields in request body:
    - api_key: API key for the exchange
    - secret_key: Secret/private key for the exchange
    """
    # Only Binance is supported for now
    if exchange.lower() != 'binance':
        return jsonify({
            'success': False,
            'error': f'Unsupported exchange: {exchange}',
            'message': 'Only Binance is supported at this time'
        }), 400
    
    # Get request data
    data = request.json
    if not data:
        return jsonify({
            'success': False,
            'error': 'No request body provided'
        }), 400
    
    # Extract API keys
    api_key = data.get('api_key')
    secret_key = data.get('secret_key')
    
    # Validate API keys
    if not api_key or not secret_key:
        return jsonify({
            'success': False,
            'error': 'API key and secret key are required'
        }), 400
    
    # Further validation can be added here
    if not validate_api_keys(api_key, secret_key):
        return jsonify({
            'success': False,
            'error': 'Invalid API keys format',
            'message': 'API keys must be properly formatted for the exchange'
        }), 400
    
    # Get user ID from request context
    user_id = g.user_id
    
    # Test keys against Binance API
    test_result = test_api_connection(api_key, secret_key)
    if not test_result.get('success', False):
        return jsonify({
            'success': False,
            'error': 'API keys validation failed',
            'message': test_result.get('message', 'Could not connect to Binance with provided keys')
        }), 400
    
    # Save API keys
    result = set_user_api_keys(user_id, api_key, secret_key)
    
    if result:
        return jsonify({
            'success': True,
            'message': f'API keys for {exchange} saved successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to save API keys',
            'message': 'An error occurred while saving API keys'
        }), 500


@api_keys_bp.route('/delete/<exchange>', methods=['DELETE'])
def delete_api_keys(exchange):
    """Delete API keys for a specific exchange"""
    # Only Binance is supported for now
    if exchange.lower() != 'binance':
        return jsonify({
            'success': False,
            'error': f'Unsupported exchange: {exchange}',
            'message': 'Only Binance is supported at this time'
        }), 400
    
    # Get user ID from request context
    user_id = g.user_id
    
    # Delete API keys
    result = delete_user_api_keys(user_id)
    
    if result:
        return jsonify({
            'success': True,
            'message': f'API keys for {exchange} deleted successfully'
        })
    else:
        return jsonify({
            'success': False,
            'error': 'Failed to delete API keys',
            'message': 'An error occurred while deleting API keys'
        }), 500


@api_keys_bp.route('/test/<exchange>', methods=['POST'])
def test_api_keys(exchange):
    """
    Test API keys for a specific exchange
    
    Required fields in request body:
    - api_key: API key to test
    - secret_key: Secret/private key to test
    """
    # Only Binance is supported for now
    if exchange.lower() != 'binance':
        return jsonify({
            'success': False,
            'error': f'Unsupported exchange: {exchange}',
            'message': 'Only Binance is supported at this time'
        }), 400
    
    # Get request data
    data = request.json
    if not data:
        return jsonify({
            'success': False,
            'error': 'No request body provided'
        }), 400
    
    # Extract API keys
    api_key = data.get('api_key')
    secret_key = data.get('secret_key')
    
    # Validate API keys
    if not api_key or not secret_key:
        return jsonify({
            'success': False,
            'error': 'API key and secret key are required'
        }), 400
    
    # Test API connection
    test_result = test_api_connection(api_key, secret_key)
    
    return jsonify(test_result)


def test_api_connection(api_key: str, secret_key: str) -> Dict[str, Any]:
    """
    Test API connection to Binance using provided keys
    
    Args:
        api_key: API key to test
        secret_key: Secret key to test
        
    Returns:
        Dictionary with test results
    """
    try:
        # Create a trading service instance with the provided keys
        trading_service = get_binance_trading_service(
            paper_mode=True,  # Use paper mode for testing
            api_key=api_key,
            secret_key=secret_key
        )
        
        # Test the connection by initializing the client
        client = trading_service._create_client()
        
        # Test a simple API call
        account_info = None
        permissions = []
        
        try:
            # Try to get account info (requires API key with permissions)
            account_info = client.account()
            
            # Parse permissions
            if account_info:
                permissions = account_info.get('permissions', [])
        except Exception as e:
            # May fail if keys don't have permissions
            logger.warning(f"Could not get account info: {e}")
        
        return {
            'success': True,
            'message': 'API connection successful',
            'connection_status': 'connected',
            'account_info': {
                'permissions': permissions
            }
        }
        
    except Exception as e:
        logger.error(f"Error testing API connection: {e}")
        return {
            'success': False,
            'message': f'API connection failed: {str(e)}',
            'connection_status': 'failed',
            'error': str(e)
        }