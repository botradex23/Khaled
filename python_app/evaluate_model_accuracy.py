"""
CryptoTrade ML Model Accuracy Evaluation Script

This script evaluates the accuracy of the ML models by fetching real historical data,
making predictions, and comparing them against actual labels.

Usage:
    python evaluate_model_accuracy.py --symbol BTCUSDT
"""

import os
import sys
import logging
import pickle
import argparse
import json
from datetime import datetime
import time

import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import necessary functions
from train_model import fetch_historical_data, add_technical_indicators, add_target_labels
from predict import load_model
from config import active_config

def evaluate_model_accuracy(symbol, interval='4h', threshold=2.0, window=5):
    """
    Evaluate model accuracy on real historical data
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        interval: Timeframe for historical data
        threshold: Price movement threshold percentage
        window: Number of future candles to look ahead
        
    Returns:
        Dictionary with evaluation metrics
    """
    try:
        # Load model
        model_data = load_model(symbol)
        if not model_data:
            return {
                'success': False,
                'error': f"Model not found for {symbol}",
                'symbol': symbol
            }
        
        model = model_data['model']
        scaler = model_data['scaler']
        features = model_data['features']
        
        # Fetch historical data
        logging.info(f"Fetching real historical data for {symbol}...")
        # Include proxy settings
        logging.info(f"Using proxy: {active_config.USE_PROXY}")
        if active_config.USE_PROXY:
            logging.info(f"Proxy details: {active_config.PROXY_IP}:{active_config.PROXY_PORT}")
        
        start_time = time.time()
        df = fetch_historical_data(symbol, interval, limit=100)
        fetch_time = time.time() - start_time
        logging.info(f"Data fetched in {fetch_time:.2f} seconds")
        
        # Add technical indicators
        logging.info("Calculating technical indicators...")
        df = add_technical_indicators(df)
        
        # Add target labels
        logging.info(f"Adding target labels with window={window}, threshold={threshold}%...")
        df = add_target_labels(df, window, threshold)
        
        # Extract features and target
        X = df[features]
        y = df['target']
        
        # Map target values (-1, 0, 1) to (0, 1, 2) for multi-class classification
        y_mapped = y.map({-1: 0, 0: 1, 1: 2})
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Make predictions
        logging.info("Making predictions...")
        y_pred_mapped = model.predict(X_scaled)
        
        # Map predictions back to original labels
        y_pred = np.select([y_pred_mapped == 0, y_pred_mapped == 1, y_pred_mapped == 2], [-1, 0, 1])
        
        # Calculate metrics
        accuracy = accuracy_score(y, y_pred)
        cm = confusion_matrix(y, y_pred)
        cr = classification_report(y, y_pred, target_names=['SELL', 'HOLD', 'BUY'], output_dict=True)
        
        logging.info(f"Accuracy: {accuracy:.4f}")
        
        # Calculate class distribution
        class_distribution = {}
        unique, counts = np.unique(y, return_counts=True)
        for val, count in zip(unique, counts):
            label = 'BUY' if val == 1 else 'SELL' if val == -1 else 'HOLD'
            class_distribution[label] = int(count)
        
        # Calculate correct predictions per class
        correct_counts = {}
        for i in range(len(y)):
            if y.iloc[i] == y_pred[i]:
                label = 'BUY' if y.iloc[i] == 1 else 'SELL' if y.iloc[i] == -1 else 'HOLD'
                correct_counts[label] = correct_counts.get(label, 0) + 1
        
        # Display results
        print(f"\n{'=' * 60}")
        print(f"Model Accuracy Evaluation for {symbol}")
        print(f"{'=' * 60}")
        print(f"Data interval: {interval}")
        print(f"Threshold: {threshold}%")
        print(f"Look-ahead window: {window} periods")
        print(f"Data points: {len(df)}")
        
        print(f"\nAccuracy: {accuracy:.4f}")
        
        print("\nConfusion Matrix:")
        print(f"          | Pred SELL | Pred HOLD | Pred BUY |")
        print(f"----------|-----------|-----------|----------|")
        print(f"True SELL | {cm[0, 0]:9d} | {cm[0, 1]:9d} | {cm[0, 2]:8d} |")
        print(f"True HOLD | {cm[1, 0]:9d} | {cm[1, 1]:9d} | {cm[1, 2]:8d} |")
        print(f"True BUY  | {cm[2, 0]:9d} | {cm[2, 1]:9d} | {cm[2, 2]:8d} |")
        
        print("\nClassification Report:")
        print(f"Class     | Precision | Recall    | F1-Score  | Support   |")
        print(f"----------|-----------|-----------|-----------|-----------|")
        for label in ['SELL', 'HOLD', 'BUY']:
            metrics = cr[label]
            support = int(metrics['support'])
            print(f"{label:10s} | {metrics['precision']:.7f} | {metrics['recall']:.7f} | {metrics['f1-score']:.7f} | {support:9d} |")
        
        print("\nClass Distribution:")
        for label, count in class_distribution.items():
            correct = correct_counts.get(label, 0)
            if count > 0:
                correct_pct = correct / count * 100
            else:
                correct_pct = 0
            print(f"  {label}: {count} instances, {correct} correct ({correct_pct:.1f}%)")
        
        # Feature importance
        importance = model.feature_importances_
        importance_dict = {feature: float(importance[i]) for i, feature in enumerate(features)}
        sorted_importance = sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
        
        print("\nTop 5 Most Important Features:")
        for feature, value in sorted_importance[:5]:
            print(f"  {feature}: {value:.4f}")
        
        # Return all metrics
        return {
            'success': True,
            'symbol': symbol,
            'accuracy': float(accuracy),
            'confusion_matrix': cm.tolist(),
            'classification_report': cr,
            'class_distribution': class_distribution,
            'feature_importance': importance_dict
        }
    
    except Exception as e:
        logging.error(f"Error evaluating model: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol
        }

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Evaluate ML model accuracy')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Trading pair symbol')
    parser.add_argument('--interval', type=str, default='4h', help='Timeframe for historical data')
    parser.add_argument('--threshold', type=float, default=2.0, help='Price movement threshold percentage')
    parser.add_argument('--window', type=int, default=5, help='Number of future candles to look ahead')
    parser.add_argument('--output', type=str, help='Output file path for JSON results')
    
    args = parser.parse_args()
    
    print(f"Starting evaluation for {args.symbol}...")
    result = evaluate_model_accuracy(args.symbol, args.interval, args.threshold, args.window)
    
    # Save results to file if requested
    if args.output and result['success']:
        with open(args.output, 'w') as f:
            json.dump(result, f, indent=2)
        print(f"\nResults saved to {args.output}")
    
    if not result['success']:
        print(f"Evaluation failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)
    
    print("\nEvaluation complete!")

if __name__ == "__main__":
    main()