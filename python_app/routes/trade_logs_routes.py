#!/usr/bin/env python3
"""
Trade Logs API Routes

This module defines the API routes for accessing trade logs.
"""

import os
import sys
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, current_app

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('trade_logs_routes')

# Add the parent directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the trade logger
try:
    from python_app.utils.trade_logger import (
        log_trade_signal, log_trade_order, log_trade_execution,
        update_trade_status, log_trade_error, query_trade_logs,
        get_trade_by_id, get_trade_summary
    )
except ImportError:
    try:
        from utils.trade_logger import (
            log_trade_signal, log_trade_order, log_trade_execution,
            update_trade_status, log_trade_error, query_trade_logs,
            get_trade_by_id, get_trade_summary
        )
    except ImportError:
        logger.error("Failed to import trade logger - trade log routes will not function correctly")
        
        # Create stub functions for testing
        def log_trade_signal(symbol, side, source, **kwargs):
            logger.info(f"Stub: Logging signal {side} {symbol} from {source}")
            return "stub-signal-id"
        
        def log_trade_order(symbol, side, quantity, order_type, source, **kwargs):
            logger.info(f"Stub: Logging order {side} {quantity} {symbol} ({order_type}) from {source}")
            return "stub-trade-id"
        
        def log_trade_execution(trade_id, success, **kwargs):
            logger.info(f"Stub: Logging execution for {trade_id} (success: {success})")
            return True
        
        def update_trade_status(trade_id, status, **kwargs):
            logger.info(f"Stub: Updating status for {trade_id} to {status}")
            return True
        
        def log_trade_error(trade_id, error_type, error_message, **kwargs):
            logger.error(f"Stub: Logging error for {trade_id}: {error_type} - {error_message}")
            return True
        
        def query_trade_logs(**kwargs):
            logger.info(f"Stub: Querying trade logs with {kwargs}")
            return []
        
        def get_trade_by_id(trade_id):
            logger.info(f"Stub: Getting trade {trade_id}")
            return None
        
        def get_trade_summary(**kwargs):
            logger.info(f"Stub: Getting trade summary with {kwargs}")
            return {}

# Create blueprint
trade_logs_bp = Blueprint('trade_logs', __name__, url_prefix='/api/trade-logs')

@trade_logs_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'trade-logs',
        'timestamp': datetime.now().isoformat()
    })

@trade_logs_bp.route('/signal', methods=['POST'])
def create_signal():
    """Create a new trade signal"""
    try:
        data = request.json
        
        # Required fields
        symbol = data.get('symbol')
        side = data.get('side')
        source = data.get('source')
        
        # Optional fields
        price = data.get('price')
        quantity = data.get('quantity')
        user_id = data.get('user_id')
        signal_data = data.get('signal_data')
        metadata = data.get('metadata')
        
        # Validate required fields
        if not all([symbol, side, source]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: symbol, side, and source are required'
            }), 400
        
        # Log the signal
        signal_id = log_trade_signal(
            symbol=symbol,
            side=side,
            source=source,
            price=price,
            quantity=quantity,
            user_id=user_id,
            signal_data=signal_data,
            metadata=metadata
        )
        
        return jsonify({
            'success': True,
            'message': 'Trade signal logged successfully',
            'signal_id': signal_id
        })
    except Exception as e:
        logger.error(f"Error creating trade signal: {e}")
        return jsonify({
            'success': False,
            'message': f'Error creating trade signal: {str(e)}'
        }), 500

@trade_logs_bp.route('/order', methods=['POST'])
def create_order():
    """Create a new trade order log"""
    try:
        data = request.json
        
        # Required fields
        symbol = data.get('symbol')
        side = data.get('side')
        quantity = data.get('quantity')
        order_type = data.get('order_type')
        source = data.get('source')
        
        # Optional fields
        price = data.get('price')
        user_id = data.get('user_id')
        strategy_id = data.get('strategy_id')
        signal_id = data.get('signal_id')
        metadata = data.get('metadata')
        
        # Validate required fields
        if not all([symbol, side, quantity, order_type, source]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: symbol, side, quantity, order_type, and source are required'
            }), 400
        
        # Validate quantity is a number
        try:
            quantity = float(quantity)
        except ValueError:
            return jsonify({
                'success': False,
                'message': 'Invalid quantity: must be a number'
            }), 400
        
        # Log the order
        trade_id = log_trade_order(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=order_type,
            source=source,
            price=price,
            user_id=user_id,
            strategy_id=strategy_id,
            signal_id=signal_id,
            metadata=metadata
        )
        
        return jsonify({
            'success': True,
            'message': 'Trade order logged successfully',
            'trade_id': trade_id
        })
    except Exception as e:
        logger.error(f"Error creating trade order: {e}")
        return jsonify({
            'success': False,
            'message': f'Error creating trade order: {str(e)}'
        }), 500

@trade_logs_bp.route('/execution', methods=['POST'])
def log_execution():
    """Log a trade execution result"""
    try:
        data = request.json
        
        # Required fields
        trade_id = data.get('trade_id')
        success = data.get('success')
        
        # Optional fields
        executed_price = data.get('executed_price')
        executed_quantity = data.get('executed_quantity')
        timestamp = data.get('timestamp')
        order_id = data.get('order_id')
        error_message = data.get('error_message')
        is_paper_trade = data.get('is_paper_trade', False)
        execution_data = data.get('execution_data')
        
        # Validate required fields
        if not all([trade_id, success is not None]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: trade_id and success are required'
            }), 400
        
        # Convert timestamp if provided
        if timestamp and isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid timestamp format'
                }), 400
        
        # Log the execution
        result = log_trade_execution(
            trade_id=trade_id,
            success=success,
            executed_price=executed_price,
            executed_quantity=executed_quantity,
            timestamp=timestamp,
            order_id=order_id,
            error_message=error_message,
            is_paper_trade=is_paper_trade,
            execution_data=execution_data
        )
        
        return jsonify({
            'success': True,
            'message': 'Trade execution logged successfully',
            'result': result
        })
    except Exception as e:
        logger.error(f"Error logging trade execution: {e}")
        return jsonify({
            'success': False,
            'message': f'Error logging trade execution: {str(e)}'
        }), 500

