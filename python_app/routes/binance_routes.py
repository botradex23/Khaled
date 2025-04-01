"""
Binance API routes

This module defines all routes for interacting with the Binance API.
"""

import logging
import os
import sys
# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, jsonify, request
from services.binance import binance_market_service

# Create the Binance blueprint
binance_bp = Blueprint('binance', __name__, url_prefix='/api/binance')

@binance_bp.route('/ping', methods=['GET'])
def ping():
    """Health check endpoint for Binance API"""
    try:
        # Simple health check
        return jsonify({
            'success': True,
            'message': 'Binance API service is running',
            'version': '1.0.0',
            'sdk': 'binance-connector-python'
        }), 200
    except Exception as e:
        logging.error(f"Error in Binance ping route: {e}")
        return jsonify({
            'success': False,
            'message': f'Error checking Binance API service: {str(e)}'
        }), 500

@binance_bp.route('/prices', methods=['GET'])
def get_all_prices():
    """Get all current prices from Binance API"""
    try:
        # Use the service to get all prices
        prices = binance_market_service.get_all_prices()
        
        # Return the result
        return jsonify({
            'success': True,
            'timestamp': binance_market_service.live_prices.get('timestamp', 0),
            'source': 'binance-official-sdk',
            'count': len(prices),
            'prices': prices
        }), 200
    except ValueError as e:
        # Handle specific validation errors
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        # Handle general errors
        logging.error(f"Error in get_all_prices route: {e}")
        return jsonify({
            'success': False,
            'message': f'Error fetching prices from Binance: {str(e)}'
        }), 500

@binance_bp.route('/price/<symbol>', methods=['GET'])
def get_symbol_price(symbol):
    """Get current price for a specific symbol"""
    try:
        # Use the service to get the price for the symbol
        price = binance_market_service.get_symbol_price(symbol)
        
        if price:
            return jsonify({
                'success': True,
                'price': price
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': f'No price data found for symbol: {symbol}'
            }), 404
    except Exception as e:
        logging.error(f"Error in get_symbol_price route for {symbol}: {e}")
        return jsonify({
            'success': False,
            'message': f'Error fetching price for {symbol} from Binance: {str(e)}'
        }), 500

@binance_bp.route('/ticker/24hr', methods=['GET'])
def get_24hr_stats():
    """Get 24hr ticker statistics for one or all symbols"""
    try:
        # Check if a symbol was provided in the query
        symbol = request.args.get('symbol')
        
        # Use the service to get 24hr stats
        stats = binance_market_service.get_24hr_stats(symbol)
        
        # Check if data was returned
        if stats is None:
            return jsonify({
                'success': False,
                'message': f'No 24hr statistics found for symbol: {symbol}'
            }), 404
        
        # Return the result
        return jsonify({
            'success': True,
            'source': 'binance-official-sdk',
            'data': stats
        }), 200
    except ValueError as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 400
    except Exception as e:
        logging.error(f"Error in get_24hr_stats route: {e}")
        return jsonify({
            'success': False,
            'message': f'Error fetching 24hr statistics from Binance: {str(e)}'
        }), 500