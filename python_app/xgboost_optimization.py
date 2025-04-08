#!/usr/bin/env python3
"""
XGBoost Optimization Module

This module implements multiple optimization methods for XGBoost models:
1. Grid Search
2. Random Search 
3. Bayesian Optimization

It also provides functions to track model performance and visualization utilities.
"""

import os
import sys
import time
import json
import logging
import numpy as np
import pandas as pd
import xgboost as xgb
import matplotlib.pyplot as plt
from typing import Dict, List, Tuple, Any, Optional, Union, Callable
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.model_selection import train_test_split, KFold, cross_val_score
from sklearn.preprocessing import StandardScaler
import joblib
import requests
from datetime import datetime
from hyperopt import fmin, tpe, hp, STATUS_OK, Trials
from tqdm import tqdm

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'xgboost_optimization.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Check if we're running in the Python app directory
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import data loading and preprocessing utilities
from data_loader import load_train_test_data, preprocess_data
from model_utils import evaluate_model, save_model, calculate_class_weights, create_sample_weights

class XGBoostOptimizer:
    """
    XGBoost model optimizer that implements multiple hyperparameter tuning methods
    """
    
    def __init__(self, 
                 symbol: str, 
                 timeframe: str, 
                 data_dir: str = 'data/training',
                 model_dir: str = 'models',
                 api_base_url: str = 'http://localhost:3000/api/ml/optimization'):
        """
        Initialize the optimizer
        
        Args:
            symbol: Trading pair symbol (e.g., 'btcusdt')
            timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
            data_dir: Directory containing training data
            model_dir: Directory to save trained models
            api_base_url: Base URL for the ML optimization API
        """
        self.symbol = symbol.lower()
        self.timeframe = timeframe
        self.data_dir = data_dir
        self.model_dir = model_dir
        self.api_base_url = api_base_url
        
        # Ensure directories exist
        os.makedirs(self.model_dir, exist_ok=True)
        
        # Set default parameters
        self.base_params = {
            'objective': 'multi:softmax',
            'num_class': 3,  # BUY, HOLD, SELL
            'eval_metric': 'mlogloss',
            'use_label_encoder': False,
            'verbosity': 0,
            'seed': 42
        }
        
        # Load and preprocess data
        self.logger = logging.getLogger(f"{__name__}.{self.symbol}_{self.timeframe}")
        self.tuning_run_id = None
        
    def load_data(self) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, Dict[int, str]]:
        """
        Load and preprocess data for the specified symbol and timeframe
        
        Returns:
            Tuple of (X_train, X_test, y_train, y_test, class_mapping)
        """
        try:
            # Load the data
            self.logger.info(f"Loading data for {self.symbol} on {self.timeframe} timeframe")
            X_train, X_test, y_train, y_test = load_train_test_data(
                self.data_dir, 
                self.symbol, 
                self.timeframe
            )
            
            # Define class mapping
            class_mapping = {0: 'BUY', 1: 'HOLD', 2: 'SELL'}
            self.num_classes = len(np.unique(y_train))
            self.base_params['num_class'] = self.num_classes
            
            # Store data
            self.X_train, self.X_test, self.y_train, self.y_test = X_train, X_test, y_train, y_test
            self.class_mapping = class_mapping
            self.class_weights = calculate_class_weights(y_train)
            self.sample_weights = create_sample_weights(y_train, self.class_weights)
            
            self.logger.info(f"Data loaded successfully. Training set: {X_train.shape}, Test set: {X_test.shape}")
            return X_train, X_test, y_train, y_test, class_mapping
            
        except Exception as e:
            self.logger.error(f"Error loading data: {str(e)}")
            raise

    def train_baseline_model(self) -> Dict[str, Any]:
        """
        Train a baseline model with default parameters
        
        Returns:
            Dictionary with baseline model and its performance metrics
        """
        self.logger.info("Training baseline model with default parameters")
        
        # Default parameters
        params = {
            **self.base_params,
            'learning_rate': 0.05,
            'max_depth': 6,
            'min_child_weight': 2,
            'gamma': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'scale_pos_weight': 1,
            'n_estimators': 200
        }
        
        # Train the model
        model = xgb.XGBClassifier(**params)
        model.fit(
            self.X_train, 
            self.y_train,
            sample_weight=self.sample_weights,
            eval_set=[(self.X_test, self.y_test)],
            verbose=False
        )
        
        # Evaluate the model
        y_pred = model.predict(self.X_test)
        accuracy = accuracy_score(self.y_test, y_pred)
        precision = precision_score(self.y_test, y_pred, average='weighted')
        recall = recall_score(self.y_test, y_pred, average='weighted')
        f1 = f1_score(self.y_test, y_pred, average='weighted')
        cm = confusion_matrix(self.y_test, y_pred)
        
        self.logger.info(f"Baseline model - Accuracy: {accuracy:.4f}, F1: {f1:.4f}")
        
        baseline_results = {
            'model': model,
            'params': params,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'confusion_matrix': cm.tolist()
        }
        
        self.baseline_results = baseline_results
        return baseline_results
        
    def save_baseline_model(self) -> str:
        """
        Save the baseline model to disk
        
        Returns:
            Path to the saved model
        """
        if not hasattr(self, 'baseline_results'):
            raise ValueError("Baseline model not trained yet")
            
        model = self.baseline_results['model']
        params = self.baseline_results['params']
        model_path = os.path.join(self.model_dir, f'xgboost_{self.symbol}_{self.timeframe}_baseline.model')
        metadata_path = os.path.join(self.model_dir, f'xgboost_{self.symbol}_{self.timeframe}_baseline_metadata.json')
        
        # Save the model
        model.save_model(model_path)
        
        # Save metadata
        features = [f"feature_{i}" for i in range(self.X_train.shape[1])]
        metadata = {
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'params': params,
            'features': features,
            'class_mapping': self.class_mapping,
            'performance': {
                'accuracy': self.baseline_results['accuracy'],
                'precision': self.baseline_results['precision'],
                'recall': self.baseline_results['recall'],
                'f1_score': self.baseline_results['f1_score']
            },
            'training_date': datetime.now().isoformat()
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        self.logger.info(f"Saved baseline model to {model_path}")
        return model_path
    
    def create_tuning_run(self, optimization_type: str) -> int:
        """
        Create a new tuning run record in the database
        
        Args:
            optimization_type: Type of optimization ('grid_search', 'random_search', 'bayesian')
            
        Returns:
            Tuning run ID
        """
        payload = {
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'optimizationType': optimization_type,
            'status': 'running'
        }
        
        try:
            response = requests.post(f"{self.api_base_url}/tuning-runs", json=payload)
            response.raise_for_status()
            data = response.json()
            tuning_run_id = data['data']['id']
            self.tuning_run_id = tuning_run_id
            self.logger.info(f"Created tuning run with ID: {tuning_run_id}")
            return tuning_run_id
        except Exception as e:
            self.logger.error(f"Error creating tuning run: {str(e)}")
            raise
    
    def update_tuning_run(self, updates: Dict[str, Any]) -> None:
        """
        Update the tuning run record in the database
        
        Args:
            updates: Dictionary of fields to update
        """
        if not self.tuning_run_id:
            self.logger.warning("No tuning run ID available, skipping update")
            return
            
        try:
            response = requests.patch(
                f"{self.api_base_url}/tuning-runs/{self.tuning_run_id}", 
                json=updates
            )
            response.raise_for_status()
            self.logger.info(f"Updated tuning run {self.tuning_run_id}")
        except Exception as e:
            self.logger.error(f"Error updating tuning run: {str(e)}")
    
    def complete_tuning_run(self, success: bool, best_params: Dict[str, Any], all_params: List[Dict[str, Any]], 
                           baseline_accuracy: float, best_accuracy: float) -> None:
        """
        Mark a tuning run as completed
        
        Args:
            success: Whether the tuning was successful
            best_params: Best parameters found
            all_params: All parameters and their performance
            baseline_accuracy: Accuracy of the baseline model
            best_accuracy: Best accuracy achieved
        """
        status = 'completed' if success else 'failed'
        improvement = (best_accuracy - baseline_accuracy) / baseline_accuracy if baseline_accuracy > 0 else 0
        
        updates = {
            'status': status,
            'completedAt': datetime.now().isoformat(),
            'bestParams': best_params,
            'allParams': all_params,
            'baselineAccuracy': baseline_accuracy,
            'bestAccuracy': best_accuracy,
            'improvement': improvement
        }
        
        if not success:
            updates['errorMessage'] = 'Optimization failed to improve model performance'
            
        self.update_tuning_run(updates)
    
    def grid_search(self, param_grid: Dict[str, List[Any]], cv: int = 3) -> Dict[str, Any]:
        """
        Perform grid search for hyperparameter optimization
        
        Args:
            param_grid: Dictionary of parameters and their possible values
            cv: Number of cross-validation folds
            
        Returns:
            Dictionary with best model and performance metrics
        """
        self.logger.info("Starting grid search optimization")
        tuning_run_id = self.create_tuning_run('grid_search')
        
        try:
            # Train baseline model if not already done
            if not hasattr(self, 'baseline_results'):
                self.train_baseline_model()
                
            baseline_accuracy = self.baseline_results['accuracy']
            
            # Create parameter combinations
            keys = list(param_grid.keys())
            param_combinations = self._get_param_combinations(param_grid)
            
            self.logger.info(f"Grid search with {len(param_combinations)} parameter combinations")
            
            best_score = -1
            best_params = None
            best_model = None
            all_results = []
            
            # Update tuning run with total combinations
            self.update_tuning_run({
                'allParams': [{
                    'info': f"Starting grid search with {len(param_combinations)} combinations"
                }]
            })
            
            # Perform grid search
            for i, params_dict in enumerate(tqdm(param_combinations, desc="Grid Search")):
                # Combine with base parameters
                full_params = {**self.base_params, **params_dict}
                
                # Train and evaluate model
                model = xgb.XGBClassifier(**full_params)
                
                # Use cross-validation
                kf = KFold(n_splits=cv, shuffle=True, random_state=42)
                cv_scores = []
                
                for train_idx, val_idx in kf.split(self.X_train):
                    X_cv_train, X_cv_val = self.X_train[train_idx], self.X_train[val_idx]
                    y_cv_train, y_cv_val = self.y_train[train_idx], self.y_train[val_idx]
                    
                    # Get sample weights for this fold
                    weights_cv = self.sample_weights[train_idx] if self.sample_weights is not None else None
                    
                    # Train on this fold
                    model.fit(X_cv_train, y_cv_train, sample_weight=weights_cv, verbose=False)
                    
                    # Predict and evaluate
                    y_cv_pred = model.predict(X_cv_val)
                    fold_accuracy = accuracy_score(y_cv_val, y_cv_pred)
                    cv_scores.append(fold_accuracy)
                
                # Calculate average score
                avg_score = np.mean(cv_scores)
                
                # Store result
                result = {
                    'params': params_dict,
                    'accuracy': avg_score,
                    'fold_scores': cv_scores
                }
                all_results.append(result)
                
                # Update best if improved
                if avg_score > best_score:
                    best_score = avg_score
                    best_params = params_dict
                    
                    # Retrain on full training set with best params
                    best_model = xgb.XGBClassifier(**{**self.base_params, **best_params})
                    best_model.fit(
                        self.X_train, 
                        self.y_train, 
                        sample_weight=self.sample_weights,
                        verbose=False
                    )
                
                # Update tuning run periodically
                if (i + 1) % 10 == 0 or (i + 1) == len(param_combinations):
                    progress_update = {
                        'allParams': all_results,
                        'bestAccuracy': best_score,
                        'bestParams': best_params
                    }
                    self.update_tuning_run(progress_update)
            
            # Final evaluation on test set
            y_pred = best_model.predict(self.X_test)
            final_accuracy = accuracy_score(self.y_test, y_pred)
            precision = precision_score(self.y_test, y_pred, average='weighted')
            recall = recall_score(self.y_test, y_pred, average='weighted')
            f1 = f1_score(self.y_test, y_pred, average='weighted')
            cm = confusion_matrix(self.y_test, y_pred)
            
            self.logger.info(f"Grid search completed - Best accuracy: {final_accuracy:.4f}, F1: {f1:.4f}")
            self.logger.info(f"Best parameters: {best_params}")
            
            # Mark tuning run as completed
            self.complete_tuning_run(
                success=True,
                best_params=best_params,
                all_params=all_results,
                baseline_accuracy=baseline_accuracy,
                best_accuracy=final_accuracy
            )
            
            # Return results
            grid_search_results = {
                'model': best_model,
                'params': {**self.base_params, **best_params},
                'accuracy': final_accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'confusion_matrix': cm.tolist(),
                'all_results': all_results
            }
            
            self.grid_search_results = grid_search_results
            return grid_search_results
            
        except Exception as e:
            self.logger.error(f"Grid search failed: {str(e)}")
            self.update_tuning_run({
                'status': 'failed',
                'errorMessage': str(e),
                'completedAt': datetime.now().isoformat()
            })
            raise
    
    def random_search(self, param_distributions: Dict[str, Any], n_iter: int = 50, cv: int = 3) -> Dict[str, Any]:
        """
        Perform random search for hyperparameter optimization
        
        Args:
            param_distributions: Dictionary of parameters and their distributions
            n_iter: Number of random combinations to try
            cv: Number of cross-validation folds
            
        Returns:
            Dictionary with best model and performance metrics
        """
        self.logger.info(f"Starting random search optimization with {n_iter} iterations")
        tuning_run_id = self.create_tuning_run('random_search')
        
        try:
            # Train baseline model if not already done
            if not hasattr(self, 'baseline_results'):
                self.train_baseline_model()
                
            baseline_accuracy = self.baseline_results['accuracy']
            
            best_score = -1
            best_params = None
            best_model = None
            all_results = []
            
            # Update tuning run with total iterations
            self.update_tuning_run({
                'allParams': [{
                    'info': f"Starting random search with {n_iter} iterations"
                }]
            })
            
            # Perform random search
            for i in tqdm(range(n_iter), desc="Random Search"):
                # Generate random parameters
                params_dict = self._sample_parameters(param_distributions)
                
                # Combine with base parameters
                full_params = {**self.base_params, **params_dict}
                
                # Train and evaluate model
                model = xgb.XGBClassifier(**full_params)
                
                # Use cross-validation
                kf = KFold(n_splits=cv, shuffle=True, random_state=42)
                cv_scores = []
                
                for train_idx, val_idx in kf.split(self.X_train):
                    X_cv_train, X_cv_val = self.X_train[train_idx], self.X_train[val_idx]
                    y_cv_train, y_cv_val = self.y_train[train_idx], self.y_train[val_idx]
                    
                    # Get sample weights for this fold
                    weights_cv = self.sample_weights[train_idx] if self.sample_weights is not None else None
                    
                    # Train on this fold
                    model.fit(X_cv_train, y_cv_train, sample_weight=weights_cv, verbose=False)
                    
                    # Predict and evaluate
                    y_cv_pred = model.predict(X_cv_val)
                    fold_accuracy = accuracy_score(y_cv_val, y_cv_pred)
                    cv_scores.append(fold_accuracy)
                
                # Calculate average score
                avg_score = np.mean(cv_scores)
                
                # Store result
                result = {
                    'params': params_dict,
                    'accuracy': avg_score,
                    'fold_scores': cv_scores
                }
                all_results.append(result)
                
                # Update best if improved
                if avg_score > best_score:
                    best_score = avg_score
                    best_params = params_dict
                    
                    # Retrain on full training set with best params
                    best_model = xgb.XGBClassifier(**{**self.base_params, **best_params})
                    best_model.fit(
                        self.X_train, 
                        self.y_train, 
                        sample_weight=self.sample_weights,
                        verbose=False
                    )
                
                # Update tuning run periodically
                if (i + 1) % 5 == 0 or (i + 1) == n_iter:
                    progress_update = {
                        'allParams': all_results,
                        'bestAccuracy': best_score,
                        'bestParams': best_params
                    }
                    self.update_tuning_run(progress_update)
            
            # Final evaluation on test set
            y_pred = best_model.predict(self.X_test)
            final_accuracy = accuracy_score(self.y_test, y_pred)
            precision = precision_score(self.y_test, y_pred, average='weighted')
            recall = recall_score(self.y_test, y_pred, average='weighted')
            f1 = f1_score(self.y_test, y_pred, average='weighted')
            cm = confusion_matrix(self.y_test, y_pred)
            
            self.logger.info(f"Random search completed - Best accuracy: {final_accuracy:.4f}, F1: {f1:.4f}")
            self.logger.info(f"Best parameters: {best_params}")
            
            # Mark tuning run as completed
            self.complete_tuning_run(
                success=True,
                best_params=best_params,
                all_params=all_results,
                baseline_accuracy=baseline_accuracy,
                best_accuracy=final_accuracy
            )
            
            # Return results
            random_search_results = {
                'model': best_model,
                'params': {**self.base_params, **best_params},
                'accuracy': final_accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'confusion_matrix': cm.tolist(),
                'all_results': all_results
            }
            
            self.random_search_results = random_search_results
            return random_search_results
            
        except Exception as e:
            self.logger.error(f"Random search failed: {str(e)}")
            self.update_tuning_run({
                'status': 'failed',
                'errorMessage': str(e),
                'completedAt': datetime.now().isoformat()
            })
            raise
    
    def bayesian_optimization(self, param_space: Dict[str, Any], max_evals: int = 50) -> Dict[str, Any]:
        """
        Perform Bayesian optimization using hyperopt
        
        Args:
            param_space: Dictionary of parameters and their search spaces for hyperopt
            max_evals: Maximum number of evaluations
            
        Returns:
            Dictionary with best model and performance metrics
        """
        from hyperopt import fmin, tpe, hp, STATUS_OK, Trials
        
        self.logger.info(f"Starting Bayesian optimization with {max_evals} evaluations")
        tuning_run_id = self.create_tuning_run('bayesian')
        
        try:
            # Train baseline model if not already done
            if not hasattr(self, 'baseline_results'):
                self.train_baseline_model()
                
            baseline_accuracy = self.baseline_results['accuracy']
            
            # Results storage
            all_results = []
            
            # Update tuning run with total evaluations
            self.update_tuning_run({
                'allParams': [{
                    'info': f"Starting Bayesian optimization with {max_evals} evaluations"
                }]
            })
            
            # Define objective function
            def objective(params):
                # Convert hyperopt params to XGBoost params
                xgb_params = {
                    **self.base_params,
                    'max_depth': int(params['max_depth']),
                    'learning_rate': params['learning_rate'],
                    'min_child_weight': int(params['min_child_weight']),
                    'gamma': params['gamma'],
                    'subsample': params['subsample'],
                    'colsample_bytree': params['colsample_bytree'],
                    'n_estimators': int(params['n_estimators'])
                }
                
                # Train model
                model = xgb.XGBClassifier(**xgb_params)
                
                # Use 3-fold cross-validation
                kf = KFold(n_splits=3, shuffle=True, random_state=42)
                cv_scores = []
                
                for train_idx, val_idx in kf.split(self.X_train):
                    X_cv_train, X_cv_val = self.X_train[train_idx], self.X_train[val_idx]
                    y_cv_train, y_cv_val = self.y_train[train_idx], self.y_train[val_idx]
                    
                    # Get sample weights for this fold
                    weights_cv = self.sample_weights[train_idx] if self.sample_weights is not None else None
                    
                    # Train on this fold
                    model.fit(X_cv_train, y_cv_train, sample_weight=weights_cv, verbose=False)
                    
                    # Predict and evaluate
                    y_cv_pred = model.predict(X_cv_val)
                    fold_accuracy = accuracy_score(y_cv_val, y_cv_pred)
                    cv_scores.append(fold_accuracy)
                
                # Calculate average score
                avg_score = np.mean(cv_scores)
                
                # Store result in a format that can be JSON serialized
                result = {
                    'params': {k: float(v) if isinstance(v, np.float64) else v for k, v in params.items()},
                    'accuracy': float(avg_score),
                    'fold_scores': [float(s) for s in cv_scores]
                }
                all_results.append(result)
                
                # Update tuning run periodically
                if len(all_results) % 5 == 0:
                    # Find best result so far
                    best_idx = np.argmax([r['accuracy'] for r in all_results])
                    best_result = all_results[best_idx]
                    
                    progress_update = {
                        'allParams': all_results,
                        'bestAccuracy': best_result['accuracy'],
                        'bestParams': best_result['params']
                    }
                    self.update_tuning_run(progress_update)
                
                # Return negative score for minimization
                return {'loss': -avg_score, 'status': STATUS_OK}
            
            # Run Bayesian optimization
            trials = Trials()
            best = fmin(
                fn=objective,
                space=param_space,
                algo=tpe.suggest,
                max_evals=max_evals,
                trials=trials,
                verbose=1
            )
            
            # Get best parameters
            best_params = {
                'max_depth': int(best['max_depth']),
                'learning_rate': best['learning_rate'],
                'min_child_weight': int(best['min_child_weight']),
                'gamma': best['gamma'],
                'subsample': best['subsample'],
                'colsample_bytree': best['colsample_bytree'],
                'n_estimators': int(best['n_estimators'])
            }
            
            # Train final model with best parameters
            final_params = {**self.base_params, **best_params}
            best_model = xgb.XGBClassifier(**final_params)
            best_model.fit(
                self.X_train, 
                self.y_train, 
                sample_weight=self.sample_weights,
                verbose=False
            )
            
            # Final evaluation on test set
            y_pred = best_model.predict(self.X_test)
            final_accuracy = accuracy_score(self.y_test, y_pred)
            precision = precision_score(self.y_test, y_pred, average='weighted')
            recall = recall_score(self.y_test, y_pred, average='weighted')
            f1 = f1_score(self.y_test, y_pred, average='weighted')
            cm = confusion_matrix(self.y_test, y_pred)
            
            self.logger.info(f"Bayesian optimization completed - Best accuracy: {final_accuracy:.4f}, F1: {f1:.4f}")
            self.logger.info(f"Best parameters: {best_params}")
            
            # Mark tuning run as completed
            self.complete_tuning_run(
                success=True,
                best_params=best_params,
                all_params=all_results,
                baseline_accuracy=baseline_accuracy,
                best_accuracy=final_accuracy
            )
            
            # Return results
            bayesian_results = {
                'model': best_model,
                'params': final_params,
                'accuracy': final_accuracy,
                'precision': precision,
                'recall': recall,
                'f1_score': f1,
                'confusion_matrix': cm.tolist(),
                'all_results': all_results
            }
            
            self.bayesian_results = bayesian_results
            return bayesian_results
            
        except Exception as e:
            self.logger.error(f"Bayesian optimization failed: {str(e)}")
            self.update_tuning_run({
                'status': 'failed',
                'errorMessage': str(e),
                'completedAt': datetime.now().isoformat()
            })
            raise
    
    def save_optimized_model(self, optimization_type: str) -> str:
        """
        Save the optimized model to disk
        
        Args:
            optimization_type: Type of optimization ('grid_search', 'random_search', 'bayesian')
            
        Returns:
            Path to the saved model
        """
        results_attr = f"{optimization_type}_results"
        if not hasattr(self, results_attr):
            raise ValueError(f"No results available for {optimization_type}")
            
        results = getattr(self, results_attr)
        model = results['model']
        params = results['params']
        
        model_path = os.path.join(self.model_dir, f'xgboost_{self.symbol}_{self.timeframe}_{optimization_type}.model')
        metadata_path = os.path.join(self.model_dir, f'xgboost_{self.symbol}_{self.timeframe}_{optimization_type}_metadata.json')
        
        # Save the model
        model.save_model(model_path)
        
        # Save metadata
        features = [f"feature_{i}" for i in range(self.X_train.shape[1])]
        metadata = {
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'optimization_type': optimization_type,
            'params': params,
            'features': features,
            'class_mapping': self.class_mapping,
            'performance': {
                'accuracy': results['accuracy'],
                'precision': results['precision'],
                'recall': results['recall'],
                'f1_score': results['f1_score']
            },
            'training_date': datetime.now().isoformat()
        }
        
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
            
        self.logger.info(f"Saved optimized model ({optimization_type}) to {model_path}")
        return model_path
    
    def create_performance_comparison(self) -> Dict[str, Any]:
        """
        Create a comparison of performance across different optimization methods
        
        Returns:
            Dictionary with comparison data
        """
        comparison = {}
        
        if hasattr(self, 'baseline_results'):
            comparison['baseline'] = {
                'accuracy': self.baseline_results['accuracy'],
                'precision': self.baseline_results['precision'],
                'recall': self.baseline_results['recall'],
                'f1_score': self.baseline_results['f1_score']
            }
        
        for method in ['grid_search', 'random_search', 'bayesian']:
            results_attr = f"{method}_results"
            if hasattr(self, results_attr):
                results = getattr(self, results_attr)
                comparison[method] = {
                    'accuracy': results['accuracy'],
                    'precision': results['precision'],
                    'recall': results['recall'],
                    'f1_score': results['f1_score']
                }
        
        return comparison
    
    def visualize_performance_comparison(self, save_path: Optional[str] = None) -> str:
        """
        Visualize the performance comparison
        
        Args:
            save_path: Path to save the visualization
            
        Returns:
            Path to the saved visualization
        """
        comparison = self.create_performance_comparison()
        
        # Prepare data for plotting
        methods = list(comparison.keys())
        accuracies = [comparison[m]['accuracy'] for m in methods]
        f1_scores = [comparison[m]['f1_score'] for m in methods]
        
        # Create plot
        plt.figure(figsize=(10, 6))
        x = np.arange(len(methods))
        width = 0.35
        
        plt.bar(x - width/2, accuracies, width, label='Accuracy')
        plt.bar(x + width/2, f1_scores, width, label='F1 Score')
        
        plt.ylabel('Score')
        plt.title(f'Performance Comparison for {self.symbol.upper()} ({self.timeframe})')
        plt.xticks(x, [m.replace('_', ' ').title() for m in methods])
        plt.legend()
        
        plt.ylim(0, 1.0)
        
        # Save the plot
        if save_path is None:
            save_path = os.path.join(self.model_dir, f'{self.symbol}_{self.timeframe}_performance_comparison.png')
            
        plt.savefig(save_path)
        plt.close()
        
        return save_path
    
    def send_model_performance_to_api(self, optimization_type: str, strategy_impact: Dict[str, Any]) -> None:
        """
        Send model performance metrics to the API
        
        Args:
            optimization_type: Type of optimization ('grid_search', 'random_search', 'bayesian')
            strategy_impact: Dictionary with strategy impact metrics
        """
        results_attr = f"{optimization_type}_results"
        if not hasattr(self, results_attr):
            raise ValueError(f"No results available for {optimization_type}")
            
        results = getattr(self, results_attr)
        
        # Prepare payload
        payload = {
            'modelId': f"xgboost_{self.symbol}_{self.timeframe}_{optimization_type}",
            'modelName': f"XGBoost {self.symbol.upper()} {self.timeframe} ({optimization_type})",
            'modelType': optimization_type,
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'strategyType': 'balanced',
            'startDate': strategy_impact.get('startDate', datetime.now().isoformat()),
            'endDate': strategy_impact.get('endDate', datetime.now().isoformat()),
            'accuracy': results['accuracy'],
            'precision': results['precision'],
            'recall': results['recall'],
            'f1Score': results['f1_score'],
            'pnl': strategy_impact.get('pnl', 0),
            'pnlPercent': strategy_impact.get('pnlPercent', 0),
            'winRate': strategy_impact.get('winRate', 0),
            'drawdown': strategy_impact.get('drawdown', 0),
            'winCount': strategy_impact.get('winCount', 0),
            'lossCount': strategy_impact.get('lossCount', 0),
            'isActive': True,
            'isTopPerformer': False,
            'parameters': results['params']
        }
        
        try:
            response = requests.post(
                f"{self.api_base_url}/model-performance", 
                json=payload
            )
            response.raise_for_status()
            self.logger.info(f"Sent model performance metrics to API for {optimization_type}")
        except Exception as e:
            self.logger.error(f"Error sending model performance to API: {str(e)}")
    
    def log_strategy_impact(self, optimization_type: str, simulation_data: Dict[str, Any]) -> None:
        """
        Log the impact of the optimized model on trading strategy
        
        Args:
            optimization_type: Type of optimization ('grid_search', 'random_search', 'bayesian')
            simulation_data: Dictionary with simulation data
        """
        results_attr = f"{optimization_type}_results"
        if not hasattr(self, results_attr):
            raise ValueError(f"No results available for {optimization_type}")
            
        results = getattr(self, results_attr)
        
        # Prepare payload
        payload = {
            'name': f"XGBoost {self.symbol.upper()} {self.timeframe} ({optimization_type})",
            'description': f"Strategy simulation for {optimization_type} optimized XGBoost model",
            'symbol': self.symbol,
            'timeframe': self.timeframe,
            'strategyType': 'ml_based',
            'startDate': simulation_data.get('startDate', datetime.now().isoformat()),
            'endDate': simulation_data.get('endDate', datetime.now().isoformat()),
            'initialInvestment': simulation_data.get('initialInvestment', 1000),
            'finalBalance': simulation_data.get('finalBalance', 1000),
            'pnl': simulation_data.get('pnl', 0),
            'pnlPercent': simulation_data.get('pnlPercent', 0),
            'winRate': simulation_data.get('winRate', 0),
            'drawdown': simulation_data.get('drawdown', 0),
            'maxDrawdown': simulation_data.get('maxDrawdown', 0),
            'sharpeRatio': simulation_data.get('sharpeRatio', 0),
            'volatility': simulation_data.get('volatility', 0),
            'tradeCount': simulation_data.get('tradeCount', 0),
            'winCount': simulation_data.get('winCount', 0),
            'lossCount': simulation_data.get('lossCount', 0),
            'averageWin': simulation_data.get('averageWin', 0),
            'averageLoss': simulation_data.get('averageLoss', 0),
            'largestWin': simulation_data.get('largestWin', 0),
            'largestLoss': simulation_data.get('largestLoss', 0),
            'modelParameters': results['params'],
            'tradesSnapshot': simulation_data.get('tradesSnapshot', [])
        }
        
        try:
            response = requests.post(
                f"{self.api_base_url}/strategy-simulations", 
                json=payload
            )
            response.raise_for_status()
            self.logger.info(f"Logged strategy impact for {optimization_type}")
        except Exception as e:
            self.logger.error(f"Error logging strategy impact: {str(e)}")
    
    def _get_param_combinations(self, param_grid: Dict[str, List[Any]]) -> List[Dict[str, Any]]:
        """
        Get all parameter combinations for grid search
        
        Args:
            param_grid: Dictionary of parameters and their possible values
            
        Returns:
            List of parameter dictionaries
        """
        keys = list(param_grid.keys())
        values = list(param_grid.values())
        
        combinations = []
        
        # Recursive function to build all combinations
        def build_combinations(current, depth):
            if depth == len(keys):
                combinations.append(current.copy())
                return
                
            for value in values[depth]:
                current[keys[depth]] = value
                build_combinations(current, depth + 1)
        
        build_combinations({}, 0)
        return combinations
    
    def _sample_parameters(self, param_distributions: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sample random parameters from distributions
        
        Args:
            param_distributions: Dictionary of parameters and their distributions
            
        Returns:
            Dictionary of sampled parameters
        """
        params = {}
        
        for param, dist in param_distributions.items():
            if isinstance(dist, tuple) and len(dist) == 3 and dist[0] == 'uniform':
                # Uniform distribution (min, max)
                low, high = dist[1], dist[2]
                params[param] = np.random.uniform(low, high)
            elif isinstance(dist, tuple) and len(dist) == 3 and dist[0] == 'int_uniform':
                # Integer uniform distribution (min, max)
                low, high = dist[1], dist[2]
                params[param] = np.random.randint(low, high + 1)
            elif isinstance(dist, list):
                # Categorical distribution
                params[param] = np.random.choice(dist)
            else:
                raise ValueError(f"Unsupported distribution for parameter {param}: {dist}")
                
        return params


def run_xgboost_optimization(
    symbol: str,
    timeframe: str,
    optimization_type: str = 'all',
    data_dir: str = 'data/training',
    model_dir: str = 'models'
) -> None:
    """
    Run XGBoost optimization for a specific symbol and timeframe
    
    Args:
        symbol: Trading pair symbol (e.g., 'btcusdt')
        timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
        optimization_type: Type of optimization to run ('grid_search', 'random_search', 'bayesian', 'all')
        data_dir: Directory containing training data
        model_dir: Directory to save trained models
    """
    logger.info(f"Starting XGBoost optimization for {symbol} on {timeframe} timeframe")
    
    # Create optimizer
    optimizer = XGBoostOptimizer(symbol, timeframe, data_dir, model_dir)
    
    try:
        # Load data
        optimizer.load_data()
        
        # Train baseline model
        baseline_results = optimizer.train_baseline_model()
        baseline_model_path = optimizer.save_baseline_model()
        logger.info(f"Baseline model saved to {baseline_model_path}")
        
        # Mock strategy impact data (replace with actual simulation in production)
        mock_strategy_impact = {
            'startDate': datetime.now().isoformat(),
            'endDate': datetime.now().isoformat(),
            'initialInvestment': 1000,
            'finalBalance': 1050,
            'pnl': 50,
            'pnlPercent': 0.05,
            'winRate': 0.6,
            'drawdown': 0.03,
            'maxDrawdown': 0.05,
            'sharpeRatio': 1.2,
            'volatility': 0.1,
            'tradeCount': 20,
            'winCount': 12,
            'lossCount': 8,
            'averageWin': 10,
            'averageLoss': -5,
            'largestWin': 20,
            'largestLoss': -10,
            'tradesSnapshot': []
        }
        
        # Run grid search
        if optimization_type in ['grid_search', 'all']:
            param_grid = {
                'max_depth': [3, 4, 5, 6, 7, 8],
                'learning_rate': [0.01, 0.05, 0.1, 0.2],
                'min_child_weight': [1, 2, 3, 4],
                'gamma': [0, 0.1, 0.2, 0.3],
                'subsample': [0.7, 0.8, 0.9, 1.0],
                'colsample_bytree': [0.7, 0.8, 0.9, 1.0],
                'n_estimators': [100, 200, 300]
            }
            
            grid_results = optimizer.grid_search(param_grid, cv=3)
            grid_model_path = optimizer.save_optimized_model('grid_search')
            logger.info(f"Grid search optimized model saved to {grid_model_path}")
            
            # Log strategy impact
            optimizer.log_strategy_impact('grid_search', mock_strategy_impact)
            
            # Send model performance to API
            optimizer.send_model_performance_to_api('grid_search', mock_strategy_impact)
        
        # Run random search
        if optimization_type in ['random_search', 'all']:
            param_distributions = {
                'max_depth': ('int_uniform', 3, 10),
                'learning_rate': ('uniform', 0.01, 0.3),
                'min_child_weight': ('int_uniform', 1, 6),
                'gamma': ('uniform', 0, 0.5),
                'subsample': ('uniform', 0.6, 1.0),
                'colsample_bytree': ('uniform', 0.6, 1.0),
                'n_estimators': ('int_uniform', 50, 500)
            }
            
            random_results = optimizer.random_search(param_distributions, n_iter=30)
            random_model_path = optimizer.save_optimized_model('random_search')
            logger.info(f"Random search optimized model saved to {random_model_path}")
            
            # Log strategy impact
            optimizer.log_strategy_impact('random_search', mock_strategy_impact)
            
            # Send model performance to API
            optimizer.send_model_performance_to_api('random_search', mock_strategy_impact)
        
        # Run Bayesian optimization
        if optimization_type in ['bayesian', 'all']:
            param_space = {
                'max_depth': hp.quniform('max_depth', 3, 10, 1),
                'learning_rate': hp.loguniform('learning_rate', np.log(0.01), np.log(0.3)),
                'min_child_weight': hp.quniform('min_child_weight', 1, 6, 1),
                'gamma': hp.uniform('gamma', 0, 0.5),
                'subsample': hp.uniform('subsample', 0.6, 1.0),
                'colsample_bytree': hp.uniform('colsample_bytree', 0.6, 1.0),
                'n_estimators': hp.quniform('n_estimators', 50, 500, 10)
            }
            
            bayesian_results = optimizer.bayesian_optimization(param_space, max_evals=30)
            bayesian_model_path = optimizer.save_optimized_model('bayesian')
            logger.info(f"Bayesian optimization model saved to {bayesian_model_path}")
            
            # Log strategy impact
            optimizer.log_strategy_impact('bayesian', mock_strategy_impact)
            
            # Send model performance to API
            optimizer.send_model_performance_to_api('bayesian', mock_strategy_impact)
        
        # Create performance comparison visualization
        if optimization_type == 'all':
            vis_path = optimizer.visualize_performance_comparison()
            logger.info(f"Performance comparison visualization saved to {vis_path}")
        
        logger.info("XGBoost optimization completed successfully")
        
    except Exception as e:
        logger.error(f"Error during XGBoost optimization: {str(e)}")
        raise


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="XGBoost Model Optimization")
    parser.add_argument('--symbol', type=str, required=True, help="Trading pair symbol (e.g., 'btcusdt')")
    parser.add_argument('--timeframe', type=str, required=True, help="Timeframe (e.g., '1h', '4h', '1d')")
    parser.add_argument('--optimization', type=str, default='all', 
                        choices=['grid_search', 'random_search', 'bayesian', 'all'],
                        help="Optimization method to use")
    parser.add_argument('--data-dir', type=str, default='data/training', 
                        help="Directory containing training data")
    parser.add_argument('--model-dir', type=str, default='models', 
                        help="Directory to save trained models")
    
    args = parser.parse_args()
    
    run_xgboost_optimization(
        symbol=args.symbol,
        timeframe=args.timeframe,
        optimization_type=args.optimization,
        data_dir=args.data_dir,
        model_dir=args.model_dir
    )