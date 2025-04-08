#!/usr/bin/env python3
"""
ML Optimization Routes

This module defines Flask routes for ML model optimization.
It provides endpoints for:
1. Starting optimization processes (Grid Search, Random Search, Bayesian)
2. Getting optimization status
3. Tracking optimization results
4. Adaptive hyperparameter tuning
5. Market-based retraining triggers
6. Model deployment and feedback integration

These endpoints are used by the frontend to manage and monitor ML model optimization.
"""

from flask import Blueprint, jsonify, request, current_app
import os
import sys
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, Any, List, Optional
import threading

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import optimization modules
from xgboost_optimization import XGBoostOptimizer, run_xgboost_optimization
from adaptive_tuning import AdaptiveParameterTuner, perform_adaptive_tuning
from model_utils import evaluate_model, save_model, load_model_with_metadata
from market_condition_monitor import MarketConditionMonitor

# Create the blueprint
ml_optimization_bp = Blueprint('ml_optimization', __name__)

# Active optimization processes
active_processes = {}
# Active adaptive tuning processes
adaptive_tuning_processes = {}

@ml_optimization_bp.route('/start', methods=['POST'])
def start_optimization():
    """Start a new optimization process"""
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
        optimization_type = data.get('optimizationType', 'all')
        
        if not symbol or not timeframe:
            return jsonify({
                'success': False,
                'error': 'Symbol and timeframe are required'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Check if an optimization is already running for this symbol/timeframe
        process_key = f"{symbol}_{timeframe}_{optimization_type}"
        if process_key in active_processes and active_processes[process_key]['status'] == 'running':
            return jsonify({
                'success': False,
                'error': f'Optimization already running for {symbol} {timeframe}'
            }), 409
        
        # Start optimization in a background thread
        thread = threading.Thread(
            target=run_optimization_process,
            args=(symbol, timeframe, optimization_type),
            daemon=True
        )
        
        # Track the process
        active_processes[process_key] = {
            'symbol': symbol,
            'timeframe': timeframe,
            'optimizationType': optimization_type,
            'status': 'running',
            'startedAt': datetime.now().isoformat(),
            'thread': thread
        }
        
        # Start the thread
        thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Optimization started for {symbol} {timeframe}',
            'processKey': process_key
        })
        
    except Exception as e:
        logging.error(f"Error starting optimization: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/status', methods=['GET'])
def optimization_status():
    """Get status of active optimization processes"""
    try:
        # Filter out thread objects for JSON serialization
        status_info = {}
        for key, process in active_processes.items():
            status_info[key] = {k: v for k, v in process.items() if k != 'thread'}
        
        return jsonify({
            'success': True,
            'activeProcesses': status_info
        })
        
    except Exception as e:
        logging.error(f"Error getting optimization status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/cancel/<process_key>', methods=['POST'])
def cancel_optimization(process_key):
    """Cancel an active optimization process"""
    try:
        if process_key not in active_processes:
            return jsonify({
                'success': False,
                'error': f'Process {process_key} not found'
            }), 404
        
        # Mark as cancelled (threads can't be forcibly stopped in Python,
        # but the process can check this flag and exit gracefully)
        active_processes[process_key]['status'] = 'cancelled'
        
        return jsonify({
            'success': True,
            'message': f'Process {process_key} marked for cancellation'
        })
        
    except Exception as e:
        logging.error(f"Error cancelling optimization: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/results/<symbol>/<timeframe>', methods=['GET'])
def get_optimization_results(symbol, timeframe):
    """Get results of optimization for a specific symbol and timeframe"""
    try:
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Get list of all optimized models for this symbol/timeframe
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        results = []
        
        # Check if directory exists
        if not os.path.exists(model_dir):
            return jsonify({
                'success': True,
                'data': []
            })
        
        # Look for metadata files
        for filename in os.listdir(model_dir):
            if not filename.endswith('_metadata.json'):
                continue
                
            if symbol in filename and timeframe in filename:
                try:
                    with open(os.path.join(model_dir, filename), 'r') as f:
                        metadata = json.load(f)
                        
                    # Extract optimization type from filename
                    opt_type = 'standard'
                    if 'grid_search' in filename:
                        opt_type = 'grid_search'
                    elif 'random_search' in filename:
                        opt_type = 'random_search'
                    elif 'bayesian' in filename:
                        opt_type = 'bayesian'
                    elif 'baseline' in filename:
                        opt_type = 'baseline'
                        
                    # Add to results
                    results.append({
                        'symbol': metadata.get('symbol', symbol),
                        'timeframe': metadata.get('timeframe', timeframe),
                        'optimizationType': opt_type,
                        'accuracy': metadata.get('performance', {}).get('accuracy', 0),
                        'f1Score': metadata.get('performance', {}).get('f1_score', 0),
                        'trainingDate': metadata.get('training_date', ''),
                        'params': metadata.get('params', {})
                    })
                except Exception as e:
                    logging.error(f"Error reading metadata file {filename}: {str(e)}")
        
        return jsonify({
            'success': True,
            'data': results
        })
        
    except Exception as e:
        logging.error(f"Error getting optimization results: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/compare/<symbol>/<timeframe>', methods=['GET'])
def compare_optimization_methods(symbol, timeframe):
    """Compare different optimization methods for a symbol and timeframe"""
    try:
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Get results for each optimization method
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        comparison = {}
        
        # Check for each optimization type
        for opt_type in ['baseline', 'grid_search', 'random_search', 'bayesian']:
            metadata_path = os.path.join(model_dir, f'xgboost_{symbol}_{timeframe}_{opt_type}_metadata.json')
            
            if os.path.exists(metadata_path):
                with open(metadata_path, 'r') as f:
                    metadata = json.load(f)
                
                comparison[opt_type] = {
                    'accuracy': metadata.get('performance', {}).get('accuracy', 0),
                    'precision': metadata.get('performance', {}).get('precision', 0),
                    'recall': metadata.get('performance', {}).get('recall', 0),
                    'f1Score': metadata.get('performance', {}).get('f1_score', 0),
                    'params': metadata.get('params', {})
                }
        
        # Calculate improvements over baseline
        if 'baseline' in comparison:
            baseline_accuracy = comparison['baseline']['accuracy']
            
            for opt_type in ['grid_search', 'random_search', 'bayesian']:
                if opt_type in comparison:
                    accuracy = comparison[opt_type]['accuracy']
                    improvement = (accuracy - baseline_accuracy) / baseline_accuracy if baseline_accuracy > 0 else 0
                    comparison[opt_type]['improvement'] = improvement
        
        return jsonify({
            'success': True,
            'data': comparison
        })
        
    except Exception as e:
        logging.error(f"Error comparing optimization methods: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/parameters', methods=['GET'])
def get_optimization_parameters():
    """Get default parameters for optimization"""
    try:
        # Grid search parameters
        grid_search_params = {
            'max_depth': [3, 4, 5, 6, 7, 8],
            'learning_rate': [0.01, 0.05, 0.1, 0.2],
            'min_child_weight': [1, 2, 3, 4],
            'gamma': [0, 0.1, 0.2, 0.3],
            'subsample': [0.7, 0.8, 0.9, 1.0],
            'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
            'n_estimators': [100, 200, 300]
        }
        
        # Random search parameters
        random_search_params = {
            'max_depth': ('int_uniform', 3, 10),
            'learning_rate': ('uniform', 0.01, 0.3),
            'min_child_weight': ('int_uniform', 1, 6),
            'gamma': ('uniform', 0, 0.5),
            'subsample': ('uniform', 0.6, 1.0),
            'colsample_bytree': ('uniform', 0.6, 1.0),
            'n_estimators': ('int_uniform', 50, 500)
        }
        
        # Bayesian optimization parameters
        bayesian_params = {
            'max_depth': (3, 10),
            'learning_rate': (0.01, 0.3),
            'min_child_weight': (1, 6),
            'gamma': (0, 0.5),
            'subsample': (0.6, 1.0),
            'colsample_bytree': (0.6, 1.0),
            'n_estimators': (50, 500)
        }
        
        return jsonify({
            'success': True,
            'data': {
                'grid_search': grid_search_params,
                'random_search': random_search_params,
                'bayesian': bayesian_params
            }
        })
        
    except Exception as e:
        logging.error(f"Error getting optimization parameters: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def run_optimization_process(symbol, timeframe, optimization_type):
    """
    Run the optimization process in a background thread
    
    Args:
        symbol: Trading pair symbol
        timeframe: Timeframe
        optimization_type: Type of optimization to run
    """
    process_key = f"{symbol}_{timeframe}_{optimization_type}"
    
    try:
        logging.info(f"Starting optimization process for {symbol} {timeframe} ({optimization_type})")
        
        # Run the optimization
        run_xgboost_optimization(
            symbol=symbol,
            timeframe=timeframe,
            optimization_type=optimization_type
        )
        
        # Update status
        if process_key in active_processes:
            active_processes[process_key]['status'] = 'completed'
            active_processes[process_key]['completedAt'] = datetime.now().isoformat()
            
        logging.info(f"Optimization process completed for {symbol} {timeframe} ({optimization_type})")
        
    except Exception as e:
        logging.error(f"Error in optimization process for {symbol} {timeframe}: {str(e)}")
        
        # Update status
        if process_key in active_processes:
            active_processes[process_key]['status'] = 'failed'
            active_processes[process_key]['error'] = str(e)
            active_processes[process_key]['completedAt'] = datetime.now().isoformat()

@ml_optimization_bp.route('/adaptive-tuning/start', methods=['POST'])
def start_adaptive_tuning():
    """Start adaptive hyperparameter tuning for an existing model"""
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
        
        if not symbol or not timeframe:
            return jsonify({
                'success': False,
                'error': 'Symbol and timeframe are required'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Check if adaptive tuning is already running for this symbol/timeframe
        process_key = f"{symbol}_{timeframe}_adaptive"
        if process_key in adaptive_tuning_processes and adaptive_tuning_processes[process_key]['status'] == 'running':
            return jsonify({
                'success': False,
                'error': f'Adaptive tuning already running for {symbol} {timeframe}'
            }), 409
        
        # Start adaptive tuning in a background thread
        thread = threading.Thread(
            target=run_adaptive_tuning_process,
            args=(symbol, timeframe),
            daemon=True
        )
        
        # Track the process
        adaptive_tuning_processes[process_key] = {
            'symbol': symbol,
            'timeframe': timeframe,
            'status': 'running',
            'startedAt': datetime.now().isoformat(),
            'thread': thread
        }
        
        # Start the thread
        thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Adaptive tuning started for {symbol} {timeframe}',
            'processKey': process_key
        })
        
    except Exception as e:
        logging.error(f"Error starting adaptive tuning: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/adaptive-tuning/status', methods=['GET'])
def adaptive_tuning_status():
    """Get status of active adaptive tuning processes"""
    try:
        # Filter out thread objects for JSON serialization
        status_info = {}
        for key, process in adaptive_tuning_processes.items():
            status_info[key] = {k: v for k, v in process.items() if k != 'thread'}
        
        return jsonify({
            'success': True,
            'activeProcesses': status_info
        })
        
    except Exception as e:
        logging.error(f"Error getting adaptive tuning status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/adaptive-tuning/history/<symbol>/<timeframe>', methods=['GET'])
def get_adaptive_tuning_history(symbol, timeframe):
    """Get history of adaptive tuning for a specific symbol and timeframe"""
    try:
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Get list of all adapted models for this symbol/timeframe
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        results = []
        
        # Check if directory exists
        if not os.path.exists(model_dir):
            return jsonify({
                'success': True,
                'data': []
            })
        
        # Look for metadata files
        for filename in os.listdir(model_dir):
            if not filename.endswith('_metadata.json'):
                continue
                
            if symbol in filename and timeframe in filename and 'adapted' in filename:
                try:
                    with open(os.path.join(model_dir, filename), 'r') as f:
                        metadata = json.load(f)
                        
                    # Add to results
                    results.append({
                        'modelId': metadata.get('modelId', ''),
                        'symbol': metadata.get('symbol', symbol),
                        'timeframe': metadata.get('timeframe', timeframe),
                        'baseModelType': metadata.get('baseModelType', 'unknown'),
                        'accuracy': metadata.get('performance', {}).get('accuracy', 0),
                        'f1Score': metadata.get('performance', {}).get('f1_score', 0),
                        'trainingDate': metadata.get('training_date', ''),
                        'adaptationCount': metadata.get('adaptiveInfo', {}).get('adaptationCount', 0),
                        'params': metadata.get('params', {}),
                        'previousParams': metadata.get('previousParams', {})
                    })
                except Exception as e:
                    logging.error(f"Error reading metadata file {filename}: {str(e)}")
        
        # Sort by adaptation time (newest first)
        results.sort(key=lambda x: x.get('trainingDate', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'data': results
        })
        
    except Exception as e:
        logging.error(f"Error getting adaptive tuning history: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/adaptive-tuning/check-needed/<symbol>/<timeframe>', methods=['GET'])
def check_adaptive_tuning_needed(symbol, timeframe):
    """Check if adaptive tuning is needed for a specific symbol and timeframe"""
    try:
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Create base optimizer
        base_optimizer = XGBoostOptimizer(symbol, timeframe)
        
        # Create adaptive tuner
        adaptive_tuner = AdaptiveParameterTuner(base_optimizer)
        
        # Check if adaptation is needed
        adaptation_needed = adaptive_tuner.should_adapt_parameters()
        
        if adaptation_needed:
            # Get performance history to explain why
            adaptive_tuner.load_performance_history()
            recent_performance = sorted(adaptive_tuner.performance_history, 
                key=lambda x: x.get('timestamp', ''), reverse=True)[:5]
            
            # Get market conditions
            market_conditions = adaptive_tuner.load_market_conditions()
            recent_market = market_conditions[:2] if market_conditions else []
            
            return jsonify({
                'success': True,
                'adaptationNeeded': True,
                'reason': {
                    'performanceHistory': recent_performance[:2],
                    'marketConditions': recent_market
                }
            })
        else:
            return jsonify({
                'success': True,
                'adaptationNeeded': False
            })
            
    except Exception as e:
        logging.error(f"Error checking if adaptive tuning is needed: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def run_adaptive_tuning_process(symbol, timeframe):
    """
    Run the adaptive tuning process in a background thread
    
    Args:
        symbol: Trading pair symbol
        timeframe: Timeframe
    """
    process_key = f"{symbol}_{timeframe}_adaptive"
    
    try:
        logging.info(f"Starting adaptive tuning process for {symbol} {timeframe}")
        
        # Run the adaptive tuning
        result = perform_adaptive_tuning(
            symbol=symbol,
            timeframe=timeframe
        )
        
        # Update status
        if process_key in adaptive_tuning_processes:
            if result.get('success'):
                adaptive_tuning_processes[process_key]['status'] = 'completed'
                adaptive_tuning_processes[process_key]['adapted'] = result.get('adapted', False)
                adaptive_tuning_processes[process_key]['modelId'] = result.get('model_id', '')
                if result.get('adapted'):
                    adaptive_tuning_processes[process_key]['performance'] = result.get('performance', {})
            else:
                adaptive_tuning_processes[process_key]['status'] = 'failed'
                adaptive_tuning_processes[process_key]['error'] = result.get('error', 'Unknown error')
                
            adaptive_tuning_processes[process_key]['completedAt'] = datetime.now().isoformat()
            
        logging.info(f"Adaptive tuning process completed for {symbol} {timeframe}")
        
    except Exception as e:
        logging.error(f"Error in adaptive tuning process for {symbol} {timeframe}: {str(e)}")
        
        # Update status
        if process_key in adaptive_tuning_processes:
            adaptive_tuning_processes[process_key]['status'] = 'failed'
            adaptive_tuning_processes[process_key]['error'] = str(e)
            adaptive_tuning_processes[process_key]['completedAt'] = datetime.now().isoformat()

# Market Condition Monitor instance
market_monitor = None
market_monitor_config_path = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
    'config', 
    'market_monitor.json'
)

@ml_optimization_bp.route('/market-monitor/start', methods=['POST'])
def start_market_monitor():
    """Start the market condition monitoring service"""
    global market_monitor
    
    try:
        data = request.json or {}
        
        # Check if already running
        if market_monitor and market_monitor.running:
            return jsonify({
                'success': False,
                'error': 'Market condition monitor is already running'
            }), 409
        
        # Create config directory if it doesn't exist
        config_dir = os.path.dirname(market_monitor_config_path)
        os.makedirs(config_dir, exist_ok=True)
        
        # Create or update configuration if parameters are provided
        if data.get('config'):
            with open(market_monitor_config_path, 'w') as f:
                json.dump(data['config'], f, indent=2)
        
        # Start the monitor
        market_monitor = MarketConditionMonitor(config_path=market_monitor_config_path)
        
        # Add monitored assets if provided
        if data.get('assets'):
            for asset in data['assets']:
                symbol = asset.get('symbol', '').replace('/', '').lower()
                timeframe = asset.get('timeframe', '1h')
                market_monitor.add_asset(symbol, timeframe)
        
        # Start monitoring
        market_monitor.start_monitoring()
        
        return jsonify({
            'success': True,
            'message': 'Market condition monitor started',
            'monitored_assets': market_monitor.monitored_assets
        })
        
    except Exception as e:
        logging.error(f"Error starting market condition monitor: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-monitor/stop', methods=['POST'])
def stop_market_monitor():
    """Stop the market condition monitoring service"""
    global market_monitor
    
    try:
        # Check if running
        if not market_monitor or not market_monitor.running:
            return jsonify({
                'success': False,
                'error': 'Market condition monitor is not running'
            }), 400
        
        # Stop the monitor
        market_monitor.stop_monitoring()
        
        return jsonify({
            'success': True,
            'message': 'Market condition monitor stopped'
        })
        
    except Exception as e:
        logging.error(f"Error stopping market condition monitor: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-monitor/status', methods=['GET'])
def market_monitor_status():
    """Get status of the market condition monitor"""
    global market_monitor
    
    try:
        if not market_monitor:
            return jsonify({
                'success': True,
                'running': False,
                'message': 'Market condition monitor not initialized'
            })
        
        return jsonify({
            'success': True,
            'running': market_monitor.running,
            'monitored_assets': market_monitor.monitored_assets,
            'condition_changes': market_monitor.condition_changes,
            'queue_size': market_monitor.retrain_queue.qsize() if market_monitor.running else 0
        })
        
    except Exception as e:
        logging.error(f"Error getting market monitor status: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-monitor/assets', methods=['POST'])
def add_monitored_asset():
    """Add an asset to monitor"""
    global market_monitor
    
    try:
        data = request.json
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Required parameters
        symbol = data.get('symbol')
        timeframe = data.get('timeframe', '1h')
        
        if not symbol:
            return jsonify({
                'success': False,
                'error': 'Symbol is required'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Initialize monitor if not running
        if not market_monitor:
            market_monitor = MarketConditionMonitor(config_path=market_monitor_config_path)
        
        # Add asset
        market_monitor.add_asset(symbol, timeframe)
        
        # Start monitoring if not already running
        if not market_monitor.running:
            market_monitor.start_monitoring()
        
        # Save configuration
        market_monitor.save_config(market_monitor_config_path)
        
        return jsonify({
            'success': True,
            'message': f'Added {symbol} {timeframe} to monitored assets',
            'monitored_assets': market_monitor.monitored_assets
        })
        
    except Exception as e:
        logging.error(f"Error adding monitored asset: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-monitor/assets/<symbol>/<timeframe>', methods=['DELETE'])
def remove_monitored_asset(symbol, timeframe):
    """Remove an asset from monitoring"""
    global market_monitor
    
    try:
        # Check if monitor exists
        if not market_monitor:
            return jsonify({
                'success': False,
                'error': 'Market condition monitor not initialized'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # Remove asset
        market_monitor.remove_asset(symbol, timeframe)
        
        # Save configuration
        market_monitor.save_config(market_monitor_config_path)
        
        return jsonify({
            'success': True,
            'message': f'Removed {symbol} {timeframe} from monitored assets',
            'monitored_assets': market_monitor.monitored_assets
        })
        
    except Exception as e:
        logging.error(f"Error removing monitored asset: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-monitor/check', methods=['POST'])
def check_market_conditions():
    """Check all monitored assets for significant market condition changes"""
    global market_monitor
    
    try:
        # Check if monitor exists
        if not market_monitor:
            return jsonify({
                'success': False,
                'error': 'Market condition monitor not initialized'
            }), 400
        
        # Check all assets
        results = market_monitor.check_all_assets()
        
        return jsonify({
            'success': True,
            'results': results
        })
        
    except Exception as e:
        logging.error(f"Error checking market conditions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/market-conditions', methods=['GET'])
def get_market_conditions():
    """Get market conditions for a symbol and timeframe"""
    try:
        symbol = request.args.get('symbol')
        timeframe = request.args.get('timeframe')
        limit = int(request.args.get('limit', 10))
        
        if not symbol or not timeframe:
            return jsonify({
                'success': False,
                'error': 'Symbol and timeframe are required'
            }), 400
        
        # Normalize symbol format
        symbol = symbol.replace('/', '').lower()
        
        # In a real implementation, this would query the database for market conditions
        # For now, we'll return some sample data from the model performance records
        try:
            from shared.database import get_db_connection
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Query market conditions from database
            cursor.execute(
                """
                SELECT * FROM market_conditions 
                WHERE symbol = %s AND timeframe = %s
                ORDER BY timestamp DESC
                LIMIT %s
                """,
                (symbol, timeframe, limit)
            )
            
            rows = cursor.fetchall()
            conditions = []
            
            for row in rows:
                conditions.append({
                    'symbol': row['symbol'],
                    'timeframe': row['timeframe'],
                    'timestamp': row['timestamp'].isoformat(),
                    'volatility': float(row['volatility']),
                    'volume': float(row['volume']),
                    'trendDirection': int(row['trend_direction']),
                    'trendStrength': float(row['trend_strength'])
                })
                
            return jsonify({
                'success': True,
                'data': conditions
            })
                
        except Exception as db_error:
            logging.error(f"Database error: {str(db_error)}")
            
            # Fallback to sample data if database query fails
            current_time = datetime.now()
            conditions = []
            
            for i in range(limit):
                timestamp = current_time - timedelta(hours=i)
                
                # Generate some realistic values
                import random
                volatility = 0.1 + random.random() * 0.3  # 0.1 to 0.4
                volume = 100000 + random.random() * 50000  # 100k to 150k
                trend_direction = 1 if random.random() > 0.5 else -1
                trend_strength = random.random() * 0.8  # 0 to 0.8
                
                conditions.append({
                    'symbol': symbol,
                    'timeframe': timeframe,
                    'timestamp': timestamp.isoformat(),
                    'volatility': volatility,
                    'volume': volume,
                    'trendDirection': trend_direction,
                    'trendStrength': trend_strength
                })
            
            return jsonify({
                'success': True,
                'source': 'sample_data',
                'data': conditions
            })
        
    except Exception as e:
        logging.error(f"Error getting market conditions: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/retraining-events', methods=['POST'])
def record_retraining_event():
    """Record a retraining event"""
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
        method = data.get('method')
        market_conditions = data.get('market_conditions')
        
        if not all([symbol, timeframe, method]):
            return jsonify({
                'success': False,
                'error': 'Symbol, timeframe, and method are required'
            }), 400
        
        # Store the event in database
        try:
            from shared.database import get_db_connection
            connection = get_db_connection()
            cursor = connection.cursor()
            
            # Insert retraining event
            cursor.execute(
                """
                INSERT INTO retraining_events 
                (symbol, timeframe, method, market_conditions, result, created_at)
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING id
                """,
                (
                    symbol, 
                    timeframe, 
                    method, 
                    json.dumps(market_conditions), 
                    json.dumps(data.get('result', {})),
                    datetime.now()
                )
            )
            
            event_id = cursor.fetchone()['id']
            connection.commit()
            
            return jsonify({
                'success': True,
                'message': 'Retraining event recorded',
                'eventId': event_id
            })
                
        except Exception as db_error:
            logging.error(f"Database error recording retraining event: {str(db_error)}")
            
            # Log the event even if database fails
            logging.info(f"Retraining event for {symbol} {timeframe} using {method}: {json.dumps(data)}")
            
            return jsonify({
                'success': True,
                'message': 'Retraining event logged (database error)',
                'error': str(db_error)
            })
        
    except Exception as e:
        logging.error(f"Error recording retraining event: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@ml_optimization_bp.route('/retraining-events', methods=['GET'])
def get_retraining_events():
    """Get retraining events"""
    try:
        # Parse query parameters
        symbol = request.args.get('symbol')
        timeframe = request.args.get('timeframe')
        method = request.args.get('method')
        limit = request.args.get('limit', default=50, type=int)
        offset = request.args.get('offset', default=0, type=int)
        
        # Build query
        query = "SELECT * FROM retraining_events WHERE 1=1"
        params = []
        
        if symbol:
            query += " AND symbol = %s"
            params.append(symbol)
            
        if timeframe:
            query += " AND timeframe = %s"
            params.append(timeframe)
            
        if method:
            query += " AND method = %s"
            params.append(method)
        
        # Add ordering and pagination
        query += " ORDER BY created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])
        
        # Execute query
        try:
            from shared.database import get_db_connection
            connection = get_db_connection()
            cursor = connection.cursor()
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            
            # Convert row objects to dictionaries
            events = []
            for row in results:
                event = dict(row)
                # Parse JSON fields
                if 'market_conditions' in event and event['market_conditions']:
                    event['market_conditions'] = json.loads(event['market_conditions'])
                if 'result' in event and event['result']:
                    event['result'] = json.loads(event['result'])
                events.append(event)
            
            # Get total count for pagination
            count_query = "SELECT COUNT(*) as total FROM retraining_events WHERE 1=1"
            count_params = []
            
            if symbol:
                count_query += " AND symbol = %s"
                count_params.append(symbol)
                
            if timeframe:
                count_query += " AND timeframe = %s"
                count_params.append(timeframe)
                
            if method:
                count_query += " AND method = %s"
                count_params.append(method)
            
            cursor.execute(count_query, count_params)
            total = cursor.fetchone()['total']
            
            return jsonify({
                'success': True,
                'data': {
                    'events': events,
                    'pagination': {
                        'total': total,
                        'limit': limit,
                        'offset': offset
                    }
                }
            })
                
        except Exception as db_error:
            logging.error(f"Database error retrieving retraining events: {str(db_error)}")
            return jsonify({
                'success': False,
                'error': f"Database error: {str(db_error)}"
            }), 500
        
    except Exception as e:
        logging.error(f"Error retrieving retraining events: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

def register_routes(app):
    """
    Register the ML optimization routes with the Flask application
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(ml_optimization_bp, url_prefix='/api/ml/optimization')