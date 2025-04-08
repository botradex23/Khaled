#!/usr/bin/env python3
"""
Data Loader Module

This module provides functions for loading and preprocessing data for ML models.
"""

import os
import sys
import json
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional, Union
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import logging

logger = logging.getLogger(__name__)

def load_market_data(data_dir: str, symbol: str, timeframe: str) -> pd.DataFrame:
    """
    Load market data from CSV or other sources
    
    Args:
        data_dir: Directory containing data files
        symbol: Trading pair symbol (e.g., 'btcusdt')
        timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
        
    Returns:
        DataFrame with market data
    """
    symbol = symbol.lower()
    
    # Define possible file paths
    file_paths = [
        os.path.join(data_dir, f"{symbol}_{timeframe}.csv"),
        os.path.join(data_dir, f"{symbol}.csv"),
        os.path.join(data_dir, f"{symbol}_ohlcv_{timeframe}.csv"),
        os.path.join(data_dir, f"{symbol}_with_features_{timeframe}.csv")
    ]
    
    # Try each path
    for path in file_paths:
        if os.path.exists(path):
            logger.info(f"Loading data from {path}")
            df = pd.read_csv(path)
            return df
    
    # If we reach here, no file was found
    raise FileNotFoundError(f"No data file found for {symbol} with timeframe {timeframe}. Checked paths: {file_paths}")

def preprocess_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Preprocess market data
    
    Args:
        df: DataFrame with raw market data
        
    Returns:
        DataFrame with preprocessed data
    """
    logger.info("Preprocessing data")
    
    # Make a copy to avoid modifying the original
    processed_df = df.copy()
    
    # Ensure datetime column is properly formatted
    if 'timestamp' in processed_df.columns:
        processed_df['timestamp'] = pd.to_datetime(processed_df['timestamp'])
    elif 'date' in processed_df.columns:
        processed_df['timestamp'] = pd.to_datetime(processed_df['date'])
        
    # Set timestamp as index if it exists
    if 'timestamp' in processed_df.columns:
        processed_df.set_index('timestamp', inplace=True)
        
    # Drop rows with missing values
    initial_rows = len(processed_df)
    processed_df.dropna(inplace=True)
    dropped_rows = initial_rows - len(processed_df)
    if dropped_rows > 0:
        logger.info(f"Dropped {dropped_rows} rows with missing values")
        
    # Check if the target variable exists
    if 'target' not in processed_df.columns:
        logger.warning("Target variable 'target' not found in data")
        
    return processed_df

def add_target_labels(df: pd.DataFrame, forward_returns_periods: int = 24, threshold: float = 0.005) -> pd.DataFrame:
    """
    Add target labels for classification
    
    Args:
        df: DataFrame with market data
        forward_returns_periods: Number of periods to look ahead for returns
        threshold: Price change threshold to consider as significant
        
    Returns:
        DataFrame with target labels added
    """
    logger.info(f"Adding target labels with forward returns of {forward_returns_periods} periods and threshold {threshold}")
    
    # Make a copy to avoid modifying the original
    labeled_df = df.copy()
    
    # Calculate forward returns
    if 'close' in labeled_df.columns:
        labeled_df['forward_return'] = labeled_df['close'].shift(-forward_returns_periods) / labeled_df['close'] - 1
        
        # Create target labels
        labeled_df['target'] = 1  # HOLD is the default
        labeled_df.loc[labeled_df['forward_return'] > threshold, 'target'] = 0  # BUY
        labeled_df.loc[labeled_df['forward_return'] < -threshold, 'target'] = 2  # SELL
        
        # Drop rows with NaN targets
        labeled_df.dropna(subset=['target'], inplace=True)
        
        # Convert target to integer
        labeled_df['target'] = labeled_df['target'].astype(int)
        
        # Count the distribution of classes
        class_counts = labeled_df['target'].value_counts()
        logger.info(f"Class distribution: {class_counts.to_dict()}")
    else:
        logger.warning("'close' column not found, cannot calculate forward returns")
    
    return labeled_df

def load_train_test_data(data_dir: str, symbol: str, timeframe: str = '1h', 
                        test_size: float = 0.2, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Load, preprocess, and split data into training and testing sets
    
    Args:
        data_dir: Directory containing data files
        symbol: Trading pair symbol (e.g., 'btcusdt')
        timeframe: Timeframe for the data (e.g., '1h', '4h', '1d')
        test_size: Proportion of data to use for testing
        random_state: Random seed for reproducibility
        
    Returns:
        Tuple of (X_train, X_test, y_train, y_test)
    """
    try:
        # Load data
        df = load_market_data(data_dir, symbol, timeframe)
        
        # Preprocess data
        df = preprocess_data(df)
        
        # Check if target is already in the data
        if 'target' not in df.columns:
            # Add target labels if not present
            df = add_target_labels(df)
        
        # Identify feature columns (exclude target and any non-numeric columns)
        feature_cols = [col for col in df.columns if col != 'target' and pd.api.types.is_numeric_dtype(df[col])]
        
        if not feature_cols:
            raise ValueError("No numeric feature columns found in data")
            
        logger.info(f"Using {len(feature_cols)} features: {feature_cols}")
        
        # Extract features and target
        X = df[feature_cols].values
        y = df['target'].values
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split into training and testing sets
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=test_size, random_state=random_state, stratify=y
        )
        
        logger.info(f"Data split - Training: {X_train.shape}, Testing: {X_test.shape}")
        
        return X_train, X_test, y_train, y_test
        
    except Exception as e:
        logger.error(f"Error loading train-test data: {str(e)}")
        raise

