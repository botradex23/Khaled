"""
Binance API routes

This module defines all routes for interacting with the Binance API.
"""

import logging
import os
import sys
# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, jsonify, request, redirect, url_for, render_template, flash
from services.binance import binance_market_service
from utils import flash_message, handle_api_response

# Create the Binance blueprint
binance_bp = Blueprint('binance', __name__, url_prefix='/api/binance')

# Add web UI routes for Binance operations
@binance_bp.route('/web/status', methods=['GET'])
def web_status():
    """Web UI for Binance status"""
    try:
        # Get Binance status and display in web UI
        status_response = {
            'success': True,
            'message': 'Binance API service is running',
            'version': '1.0.0',
            'sdk': 'binance-connector-python'
        }
        flash_message('Successfully connected to Binance API service', 'success')
        return render_template('dashboard.html')
    except Exception as e:
        logging.error(f"Error in Binance web status route: {e}")
        flash_message(f'Error connecting to Binance: {str(e)}', 'error')
        return render_template('dashboard.html')

@binance_bp.route('/web/prices', methods=['GET'])
def web_prices():
    """Web UI for viewing all prices"""
    try:
        # Get all prices
        prices = binance_market_service.get_all_prices()
        if prices:
            flash_message(f'Successfully fetched {len(prices)} cryptocurrency prices from Binance', 'success')
        else:
            flash_message('No price data available at this time', 'warning')
        return render_template('dashboard.html')
    except Exception as e:
        logging.error(f"Error in Binance web prices route: {e}")
        flash_message(f'Error fetching prices from Binance: {str(e)}', 'error')
        return render_template('dashboard.html')

@binance_bp.route('/web/price/<symbol>', methods=['GET'])
def web_symbol_price(symbol):
    """Web UI for viewing a specific price"""
    try:
        # Get price for symbol
        price = binance_market_service.get_symbol_price(symbol)
        if price:
            flash_message(f'Current price for {symbol}: {price}', 'success')
        else:
            flash_message(f'No price data available for {symbol}', 'warning')
        return render_template('dashboard.html')
    except Exception as e:
        logging.error(f"Error in Binance web symbol price route for {symbol}: {e}")
        flash_message(f'Error fetching price for {symbol}: {str(e)}', 'error')
        return render_template('dashboard.html')

@binance_bp.route('/web/ticker/<symbol>', methods=['GET'])
def web_ticker(symbol):
    """Web UI for viewing 24hr ticker for a symbol"""
    try:
        # Get 24hr stats for symbol
        stats = binance_market_service.get_24hr_stats(symbol)
        if stats:
            # If it's a single ticker (not a list)
            if not isinstance(stats, list):
                price_change = float(stats.get('priceChangePercent', '0'))
                if price_change > 0:
                    message = f'{symbol} is up {price_change}% in the last 24 hours'
                    category = 'success'
                elif price_change < 0:
                    message = f'{symbol} is down {abs(price_change)}% in the last 24 hours'
                    category = 'warning'
                else:
                    message = f'{symbol} price unchanged in the last 24 hours'
                    category = 'info'
                flash_message(message, category)
            else:
                flash_message(f'Successfully fetched 24hr statistics for {len(stats)} trading pairs', 'success')
        else:
            flash_message(f'No 24hr statistics available for {symbol}', 'warning')
        return render_template('dashboard.html')
    except Exception as e:
        logging.error(f"Error in Binance web ticker route for {symbol}: {e}")
        flash_message(f'Error fetching 24hr statistics for {symbol}: {str(e)}', 'error')
        return render_template('dashboard.html')

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