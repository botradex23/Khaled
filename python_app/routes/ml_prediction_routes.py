"""
ML Prediction Routes

This module defines Flask routes for ML model predictions.
It provides endpoints for:
1. Getting predictions from the XGBoost model for a specific symbol
2. Getting available trained models
3. Getting model metadata and performance metrics

These endpoints are used by the frontend to display ML predictions.
"""

from flask import Blueprint, jsonify, request, current_app
import os
import sys
import logging
import pandas as pd
from typing import Dict, Any, List, Optional

# Add the parent directory to the path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the XGBoost predictor
from predict_xgboost import XGBoostPredictor, get_available_models

# Create the blueprint
ml_prediction_bp = Blueprint('ml_prediction_xgboost', __name__)

# Initialize the XGBoost predictor (shared instance)
predictor = None

def get_predictor() -> XGBoostPredictor:
    """
    Get or initialize the XGBoost predictor.
    
    Returns:
        XGBoostPredictor instance
    """
    global predictor
    
    if predictor is None:
        model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
        predictor = XGBoostPredictor(model_dir)
        
        # Pre-load available models (both standard and balanced)
        models = get_available_models(model_dir, categorize=True)
        
        # Load standard models
        for symbol in models['standard']:
            predictor.load_model(symbol, model_type="standard")
        
        # Load balanced models
        for symbol in models['balanced']:
            predictor.load_model(symbol, model_type="balanced")
    
    return predictor


@ml_prediction_bp.route('/available-models', methods=['GET'])
def available_models():
    """
    Get a list of available trained models.
    
    Returns:
        JSON response with list of symbols that have trained models,
        categorized by model type if requested
    """
    model_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'models')
    
    # Check if we should categorize models
    categorize = request.args.get('categorize', 'false').lower() == 'true'
    
    if categorize:
        models = get_available_models(model_dir, categorize=True)
        return jsonify({
            'success': True,
            'categorized': True,
            'models': models
        })
    else:
        # Get all model names without categorization
        symbols = get_available_models(model_dir)
        return jsonify({
            'success': True,
            'categorized': False,
            'models': symbols
        })


@ml_prediction_bp.route('/model-info/<symbol>', methods=['GET'])
def model_info(symbol: str):
    """
    Get information about a specific model.
    
    Args:
        symbol: Symbol name (e.g., 'btcusdt')
        
    Query Parameters:
        model_type: The type of model to get info for ('standard' or 'balanced')
        compare: If 'true', return info for both models
        
    Returns:
        JSON response with model metadata and performance metrics
    """
    symbol = symbol.lower()
    predictor = get_predictor()
    
    # Get query parameters
    model_type = request.args.get('model_type', 'standard')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # If comparing, return info for both models
    if compare:
        standard_model_key = symbol
        balanced_model_key = f"{symbol}_balanced"
        
        # Load standard model if not already loaded
        if standard_model_key not in predictor.metadata:
            standard_loaded = predictor.load_model(symbol, "standard")
            if not standard_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Standard model for {symbol} not found'
                }), 404
        
        # Load balanced model if not already loaded
        if balanced_model_key not in predictor.metadata:
            balanced_loaded = predictor.load_model(symbol, "balanced")
            if not balanced_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Balanced model for {symbol} not found'
                }), 404
        
        # Add debug logging
        logging.info(f"Available metadata keys: {list(predictor.metadata.keys())}")
        logging.info(f"Looking for standard key: {standard_model_key}")
        logging.info(f"Looking for balanced key: {balanced_model_key}")
        
        # Get metadata for both models
        standard_metadata = predictor.metadata.get(standard_model_key, {})
        balanced_metadata = predictor.metadata.get(balanced_model_key, {})
        
        # Return metadata for both models
        response_data = {
            'success': True,
            'compare': True,
            'symbol': symbol,
            'metadata': {
                'standard': standard_metadata,
                'balanced': balanced_metadata
            }
        }
        
        # Log the response data structure for debugging
        logging.debug(f"Comparison response: {response_data}")
        
        return jsonify(response_data)
    else:
        # Just return info for one model
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        # Load the model if not already loaded
        if model_key not in predictor.metadata:
            success = predictor.load_model(symbol, model_type)
            if not success:
                return jsonify({
                    'success': False,
                    'message': f'{model_type.capitalize()} model for {symbol} not found'
                }), 404
        
        # Return the model metadata
        return jsonify({
            'success': True,
            'symbol': symbol,
            'model_type': model_type,
            'metadata': predictor.metadata[model_key]
        })


