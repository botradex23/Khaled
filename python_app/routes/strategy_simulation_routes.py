#!/usr/bin/env python3
"""
Strategy Simulation Routes

This module defines Flask routes for strategy simulation and comparison.
"""

from flask import Blueprint, jsonify, request, current_app
import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import simulation modules
from python_app.strategy_simulation import run_strategy_simulation, compare_strategies, StrategySimulator

# Create the blueprint
strategy_simulation_bp = Blueprint('strategy_simulation', __name__, url_prefix='/api/strategy-simulation')

@strategy_simulation_bp.route('/run', methods=['POST'])
def run_simulation():
    """Run a trading strategy simulation"""
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Required parameters
        symbol = data.get('symbol')
        timeframe = data.get('timeframe')
        strategy_config = data.get('strategyConfig')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        if not symbol or not timeframe or not strategy_config or not start_date or not end_date:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters (symbol, timeframe, strategyConfig, startDate, endDate)'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Run the simulation
        result = run_strategy_simulation(
            symbol,
            timeframe,
            strategy_config,
            start_date,
            end_date
        )
        
        if result.get('success', False):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
        
    except Exception as e:
        logging.error(f"Error running strategy simulation: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@strategy_simulation_bp.route('/compare', methods=['POST'])
def compare_strategy_types():
    """Compare different strategy types on the same market data"""
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Required parameters
        symbol = data.get('symbol')
        timeframe = data.get('timeframe')
        start_date = data.get('startDate')
        end_date = data.get('endDate')
        
        if not symbol or not timeframe or not start_date or not end_date:
            return jsonify({
                'success': False,
                'error': 'Missing required parameters (symbol, timeframe, startDate, endDate)'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Run the comparison
        result = compare_strategies(
            symbol,
            timeframe,
            start_date,
            end_date
        )
        
        if result.get('success', False):
            return jsonify({
                'success': True,
                'data': result
            })
        else:
            return jsonify({
                'success': False,
                'error': result.get('error', 'Unknown error')
            }), 500
        
    except Exception as e:
        logging.error(f"Error comparing strategies: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@strategy_simulation_bp.route('/historical-data/<symbol>/<timeframe>', methods=['GET'])
def get_historical_data(symbol, timeframe):
    """Get historical market data for a specific symbol and timeframe"""
    try:
        # Get date range from query parameters
        start_date = request.args.get('startDate')
        end_date = request.args.get('endDate')
        
        if not start_date or not end_date:
            return jsonify({
                'success': False,
                'error': 'Missing required query parameters (startDate, endDate)'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Create a simulator to use its data loading functionality
        simulator = StrategySimulator(symbol, timeframe)
        
        # Load the market data
        market_data = simulator.load_market_data(start_date, end_date)
        
        if market_data.empty:
            return jsonify({
                'success': False,
                'error': 'Failed to load market data'
            }), 500
        
        # Convert DataFrame to list of dictionaries with ISO date strings
        market_data_reset = market_data.reset_index()
        market_data_reset['timestamp'] = market_data_reset['timestamp'].dt.strftime('%Y-%m-%dT%H:%M:%S')
        data_list = market_data_reset.to_dict('records')
        
        return jsonify({
            'success': True,
            'data': data_list
        })
        
    except Exception as e:
        logging.error(f"Error getting historical data: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@strategy_simulation_bp.route('/default-parameters', methods=['GET'])
def get_default_parameters():
    """Get default parameters for strategy simulation"""
    try:
        # Default parameters for different strategy types
        default_params = {
            'conservative': {
                'strategyType': 'conservative',
                'initialInvestment': 10000.0,
                'tradeSizePercent': 7.0,
                'stopLossPercent': 1.5,
                'takeProfitPercent': 3.0,
                'leverage': 1.0,
                'confidenceThreshold': 0.65
            },
            'balanced': {
                'strategyType': 'balanced',
                'initialInvestment': 10000.0,
                'tradeSizePercent': 10.0,
                'stopLossPercent': 2.0,
                'takeProfitPercent': 3.0,
                'leverage': 1.0,
                'confidenceThreshold': 0.6
            },
            'aggressive': {
                'strategyType': 'aggressive',
                'initialInvestment': 10000.0,
                'tradeSizePercent': 15.0,
                'stopLossPercent': 3.0,
                'takeProfitPercent': 2.5,
                'leverage': 2.0,
                'confidenceThreshold': 0.55
            }
        }
        
        return jsonify({
            'success': True,
            'data': default_params
        })
        
    except Exception as e:
        logging.error(f"Error getting default parameters: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500