@trade_logs_bp.route('/status/<trade_id>', methods=['PUT'])
def update_status(trade_id):
    """Update the status of a trade"""
    try:
        data = request.json
        
        # Required fields
        status = data.get('status')
        
        # Optional fields
        metadata = data.get('metadata')
        
        # Validate required fields
        if not status:
            return jsonify({
                'success': False,
                'message': 'Missing required field: status'
            }), 400
        
        # Update the status
        result = update_trade_status(
            trade_id=trade_id,
            status=status,
            metadata=metadata
        )
        
        return jsonify({
            'success': True,
            'message': f'Trade status updated to {status}',
            'result': result
        })
    except Exception as e:
        logger.error(f"Error updating trade status: {e}")
        return jsonify({
            'success': False,
            'message': f'Error updating trade status: {str(e)}'
        }), 500

@trade_logs_bp.route('/error', methods=['POST'])
def log_error():
    """Log a trade-related error"""
    try:
        data = request.json
        
        # Required fields
        error_type = data.get('error_type')
        error_message = data.get('error_message')
        
        # Optional fields
        trade_id = data.get('trade_id')
        context = data.get('context')
        
        # Validate required fields
        if not all([error_type, error_message]):
            return jsonify({
                'success': False,
                'message': 'Missing required fields: error_type and error_message are required'
            }), 400
        
        # Log the error
        result = log_trade_error(
            trade_id=trade_id,
            error_type=error_type,
            error_message=error_message,
            context=context
        )
        
        return jsonify({
            'success': True,
            'message': 'Trade error logged successfully',
            'result': result
        })
    except Exception as e:
        logger.error(f"Error logging trade error: {e}")
        return jsonify({
            'success': False,
            'message': f'Error logging trade error: {str(e)}'
        }), 500

@trade_logs_bp.route('/search', methods=['GET'])
def search_trades():
    """Search for trades with filtering"""
    try:
        # Extract query parameters
        symbol = request.args.get('symbol')
        side = request.args.get('side')
        source = request.args.get('source')
        status = request.args.get('status')
        user_id = request.args.get('user_id')
        strategy_id = request.args.get('strategy_id')
        include_executions = request.args.get('include_executions', 'true').lower() == 'true'
        
        # Time range parameters
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        
        # Limit parameter
        try:
            limit = int(request.args.get('limit', 100))
            if limit < 1:
                limit = 1
            elif limit > 1000:
                limit = 1000
        except ValueError:
            limit = 100
        
        # Convert time strings to datetime objects
        start_time = None
        end_time = None
        
        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid start_time format'
                }), 400
        
        if end_time_str:
            try:
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid end_time format'
                }), 400
        
        # Query the trades
        trades = query_trade_logs(
            symbol=symbol,
            side=side,
            source=source,
            status=status,
            user_id=user_id,
            strategy_id=strategy_id,
            start_time=start_time,
            end_time=end_time,
            limit=limit,
            include_executions=include_executions
        )
        
        return jsonify({
            'success': True,
            'count': len(trades),
            'trades': trades
        })
    except Exception as e:
        logger.error(f"Error searching trades: {e}")
        return jsonify({
            'success': False,
            'message': f'Error searching trades: {str(e)}'
        }), 500

@trade_logs_bp.route('/<trade_id>', methods=['GET'])
def get_trade(trade_id):
    """Get a specific trade by ID"""
    try:
        # Get the trade
        trade = get_trade_by_id(trade_id)
        
        if not trade:
            return jsonify({
                'success': False,
                'message': f'Trade with ID {trade_id} not found'
            }), 404
        
        return jsonify({
            'success': True,
            'trade': trade
        })
    except Exception as e:
        logger.error(f"Error getting trade: {e}")
        return jsonify({
            'success': False,
            'message': f'Error getting trade: {str(e)}'
        }), 500

@trade_logs_bp.route('/summary', methods=['GET'])
def get_summary():
    """Get summary statistics for trades"""
    try:
        # Extract query parameters
        source = request.args.get('source')
        user_id = request.args.get('user_id')
        strategy_id = request.args.get('strategy_id')
        
        # Time range parameters
        start_time_str = request.args.get('start_time')
        end_time_str = request.args.get('end_time')
        
        # Convert time strings to datetime objects
        start_time = None
        end_time = None
        
        if start_time_str:
            try:
                start_time = datetime.fromisoformat(start_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid start_time format'
                }), 400
        
        if end_time_str:
            try:
                end_time = datetime.fromisoformat(end_time_str.replace('Z', '+00:00'))
            except ValueError:
                return jsonify({
                    'success': False,
                    'message': 'Invalid end_time format'
                }), 400
        
        # Get the summary
        summary = get_trade_summary(
            source=source,
            user_id=user_id,
            strategy_id=strategy_id,
            start_time=start_time,
            end_time=end_time
        )
        
        return jsonify({
            'success': True,
            'summary': summary
        })
    except Exception as e:
        logger.error(f"Error getting trade summary: {e}")
        return jsonify({
            'success': False,
            'message': f'Error getting trade summary: {str(e)}'
        }), 500