@ml_prediction_bp.route('/predict/<symbol>', methods=['POST'])
def predict(symbol: str):
    """
    Make a prediction for a specific symbol.
    
    Args:
        symbol: Symbol name (e.g., 'btcusdt')
        
    Query Parameters:
        model_type: The type of model to use ('standard' or 'balanced')
        compare: If 'true', return predictions from both models
        
    Request body:
        JSON object with market data including technical indicators
        
    Returns:
        JSON response with prediction result
    """
    symbol = symbol.lower()
    predictor = get_predictor()
    
    # Get query parameters
    model_type = request.args.get('model_type', 'standard')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # Get market data from request
    market_data = request.json
    if not market_data:
        return jsonify({
            'success': False,
            'message': 'No market data provided'
        }), 400
    
    # If we need to compare models, use both
    if compare:
        # Load both models if needed
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        if symbol not in predictor.models:
            standard_loaded = predictor.load_model(symbol, "standard")
            if not standard_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Standard model for {symbol} not found'
                }), 404
                
        balanced_key = f"{symbol}_balanced"
        if balanced_key not in predictor.models:
            balanced_loaded = predictor.load_model(symbol, "balanced")
            if not balanced_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Balanced model for {symbol} not found'
                }), 404
        
        # Make predictions with both models
        results = predictor.predict_with_both_models(market_data, symbol)
        
        # Add success flags
        results['standard']['success'] = results['standard']['predicted_class'] is not None
        results['balanced']['success'] = results['balanced']['predicted_class'] is not None
        
        return jsonify({
            'success': True,
            'compare': True,
            'symbol': symbol,
            'predictions': results
        })
    else:
        # Make prediction with just one model type
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        # Load the model if not already loaded
        if model_key not in predictor.models:
            success = predictor.load_model(symbol, model_type)
            if not success:
                return jsonify({
                    'success': False,
                    'message': f'{model_type.capitalize()} model for {symbol} not found'
                }), 404
        
        # Make prediction
        result = predictor.predict(market_data, symbol, model_type)
        
        # Add success flag to result
        result['success'] = result['predicted_class'] is not None
        
        return jsonify(result)


@ml_prediction_bp.route('/batch-predict', methods=['POST'])
def batch_predict():
    """
    Make predictions for multiple symbols in batch.
    
    Query Parameters:
        model_type: The type of model to use ('standard' or 'balanced')
        compare: If 'true', return predictions from both models
    
    Request body:
        JSON object with:
        - data: List of market data objects
        - symbols: List of symbol names
        
    Returns:
        JSON response with list of prediction results
    """
    predictor = get_predictor()
    
    # Get query parameters
    model_type = request.args.get('model_type', 'standard')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # Get batch data from request
    batch_data = request.json
    if (not batch_data or 
        'data' not in batch_data or 
        'symbols' not in batch_data or
        len(batch_data['data']) != len(batch_data['symbols'])):
        return jsonify({
            'success': False,
            'message': 'Invalid batch data format'
        }), 400
    
    market_data_batch = batch_data['data']
    symbols = [symbol.lower() for symbol in batch_data['symbols']]
    
    # If comparing models, we need to load both for each symbol
    if compare:
        # Create a container for results
        comparison_results = {
            'standard': [],
            'balanced': []
        }
        
        # For each symbol and its data
        for market_data, symbol in zip(market_data_batch, symbols):
            # Ensure both models are loaded
            standard_model_key = symbol
            balanced_model_key = f"{symbol}_balanced"
            
            # Load standard model if needed
            if standard_model_key not in predictor.models:
                standard_loaded = predictor.load_model(symbol, "standard")
                if not standard_loaded:
                    return jsonify({
                        'success': False,
                        'message': f'Standard model for {symbol} not found'
                    }), 404
            
            # Load balanced model if needed
            if balanced_model_key not in predictor.models:
                balanced_loaded = predictor.load_model(symbol, "balanced")
                if not balanced_loaded:
                    return jsonify({
                        'success': False,
                        'message': f'Balanced model for {symbol} not found'
                    }), 404
            
            # Make predictions with both models
            result = predictor.predict_with_both_models(market_data, symbol)
            
            # Add success flags
            result['standard']['success'] = result['standard']['predicted_class'] is not None
            result['balanced']['success'] = result['balanced']['predicted_class'] is not None
            
            # Add to results
            comparison_results['standard'].append(result['standard'])
            comparison_results['balanced'].append(result['balanced'])
        
        return jsonify({
            'success': True,
            'compare': True,
            'results': comparison_results
        })
    else:
        # Just use one model type for each symbol
        model_results = []
        
        # Make sure all models are loaded
        for symbol in symbols:
            model_suffix = "_balanced" if model_type == "balanced" else ""
            model_key = f"{symbol}{model_suffix}"
            
            if model_key not in predictor.models:
                success = predictor.load_model(symbol, model_type)
                if not success:
                    return jsonify({
                        'success': False,
                        'message': f'{model_type.capitalize()} model for {symbol} not found'
                    }), 404
        
        # Make predictions for each data point
        for market_data, symbol in zip(market_data_batch, symbols):
            result = predictor.predict(market_data, symbol, model_type)
            result['success'] = result['predicted_class'] is not None
            model_results.append(result)
        
        return jsonify({
            'success': True,
            'model_type': model_type,
            'results': model_results
        })


