#!/usr/bin/env python3
"""
Adaptive Hyperparameter Tuning Module

This module enhances the XGBoost optimization system with real-time adaptive tuning capabilities:
1. Performance-based parameter adjustment
2. Incremental learning with new data
3. Automatic parameter range exploration
4. Feedback-driven optimization

It integrates with the existing XGBoost optimization framework while adding adaptive capabilities.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union, Callable
from datetime import datetime, timedelta
import requests
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import xgboost as xgb
from hyperopt import hp, space_eval
from copy import deepcopy

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'adaptive_tuning.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Import helpers from other modules
from model_utils import evaluate_model, save_model, load_model_with_metadata
from xgboost_optimization import XGBoostOptimizer

class AdaptiveParameterTuner:
    """
    Adaptive parameter tuning system that can modify hyperparameters in real-time
    based on model performance and market conditions.
    """
    
    def __init__(self, 
                 base_optimizer: XGBoostOptimizer,
                 performance_threshold: float = 0.05,
                 min_data_points: int = 5,
                 adaptation_interval: int = 24,  # hours
                 api_base_url: str = 'http://localhost:3000/api/ml/optimization'):
        """
        Initialize the adaptive tuner
        
        Args:
            base_optimizer: The base XGBoostOptimizer instance
            performance_threshold: Minimum performance change to trigger adaptation (fraction)
            min_data_points: Minimum number of performance data points needed before adaptation
            adaptation_interval: Minimum hours between adaptations
            api_base_url: Base URL for the ML optimization API
        """
        self.optimizer = base_optimizer
        self.performance_threshold = performance_threshold
        self.min_data_points = min_data_points
        self.adaptation_interval = adaptation_interval
        self.api_base_url = api_base_url
        self.symbol = base_optimizer.symbol
        self.timeframe = base_optimizer.timeframe
        self.logger = logging.getLogger(f"{__name__}.{self.symbol}_{self.timeframe}")
        
        # Track performance history
        self.performance_history = []
        self.last_adaptation_time = None
        self.adaptation_count = 0
        
        # Parameter exploration ranges
        self.parameter_ranges = {
            'max_depth': {'min': 3, 'max': 15, 'step': 1, 'type': 'int'},
            'learning_rate': {'min': 0.001, 'max': 0.5, 'scale': 'log', 'type': 'float'},
            'min_child_weight': {'min': 1, 'max': 10, 'step': 1, 'type': 'int'},
            'gamma': {'min': 0, 'max': 1.0, 'type': 'float'},
            'subsample': {'min': 0.5, 'max': 1.0, 'type': 'float'},
            'colsample_bytree': {'min': 0.5, 'max': 1.0, 'type': 'float'},
            'n_estimators': {'min': 50, 'max': 1000, 'step': 50, 'type': 'int'},
        }
    
    def load_performance_history(self) -> List[Dict[str, Any]]:
        """
        Load model performance history from the database
        
        Returns:
            List of performance records
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/model-performance/{self.symbol}/{self.timeframe}",
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('success') and 'data' in data:
                self.performance_history = data['data']
                self.logger.info(f"Loaded {len(self.performance_history)} performance records")
                return self.performance_history
            else:
                self.logger.warning("Failed to load performance history")
                return []
                
        except Exception as e:
            self.logger.error(f"Error loading performance history: {str(e)}")
            return []
    
    def load_market_conditions(self) -> List[Dict[str, Any]]:
        """
        Load recent market conditions from the database
        
        Returns:
            List of market condition records
        """
        try:
            response = requests.get(
                f"{self.api_base_url}/market-conditions/{self.symbol}/{self.timeframe}",
                timeout=10
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('success') and 'data' in data:
                return data['data']
            else:
                self.logger.warning("Failed to load market conditions")
                return []
                
        except Exception as e:
            self.logger.error(f"Error loading market conditions: {str(e)}")
            return []
    
    def should_adapt_parameters(self) -> bool:
        """
        Determine if parameters should be adapted based on performance history and timing
        
        Returns:
            Boolean indicating whether adaptation should occur
        """
        # Check timing - don't adapt too frequently
        if self.last_adaptation_time:
            hours_since_last = (datetime.now() - self.last_adaptation_time).total_seconds() / 3600
            if hours_since_last < self.adaptation_interval:
                self.logger.info(f"Too soon to adapt (last adaptation {hours_since_last:.1f} hours ago)")
                return False
        
        # Load performance history if needed
        if not self.performance_history:
            self.load_performance_history()
            
        # Check if we have enough data
        if len(self.performance_history) < self.min_data_points:
            self.logger.info(f"Not enough performance data ({len(self.performance_history)} < {self.min_data_points})")
            return False
            
        # Check for significant performance degradation
        recent_performance = sorted(self.performance_history, key=lambda x: x.get('timestamp', ''), reverse=True)[:5]
        
        if len(recent_performance) >= 2:
            latest = recent_performance[0]
            previous = recent_performance[1]
            
            latest_f1 = latest.get('f1Score', 0)
            previous_f1 = previous.get('f1Score', 0)
            
            # Skip if latest performance is invalid
            if latest_f1 <= 0:
                return False
                
            # Calculate performance change
            if previous_f1 > 0:
                perf_change = (latest_f1 - previous_f1) / previous_f1
                
                # Adapt if performance degradation exceeds threshold
                if perf_change < -self.performance_threshold:
                    self.logger.info(f"Performance degradation detected: {perf_change:.2%}")
                    return True
            
        # Check market conditions
        market_conditions = self.load_market_conditions()
        if market_conditions and len(market_conditions) >= 2:
            latest = market_conditions[0]
            previous = market_conditions[1]
            
            # Check for significant market condition changes
            volatility_change = abs(latest.get('volatility', 0) - previous.get('volatility', 0))
            volume_change = abs(latest.get('volume', 0) - previous.get('volume', 0)) / max(previous.get('volume', 1), 1)
            trend_change = latest.get('trendDirection', 0) != previous.get('trendDirection', 0)
            
            # Adapt if market conditions changed significantly
            if volatility_change > 0.2 or volume_change > 0.3 or trend_change:
                self.logger.info(f"Significant market condition change detected")
                return True
                
        return False
    
    def get_parameter_adjustment_direction(self) -> Dict[str, float]:
        """
        Determine the direction and magnitude to adjust each parameter
        based on performance history and market conditions
        
        Returns:
            Dictionary of parameters and their adjustment factors
        """
        adjustments = {}
        
        # Default adjustment - no change
        for param in self.parameter_ranges.keys():
            adjustments[param] = 0.0
            
        if not self.performance_history or len(self.performance_history) < 2:
            return adjustments
            
        # Sort by performance (F1 score)
        sorted_performances = sorted(
            self.performance_history, 
            key=lambda x: x.get('f1Score', 0),
            reverse=True
        )
        
        # Compare best and worst performers
        if len(sorted_performances) >= 2:
            best = sorted_performances[0]
            worst = sorted_performances[-1]
            
            best_params = best.get('params', {})
            worst_params = worst.get('params', {})
            
            # Calculate adjustment directions based on differences
            for param in self.parameter_ranges.keys():
                if param in best_params and param in worst_params:
                    # For numerical parameters
                    if self.parameter_ranges[param]['type'] in ('int', 'float'):
                        best_val = float(best_params[param])
                        worst_val = float(worst_params[param])
                        
                        # Set direction towards best value
                        if best_val != worst_val:
                            # Direction: positive means increase, negative means decrease
                            direction = 0.5 if best_val > worst_val else -0.5
                            adjustments[param] = direction
                            
        # Incorporate market conditions into adjustments
        market_conditions = self.load_market_conditions()
        if market_conditions:
            latest = market_conditions[0]
            
            # High volatility: adjust for robustness
            volatility = latest.get('volatility', 0)
            if volatility > 0.5:  # High volatility
                adjustments['min_child_weight'] = 0.3  # More robust (increase)
                adjustments['gamma'] = 0.3  # Increase regularization
                adjustments['subsample'] = 0.3  # More regularization
            elif volatility < 0.2:  # Low volatility
                adjustments['learning_rate'] = 0.2  # Can be more aggressive
                
            # Trend direction affects exploration vs exploitation
            trend_strength = latest.get('trendStrength', 0)
            if trend_strength > 0.7:  # Strong trend
                adjustments['n_estimators'] = 0.3  # More trees for strong trends
                
        return adjustments
    
    def adapt_parameters(self, current_params: Dict[str, Any]) -> Dict[str, Any]:
        """
        Adapt parameters based on performance history and market conditions
        
        Args:
            current_params: Current model parameters
            
        Returns:
            Adapted parameters dictionary
        """
        if not self.should_adapt_parameters():
            return current_params
            
        self.logger.info("Adapting parameters based on performance history and market conditions")
        
        # Get adjustment directions
        adjustments = self.get_parameter_adjustment_direction()
        
        # Create a copy of current parameters
        new_params = deepcopy(current_params)
        
        # Apply adjustments to each parameter
        for param, adjustment in adjustments.items():
            if param not in current_params or param not in self.parameter_ranges:
                continue
                
            # Skip if no adjustment needed
            if adjustment == 0:
                continue
                
            param_range = self.parameter_ranges[param]
            current_value = current_params[param]
            
            # Calculate new value based on parameter type
            if param_range['type'] == 'int':
                step = param_range.get('step', 1)
                # Adjust by adding or subtracting steps based on direction
                steps_to_change = max(1, int(abs(adjustment) * 3))  # Scale by magnitude
                change = steps_to_change * step * (1 if adjustment > 0 else -1)
                new_value = int(current_value) + change
                
                # Ensure within range
                new_value = max(param_range['min'], min(param_range['max'], new_value))
                
            elif param_range['type'] == 'float':
                # For log scale parameters like learning rate
                if param_range.get('scale') == 'log':
                    # Multiplicative change
                    factor = 1.5 if adjustment > 0 else 0.75
                    new_value = current_value * factor
                else:
                    # Linear change
                    range_size = param_range['max'] - param_range['min']
                    change = range_size * adjustment * 0.2  # Scale by 20% of range
                    new_value = current_value + change
                
                # Ensure within range
                new_value = max(param_range['min'], min(param_range['max'], new_value))
                
            # Update parameter
            new_params[param] = new_value
            self.logger.info(f"Adjusted {param}: {current_value} -> {new_value}")
            
        # Record adaptation time
        self.last_adaptation_time = datetime.now()
        self.adaptation_count += 1
        
        return new_params
    
    def apply_adaptation_to_model(self, model_type: str = 'best') -> Dict[str, Any]:
        """
        Load the current best model, adapt its parameters, and save a new version
        
        Args:
            model_type: Type of model to adapt ('bayesian', 'random_search', 'grid_search', or 'best')
            
        Returns:
            Dictionary with new model info and performance metrics
        """
        # Load the current best model
        if model_type == 'best':
            # Find the best performing model
            self.load_performance_history()
            if not self.performance_history:
                self.logger.error("No performance history available")
                return {'success': False, 'error': 'No performance history available'}
                
            # Sort by performance (F1 score)
            sorted_performances = sorted(
                self.performance_history, 
                key=lambda x: x.get('f1Score', 0),
                reverse=True
            )
            
            if not sorted_performances:
                self.logger.error("No model performance records found")
                return {'success': False, 'error': 'No model performance records found'}
                
            best_model_info = sorted_performances[0]
            model_id = best_model_info.get('modelId')
            model_type = best_model_info.get('modelType', 'bayesian')
        else:
            # Use specified model type
            # Find the best model of this specific type
            self.load_performance_history()
            type_models = [p for p in self.performance_history if p.get('modelType') == model_type]
            
            if not type_models:
                self.logger.error(f"No {model_type} models found in performance history")
                return {'success': False, 'error': f'No {model_type} models found'}
                
            # Sort by performance
            sorted_type_models = sorted(type_models, key=lambda x: x.get('f1Score', 0), reverse=True)
            best_model_info = sorted_type_models[0]
            model_id = best_model_info.get('modelId')
            
        # Load the model and its metadata
        try:
            model_info = load_model_with_metadata(
                self.optimizer.model_dir,
                f"xgboost_{self.symbol}_{self.timeframe}_{model_type}",
                with_model=True
            )
            
            if not model_info or 'model' not in model_info:
                self.logger.error(f"Failed to load {model_type} model")
                return {'success': False, 'error': f'Failed to load {model_type} model'}
                
            model = model_info['model']
            current_params = model_info['params']
            
            # Adapt parameters
            new_params = self.adapt_parameters(current_params)
            
            # Train a new model with adapted parameters
            self.optimizer.load_data()  # Ensure data is loaded
            
            # Combine with base parameters
            full_params = {**self.optimizer.base_params, **new_params}
            
            # Train the new model
            new_model = xgb.XGBClassifier(**full_params)
            new_model.fit(
                self.optimizer.X_train, 
                self.optimizer.y_train,
                sample_weight=self.optimizer.sample_weights,
                eval_set=[(self.optimizer.X_test, self.optimizer.y_test)],
                verbose=False
            )
            
            # Evaluate new model
            y_pred = new_model.predict(self.optimizer.X_test)
            accuracy = accuracy_score(self.optimizer.y_test, y_pred)
            precision = precision_score(self.optimizer.y_test, y_pred, average='weighted')
            recall = recall_score(self.optimizer.y_test, y_pred, average='weighted')
            f1 = f1_score(self.optimizer.y_test, y_pred, average='weighted')
            
            self.logger.info(f"Adapted model - Accuracy: {accuracy:.4f}, F1: {f1:.4f}")
            
            # Save the adapted model
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            model_name = f"xgboost_{self.symbol}_{self.timeframe}_{model_type}_adapted_{timestamp}"
            model_path = os.path.join(self.optimizer.model_dir, f"{model_name}.model")
            metadata_path = os.path.join(self.optimizer.model_dir, f"{model_name}_metadata.json")
            
            # Save the model
            new_model.save_model(model_path)
            
            # Generate a unique model ID
            model_id = f"{self.symbol}_{self.timeframe}_{model_type}_adapted_{timestamp}"
            
            # Save metadata
            features = [f"feature_{i}" for i in range(self.optimizer.X_train.shape[1])]
            metadata = {
                'modelId': model_id,
                'symbol': self.symbol,
                'timeframe': self.timeframe,
                'params': new_params,
                'previousParams': current_params,
                'features': features,
                'class_mapping': self.optimizer.class_mapping,
                'performance': {
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1_score': f1
                },
                'adaptiveInfo': {
                    'adaptationCount': self.adaptation_count,
                    'adaptationTime': datetime.now().isoformat(),
                    'previousModelId': best_model_info.get('modelId')
                },
                'training_date': datetime.now().isoformat()
            }
            
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
                
            self.logger.info(f"Saved adapted model to {model_path}")
            
            # Send model performance to API
            try:
                performance_payload = {
                    'modelId': model_id,
                    'symbol': self.symbol,
                    'timeframe': self.timeframe,
                    'modelType': f"{model_type}_adapted",
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1Score': f1,
                    'params': new_params,
                    'trainingDate': datetime.now().isoformat(),
                    'notes': f"Adapted from {model_type} model. Adaptation #{self.adaptation_count}"
                }
                
                response = requests.post(
                    f"{self.api_base_url}/model-performance",
                    json=performance_payload,
                    timeout=10
                )
                response.raise_for_status()
                self.logger.info(f"Recorded model performance in API")
                
            except Exception as e:
                self.logger.error(f"Error sending model performance to API: {str(e)}")
            
            return {
                'success': True,
                'model_id': model_id,
                'model_path': model_path,
                'performance': {
                    'accuracy': accuracy,
                    'precision': precision,
                    'recall': recall,
                    'f1_score': f1
                },
                'params': new_params,
                'previous_params': current_params,
                'adaptation_count': self.adaptation_count
            }
            
        except Exception as e:
            self.logger.error(f"Error applying adaptation: {str(e)}")
            return {'success': False, 'error': str(e)}


def perform_adaptive_tuning(symbol: str, timeframe: str) -> Dict[str, Any]:
    """
    Perform adaptive hyperparameter tuning on existing models for a specific symbol/timeframe
    
    Args:
        symbol: Trading pair symbol (e.g., 'btcusdt')
        timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
        
    Returns:
        Dictionary with results of the adaptation process
    """
    logger.info(f"Starting adaptive tuning for {symbol} on {timeframe} timeframe")
    
    try:
        # Create base optimizer
        from xgboost_optimization import XGBoostOptimizer
        base_optimizer = XGBoostOptimizer(symbol, timeframe)
        
        # Create adaptive tuner
        adaptive_tuner = AdaptiveParameterTuner(base_optimizer)
        
        # Check if adaptation is needed
        if not adaptive_tuner.should_adapt_parameters():
            logger.info("Adaptation not needed at this time")
            return {
                'success': True,
                'adapted': False,
                'message': "Adaptation not needed at this time"
            }
            
        # Apply adaptation to the best model
        result = adaptive_tuner.apply_adaptation_to_model('best')
        
        if result['success']:
            logger.info(f"Successfully adapted model for {symbol} on {timeframe} timeframe")
            
            # Return the result
            return {
                'success': True,
                'adapted': True,
                'model_id': result['model_id'],
                'model_path': result['model_path'],
                'performance': result['performance'],
                'previous_params': result['previous_params'],
                'new_params': result['params'],
                'adaptation_count': result['adaptation_count']
            }
        else:
            logger.error(f"Failed to adapt model: {result.get('error', 'Unknown error')}")
            return {
                'success': False,
                'adapted': False,
                'error': result.get('error', 'Unknown error')
            }
            
    except Exception as e:
        logger.error(f"Error in adaptive tuning: {str(e)}")
        return {
            'success': False,
            'adapted': False,
            'error': str(e)
        }