def generate_synthetic_data(num_samples: int = 1000, num_features: int = 20, 
                          num_classes: int = 3, random_state: int = 42) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    Generate synthetic data for testing
    
    Args:
        num_samples: Number of samples to generate
        num_features: Number of features
        num_classes: Number of classes
        random_state: Random seed for reproducibility
        
    Returns:
        Tuple of (X_train, X_test, y_train, y_test)
    """
    from sklearn.datasets import make_classification
    
    logger.info(f"Generating synthetic data with {num_samples} samples and {num_features} features")
    
    # Set random seed
    np.random.seed(random_state)
    
    # Generate synthetic data
    X, y = make_classification(
        n_samples=num_samples,
        n_features=num_features,
        n_informative=int(num_features * 0.7),
        n_redundant=int(num_features * 0.2),
        n_classes=num_classes,
        n_clusters_per_class=2,
        weights=None,
        flip_y=0.1,
        random_state=random_state
    )
    
    # Split into training and testing sets
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=random_state, stratify=y
    )
    
    logger.info(f"Synthetic data split - Training: {X_train.shape}, Testing: {X_test.shape}")
    
    return X_train, X_test, y_train, y_test

def create_dataset_metadata(symbol: str, timeframe: str, data_dir: str, 
                          feature_columns: List[str]) -> Dict[str, Any]:
    """
    Create metadata about a dataset
    
    Args:
        symbol: Trading pair symbol
        timeframe: Timeframe
        data_dir: Data directory
        feature_columns: List of feature column names
        
    Returns:
        Dictionary with dataset metadata
    """
    try:
        # Load data
        df = load_market_data(data_dir, symbol, timeframe)
        
        # Create metadata
        metadata = {
            'symbol': symbol,
            'timeframe': timeframe,
            'num_samples': len(df),
            'date_range': {
                'start': df.index.min().isoformat() if hasattr(df.index, 'min') else str(df.index[0]),
                'end': df.index.max().isoformat() if hasattr(df.index, 'max') else str(df.index[-1])
            },
            'features': feature_columns,
            'feature_stats': {}
        }
        
        # Add basic stats for each feature
        for feature in feature_columns:
            if feature in df.columns:
                metadata['feature_stats'][feature] = {
                    'mean': float(df[feature].mean()),
                    'std': float(df[feature].std()),
                    'min': float(df[feature].min()),
                    'max': float(df[feature].max())
                }
        
        # Add target distribution if available
        if 'target' in df.columns:
            target_counts = df['target'].value_counts().to_dict()
            metadata['target_distribution'] = {str(k): int(v) for k, v in target_counts.items()}
        
        return metadata
        
    except Exception as e:
        logger.error(f"Error creating dataset metadata: {str(e)}")
        return {
            'symbol': symbol,
            'timeframe': timeframe,
            'error': str(e)
        }