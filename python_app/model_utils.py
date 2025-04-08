#!/usr/bin/env python3
"""
Model Utility Functions

This module provides helper functions for model training, evaluation, and saving.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
import xgboost as xgb
import matplotlib.pyplot as plt
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight
from sklearn.preprocessing import StandardScaler
from typing import Dict, List, Tuple, Any, Optional, Union
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

def calculate_class_weights(y: np.ndarray) -> Dict[int, float]:
    """
    Calculate class weights to handle class imbalance
    
    Args:
        y: Array of class labels
        
    Returns:
        Dictionary mapping class labels to weights
    """
    classes = np.unique(y)
    weights = compute_class_weight(class_weight='balanced', classes=classes, y=y)
    return dict(zip(classes, weights))

def create_sample_weights(y: np.ndarray, class_weights: Dict[int, float]) -> np.ndarray:
    """
    Create sample weights based on class weights
    
    Args:
        y: Array of class labels
        class_weights: Dictionary mapping class labels to weights
        
    Returns:
        Array of sample weights
    """
    sample_weights = np.array([class_weights[label] for label in y])
    return sample_weights

def train_xgboost_model(X_train: np.ndarray, y_train: np.ndarray, 
                      sample_weights: Optional[np.ndarray] = None,
                      class_weights: Optional[Dict[int, float]] = None,
                      params: Optional[Dict[str, Any]] = None) -> xgb.XGBClassifier:
    """
    Train an XGBoost model
    
    Args:
        X_train: Training features
        y_train: Training labels
        sample_weights: Sample weights for training
        class_weights: Class weights
        params: XGBoost parameters
        
    Returns:
        Trained XGBoost model
    """
    if params is None:
        params = {
            'objective': 'multi:softmax',
            'num_class': len(np.unique(y_train)),
            'learning_rate': 0.05,
            'max_depth': 6,
            'min_child_weight': 2,
            'gamma': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'scale_pos_weight': 1,
            'seed': 42,
            'verbosity': 1,
            'n_estimators': 200,
            'use_label_encoder': False,
            'eval_metric': 'mlogloss'
        }
    
    logger.info(f"Training XGBoost model with parameters: {params}")
    
    model = xgb.XGBClassifier(**params)
    model.fit(
        X_train, 
        y_train,
        sample_weight=sample_weights,
        verbose=True
    )
    
    logger.info("XGBoost model training completed")
    return model

def evaluate_model(model: xgb.XGBClassifier, X_test: np.ndarray, y_test: np.ndarray, 
                 class_mapping: Optional[Dict[int, str]] = None) -> Dict[str, Any]:
    """
    Evaluate a trained model
    
    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
        class_mapping: Optional mapping from numeric labels to string labels
        
    Returns:
        Dictionary with evaluation metrics
    """
    logger.info("Evaluating model performance")
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred, average='weighted')
    recall = recall_score(y_test, y_pred, average='weighted')
    f1 = f1_score(y_test, y_pred, average='weighted')
    cm = confusion_matrix(y_test, y_pred)
    
    logger.info(f"Model performance - Accuracy: {accuracy:.4f}, Precision: {precision:.4f}, "
               f"Recall: {recall:.4f}, F1: {f1:.4f}")
    
    # Create evaluation dictionary
    evaluation = {
        'accuracy': accuracy,
        'precision': precision,
        'recall': recall,
        'f1_score': f1,
        'confusion_matrix': cm.tolist()
    }
    
    # Add class-specific metrics if class mapping is provided
    if class_mapping:
        class_report = {}
        for i, class_name in class_mapping.items():
            # Calculate binary classification metrics for this class
            binary_y_test = (y_test == i).astype(int)
            binary_y_pred = (y_pred == i).astype(int)
            
            class_precision = precision_score(binary_y_test, binary_y_pred, average='binary')
            class_recall = recall_score(binary_y_test, binary_y_pred, average='binary')
            class_f1 = f1_score(binary_y_test, binary_y_pred, average='binary')
            
            class_report[class_name] = {
                'precision': class_precision,
                'recall': class_recall,
                'f1_score': class_f1,
                'count': int(np.sum(binary_y_test))
            }
        
        evaluation['class_report'] = class_report
    
    return evaluation

def save_model(model: xgb.XGBClassifier, model_path: str, 
              metadata: Dict[str, Any], 
              feature_names: Optional[List[str]] = None) -> None:
    """
    Save a trained model with metadata
    
    Args:
        model: Trained model
        model_path: Path to save the model
        metadata: Dictionary of model metadata
        feature_names: Optional list of feature names
    """
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Save the model
    model.save_model(model_path)
    
    # Save metadata
    metadata_path = model_path.replace('.model', '_metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    logger.info(f"Model saved to {model_path}")
    logger.info(f"Metadata saved to {metadata_path}")

def load_model(model_path: str) -> Tuple[xgb.XGBClassifier, Dict[str, Any]]:
    """
    Load a saved model and its metadata
    
    Args:
        model_path: Path to the saved model
        
    Returns:
        Tuple of (model, metadata)
    """
    # Load the model
    model = xgb.XGBClassifier()
    model.load_model(model_path)
    
    # Load metadata
    metadata_path = model_path.replace('.model', '_metadata.json')
    if os.path.exists(metadata_path):
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
    else:
        metadata = {}
    
    logger.info(f"Loaded model from {model_path}")
    return model, metadata

def plot_confusion_matrix(cm: np.ndarray, class_names: List[str], 
                        title: str = "Confusion Matrix",
                        save_path: Optional[str] = None) -> None:
    """
    Plot a confusion matrix
    
    Args:
        cm: Confusion matrix array
        class_names: List of class names
        title: Plot title
        save_path: Optional path to save the plot
    """
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title(title)
    plt.colorbar()
    
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)
    
    # Format the text in each cell
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], 'd'),
                     horizontalalignment="center",
                     color="white" if cm[i, j] > thresh else "black")
    
    plt.tight_layout()
    plt.ylabel('True label')
    plt.xlabel('Predicted label')
    
    if save_path:
        plt.savefig(save_path)
        logger.info(f"Confusion matrix saved to {save_path}")
    
    plt.close()

def load_model_with_metadata(model_dir: str, model_name_prefix: str, with_model: bool = True) -> Dict[str, Any]:
    """
    Load a model and its metadata by name prefix
    
    This function finds the model file and its metadata based on a name prefix,
    which is useful for adaptive tuning and model deployment workflows.
    
    Args:
        model_dir: Directory containing models
        model_name_prefix: Prefix of the model name (e.g. 'xgboost_btcusdt_1h_bayesian')
        with_model: Whether to load the actual model object (may be memory intensive)
        
    Returns:
        Dictionary containing model info and metadata
    """
    # Find all matching files
    metadata_files = []
    model_files = []
    
    if os.path.exists(model_dir):
        for filename in os.listdir(model_dir):
            if filename.startswith(model_name_prefix):
                if filename.endswith('_metadata.json'):
                    metadata_files.append(filename)
                elif filename.endswith('.model'):
                    model_files.append(filename)
    
    if not metadata_files:
        logger.warning(f"No metadata files found for {model_name_prefix}")
        return {}
    
    # Sort by most recent (assuming timestamp in filename)
    metadata_files.sort(reverse=True)
    model_files.sort(reverse=True)
    
    # Load metadata
    metadata_path = os.path.join(model_dir, metadata_files[0])
    with open(metadata_path, 'r') as f:
        metadata = json.load(f)
    
    result = {
        'metadata': metadata,
        'metadata_path': metadata_path,
        'params': metadata.get('params', {}),
        'performance': metadata.get('performance', {}),
        'training_date': metadata.get('training_date', ''),
        'symbol': metadata.get('symbol', ''),
        'timeframe': metadata.get('timeframe', '')
    }
    
    # Load model if requested
    if with_model and model_files:
        model_path = os.path.join(model_dir, model_files[0])
        try:
            model = xgb.XGBClassifier()
            model.load_model(model_path)
            result['model'] = model
            result['model_path'] = model_path
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
    
    return result

def find_best_model(model_dir: str, symbol: str, timeframe: str) -> Dict[str, Any]:
    """
    Find the best performing model for a specific symbol and timeframe
    
    Args:
        model_dir: Directory containing models
        symbol: Trading pair symbol
        timeframe: Timeframe
        
    Returns:
        Dictionary with the best model info
    """
    # Normalize inputs
    symbol = symbol.replace('/', '').lower()
    
    # Prefixes to search for
    prefixes = [
        f'xgboost_{symbol}_{timeframe}_bayesian',
        f'xgboost_{symbol}_{timeframe}_random_search',
        f'xgboost_{symbol}_{timeframe}_grid_search',
        f'xgboost_{symbol}_{timeframe}_adapted',
        f'xgboost_{symbol}_{timeframe}_baseline'
    ]
    
    best_model = None
    best_f1 = -1
    
    # Search for each prefix
    for prefix in prefixes:
        model_info = load_model_with_metadata(model_dir, prefix, with_model=False)
        if model_info and 'performance' in model_info:
            f1_score = model_info['performance'].get('f1_score', 0)
            if f1_score > best_f1:
                best_f1 = f1_score
                best_model = model_info
                best_model['prefix'] = prefix
    
    if best_model:
        logger.info(f"Found best model for {symbol} {timeframe}: {best_model['prefix']} with F1 score {best_f1}")
    else:
        logger.warning(f"No models found for {symbol} {timeframe}")
        
    return best_model or {}

def plot_feature_importance(model: xgb.XGBClassifier, feature_names: List[str], 
                          title: str = "Feature Importance",
                          save_path: Optional[str] = None) -> None:
    """
    Plot feature importance
    
    Args:
        model: Trained XGBoost model
        feature_names: Names of features
        title: Plot title
        save_path: Optional path to save the plot
    """
    # Get feature importance
    importance = model.feature_importances_
    
    # Sort features by importance
    indices = np.argsort(importance)[::-1]
    sorted_importance = importance[indices]
    sorted_names = [feature_names[i] for i in indices]
    
    # Plot only the top 20 features
    num_features = min(20, len(sorted_names))
    plt.figure(figsize=(12, 8))
    plt.title(title)
    plt.bar(range(num_features), sorted_importance[:num_features], align="center")
    plt.xticks(range(num_features), sorted_names[:num_features], rotation=90)
    plt.tight_layout()
    
    if save_path:
        plt.savefig(save_path)
        logger.info(f"Feature importance plot saved to {save_path}")
    
    plt.close()

def plot_learning_curve(model: xgb.XGBClassifier, X: np.ndarray, y: np.ndarray, 
                       title: str = "Learning Curve",
                       cv: int = 5,
                       save_path: Optional[str] = None) -> None:
    """
    Plot a learning curve showing model performance vs training set size
    
    Args:
        model: Trained model
        X: Feature data
        y: Target data
        title: Plot title
        cv: Number of cross-validation folds
        save_path: Optional path to save the plot
    """
    from sklearn.model_selection import learning_curve
    
    train_sizes, train_scores, test_scores = learning_curve(
        model, X, y, cv=cv, n_jobs=-1, 
        train_sizes=np.linspace(0.1, 1.0, 10),
        scoring='accuracy'
    )
    
    train_mean = np.mean(train_scores, axis=1)
    train_std = np.std(train_scores, axis=1)
    test_mean = np.mean(test_scores, axis=1)
    test_std = np.std(test_scores, axis=1)
    
    plt.figure(figsize=(10, 6))
    plt.title(title)
    plt.xlabel("Training examples")
    plt.ylabel("Accuracy Score")
    plt.grid()
    
    plt.fill_between(train_sizes, train_mean - train_std,
                     train_mean + train_std, alpha=0.1, color="r")
    plt.fill_between(train_sizes, test_mean - test_std,
                     test_mean + test_std, alpha=0.1, color="g")
    plt.plot(train_sizes, train_mean, 'o-', color="r", label="Training score")
    plt.plot(train_sizes, test_mean, 'o-', color="g", label="Cross-validation score")
    
    plt.legend(loc="best")
    
    if save_path:
        plt.savefig(save_path)
        logger.info(f"Learning curve saved to {save_path}")
    
    plt.close()

def calculate_strategy_impact(predictions: np.ndarray, actual_returns: np.ndarray) -> Dict[str, Any]:
    """
    Calculate the impact of a model's predictions on a trading strategy
    
    Args:
        predictions: Array of predicted classes (0=BUY, 1=HOLD, 2=SELL)
        actual_returns: Array of actual percentage returns for each period
        
    Returns:
        Dictionary with strategy impact metrics
    """
    # Map predictions to actions
    # 0 = Buy (long), 1 = Hold (no position), 2 = Sell (short)
    positions = np.zeros_like(predictions, dtype=float)
    positions[predictions == 0] = 1.0    # Long position for BUY
    positions[predictions == 2] = -1.0   # Short position for SELL
    
    # Calculate strategy returns
    strategy_returns = positions * actual_returns
    
    # Calculate cumulative returns
    cumulative_returns = np.cumprod(1 + strategy_returns) - 1
    
    # Calculate maximum drawdown
    peak = np.maximum.accumulate(cumulative_returns + 1)
    drawdown = (cumulative_returns + 1) / peak - 1
    max_drawdown = np.min(drawdown)
    
    # Calculate other metrics
    final_return = cumulative_returns[-1]
    win_mask = strategy_returns > 0
    loss_mask = strategy_returns < 0
    total_trades = np.sum(positions != 0)
    winning_trades = np.sum(win_mask & (positions != 0))
    losing_trades = np.sum(loss_mask & (positions != 0))
    
    win_rate = winning_trades / total_trades if total_trades > 0 else 0
    
    # Calculate average win and loss
    avg_win = np.mean(strategy_returns[win_mask]) if np.any(win_mask) else 0
    avg_loss = np.mean(strategy_returns[loss_mask]) if np.any(loss_mask) else 0
    
    # Calculate largest win and loss
    largest_win = np.max(strategy_returns) if len(strategy_returns) > 0 else 0
    largest_loss = np.min(strategy_returns) if len(strategy_returns) > 0 else 0
    
    # Calculate volatility and Sharpe ratio
    volatility = np.std(strategy_returns) * np.sqrt(252)  # Annualized
    sharpe_ratio = (np.mean(strategy_returns) * 252) / volatility if volatility > 0 else 0
    
    return {
        'total_return': final_return,
        'total_return_pct': final_return * 100,
        'max_drawdown': max_drawdown,
        'max_drawdown_pct': max_drawdown * 100,
        'win_rate': win_rate,
        'total_trades': int(total_trades),
        'winning_trades': int(winning_trades),
        'losing_trades': int(losing_trades),
        'avg_win': avg_win,
        'avg_loss': avg_loss,
        'largest_win': largest_win,
        'largest_loss': largest_loss,
        'volatility': volatility,
        'sharpe_ratio': sharpe_ratio
    }