@ml_prediction_bp.route('/feature-importance/<symbol>', methods=['GET'])
def feature_importance(symbol: str):
    """
    Get feature importance for a specific model.
    
    Args:
        symbol: Symbol name (e.g., 'btcusdt')
        
    Query Parameters:
        model_type: The type of model to get feature importance for ('standard' or 'balanced')
        compare: If 'true', return feature importance for both models
        
    Returns:
        JSON response with feature importance data
    """
    symbol = symbol.lower()
    predictor = get_predictor()
    
    # Get query parameters
    model_type = request.args.get('model_type', 'standard')
    compare = request.args.get('compare', 'false').lower() == 'true'
    
    # Validate model_type
    if model_type not in ['standard', 'balanced']:
        return jsonify({
            'success': False,
            'message': f'Invalid model_type: {model_type}. Must be "standard" or "balanced"'
        }), 400
    
    # If comparing, return feature importance for both models
    if compare:
        standard_model_key = symbol
        balanced_model_key = f"{symbol}_balanced"
        
        # Load standard model if not already loaded
        if standard_model_key not in predictor.metadata:
            standard_loaded = predictor.load_model(symbol, "standard")
            if not standard_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Standard model for {symbol} not found'
                }), 404
        
        # Load balanced model if not already loaded
        if balanced_model_key not in predictor.metadata:
            balanced_loaded = predictor.load_model(symbol, "balanced")
            if not balanced_loaded:
                return jsonify({
                    'success': False,
                    'message': f'Balanced model for {symbol} not found'
                }), 404
        
        # Get metadata for both models
        standard_metadata = predictor.metadata[standard_model_key]
        balanced_metadata = predictor.metadata[balanced_model_key]
        
        # Get or generate feature importance for both models
        standard_feature_importance = {}
        balanced_feature_importance = {}
        
        # For standard model
        if 'feature_importance' in standard_metadata:
            standard_feature_importance = standard_metadata['feature_importance']
        else:
            # Generate placeholder
            standard_feature_importance = {
                'features': predictor.features[standard_model_key],
                'importance': [0.05] * len(predictor.features[standard_model_key])
            }
        
        # For balanced model
        if 'feature_importance' in balanced_metadata:
            balanced_feature_importance = balanced_metadata['feature_importance']
        else:
            # Generate placeholder
            balanced_feature_importance = {
                'features': predictor.features[balanced_model_key],
                'importance': [0.05] * len(predictor.features[balanced_model_key])
            }
        
        return jsonify({
            'success': True,
            'compare': True,
            'symbol': symbol,
            'feature_importance': {
                'standard': standard_feature_importance,
                'balanced': balanced_feature_importance
            }
        })
    else:
        # Just return feature importance for one model
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        # Load the model if not already loaded
        if model_key not in predictor.metadata:
            success = predictor.load_model(symbol, model_type)
            if not success:
                return jsonify({
                    'success': False,
                    'message': f'{model_type.capitalize()} model for {symbol} not found'
                }), 404
        
        # Get the model metadata
        metadata = predictor.metadata[model_key]
        
        # Check if the metadata has feature importance
        if 'feature_importance' not in metadata:
            # We need to generate it - in a real application, this would be pre-computed
            # For this demo, we'll return a placeholder
            feature_importance = {
                'features': predictor.features[model_key],
                'importance': [0.05] * len(predictor.features[model_key])  # Placeholder
            }
        else:
            feature_importance = metadata['feature_importance']
        
        return jsonify({
            'success': True,
            'symbol': symbol,
            'model_type': model_type,
            'feature_importance': feature_importance
        })


def register_routes(app):
    """
    Register the ML prediction routes with the Flask application.
    
    Args:
        app: Flask application instance
    """
    app.register_blueprint(ml_prediction_bp, name='ml_prediction_xgboost_routes', url_prefix='/api/ml/prediction')