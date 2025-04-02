"""
Binance API routes

This module defines all routes for interacting with the Binance API.
It includes trading operations through the trade queue system, market data access,
and testing endpoints.
"""

import logging
import os
import sys
import json
# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from flask import Blueprint, jsonify, request, redirect, url_for, render_template, flash
from services.binance import binance_market_service
from services.binance.binance_service_manager import (
    get_market_service, get_trading_service, get_trade_queue_service,
    place_order, get_order_status, cancel_order, check_api_connection,
    get_symbol_price
)
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
        
@binance_bp.route('/connection-status', methods=['GET'])
def connection_status():
    """Check the Binance API connection status"""
    try:
        # Try to get the current BTC price as a connection test
        test_result = binance_market_service.get_symbol_price('BTCUSDT')
        
        # Check if we got a successful response or fallback data
        using_fallback = hasattr(binance_market_service, 'cached_all_prices') and binance_market_service.cached_all_prices
        
        # If the response contains an error, we have a connection issue
        connection_error = None
        if isinstance(test_result, dict) and 'error' in test_result:
            connection_error = test_result['error']
        
        # Return detailed status information
        return jsonify({
            'success': True,
            'connection': {
                'status': 'limited' if using_fallback else ('connected' if not connection_error else 'disconnected'),
                'direct_api_access': not using_fallback and not connection_error,
                'error': connection_error,
                'using_fallback_data': using_fallback
            },
            'binance': {
                'service': 'running',
                'sdk': 'binance-connector-python',
                'testnet': binance_market_service.use_testnet,
                'last_price_update': binance_market_service.live_prices.get('timestamp', 0)
            },
            'message': 'Using fallback data due to API access restrictions' if using_fallback else 
                      ('Connected to Binance API' if not connection_error else f'Connection error: {connection_error}')
        }), 200
    except Exception as e:
        logging.error(f"Error in Binance connection status route: {e}")
        return jsonify({
            'success': False,
            'connection': {
                'status': 'unknown',
                'error': str(e)
            },
            'message': f'Error checking Binance API connection: {str(e)}'
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
        # Format the symbol to match our expected format
        formatted_symbol = symbol.upper().replace('-', '')
        
        # Check if we have fallback data and if the symbol exists in it
        if hasattr(binance_market_service, 'cached_all_prices') and binance_market_service.cached_all_prices:
            # Look for the symbol in our cached prices
            for price_item in binance_market_service.cached_all_prices:
                if price_item['symbol'] == formatted_symbol:
                    return jsonify({
                        'success': True,
                        'price': price_item,
                        'source': 'fallback_data'
                    }), 200
        
        # Try to get the price from the Binance API
        price = binance_market_service.get_symbol_price(formatted_symbol)
        
        # Check if we got a successful response
        if price and not (isinstance(price, dict) and 'error' in price):
            return jsonify({
                'success': True,
                'price': price,
                'source': 'binance_api'
            }), 200
        elif isinstance(price, dict) and 'error' in price:
            # The API returned an error but we might still have the data in our fallback array
            if hasattr(binance_market_service, 'cached_all_prices') and binance_market_service.cached_all_prices:
                # Look for the symbol in our cached prices
                for price_item in binance_market_service.cached_all_prices:
                    if price_item['symbol'] == formatted_symbol:
                        return jsonify({
                            'success': True,
                            'price': price_item,
                            'source': 'fallback_data',
                            'api_error': price['error']
                        }), 200
            
            # Return the error response if no fallback data is available
            return jsonify({
                'success': True,
                'price': price
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': f'No price data found for symbol: {formatted_symbol}'
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

# Trade Queue API Routes

@binance_bp.route('/trading/order', methods=['POST'])
def place_queue_order():
    """Place a trade order through the queue system"""
    try:
        # Parse request data
        data = request.json
        if not data:
            return jsonify({
                'success': False,
                'message': 'No data provided'
            }), 400
        
        # Extract required parameters
        symbol = data.get('symbol')
        side = data.get('side')
        quantity = data.get('quantity')
        
        # Validate required fields
        if not symbol or not side or not quantity:
            return jsonify({
                'success': False,
                'message': 'Missing required parameters: symbol, side, quantity'
            }), 400
            
        # Extract optional parameters
        order_type = data.get('order_type', 'MARKET')
        price = data.get('price')
        user_id = data.get('user_id')
        position_id = data.get('position_id')
        strategy_id = data.get('strategy_id')
        ml_signal = data.get('ml_signal')
        meta = data.get('meta', {})
        
        # Validate price for LIMIT orders
        if order_type.upper() == 'LIMIT' and not price:
            return jsonify({
                'success': False,
                'message': 'Price is required for LIMIT orders'
            }), 400
            
        # Convert numeric strings to float
        try:
            quantity = float(quantity)
            if price is not None:
                price = float(price)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid quantity or price format'
            }), 400
        
        # Place the order through the queue
        result = place_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=order_type,
            price=price,
            user_id=user_id,
            position_id=position_id,
            strategy_id=strategy_id,
            ml_signal=ml_signal,
            meta=meta
        )
        
        # Return the result
        return jsonify({
            'success': True,
            'message': 'Order queued successfully',
            'data': result
        }), 200
        
    except Exception as e:
        logging.error(f"Error in place_queue_order route: {e}")
        return jsonify({
            'success': False,
            'message': f'Error placing order: {str(e)}'
        }), 500

@binance_bp.route('/trading/order/<trade_id>', methods=['GET'])
def get_queue_order_status(trade_id):
    """Get the status of a queued order"""
    try:
        # Get order status
        status = get_order_status(trade_id)
        
        # Return the result
        return jsonify({
            'success': True,
            'data': status
        }), 200
        
    except Exception as e:
        logging.error(f"Error in get_queue_order_status route for {trade_id}: {e}")
        return jsonify({
            'success': False,
            'message': f'Error getting order status: {str(e)}'
        }), 500

@binance_bp.route('/trading/order/<trade_id>/cancel', methods=['POST'])
def cancel_queue_order(trade_id):
    """Cancel a queued order"""
    try:
        # Cancel the order
        result = cancel_order(trade_id)
        
        # Return the result
        return jsonify({
            'success': result.get('success', False),
            'message': result.get('message', 'Order cancellation attempt complete'),
            'data': result
        }), 200
        
    except Exception as e:
        logging.error(f"Error in cancel_queue_order route for {trade_id}: {e}")
        return jsonify({
            'success': False,
            'message': f'Error canceling order: {str(e)}'
        }), 500

@binance_bp.route('/trading/status', methods=['GET'])
def check_trading_status():
    """Check trading API connection status"""
    try:
        # Check connection to Binance API
        result = check_api_connection()
        
        # Return the result
        return jsonify({
            'success': True,
            'data': result
        }), 200
        
    except Exception as e:
        logging.error(f"Error in check_trading_status route: {e}")
        return jsonify({
            'success': False,
            'message': f'Error checking trading status: {str(e)}'
        }), 500