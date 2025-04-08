#!/usr/bin/env python3
"""
ML Optimization Routes

This module defines Flask routes for ML model optimization.
It provides endpoints for:
1. Starting optimization processes (Grid Search, Random Search, Bayesian)
2. Getting optimization status
3. Tracking optimization results

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

# Create the blueprint
ml_optimization_bp = Blueprint('ml_optimization', __name__)

# Active optimization processes
active_processes = {}

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

def register_routes(app):
    """
    Register the ML optimization routes with the Flask application
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(ml_optimization_bp, url_prefix='/api/ml/optimization')