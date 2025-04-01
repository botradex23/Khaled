"""
CryptoTrade ML Model Evaluation Script

This script evaluates the quality of trained ML models using real Binance data.
It calculates accuracy, confusion matrix, and classification report metrics.

Usage:
    python evaluate_models.py --symbols BTCUSDT ETHUSDT

Parameters:
    --symbols: List of trading pair symbols to evaluate models for
    --interval: Timeframe for historical data (default: 4h)
"""

import os
import sys
import logging
import pickle
import argparse
from datetime import datetime
from typing import Dict, Any, List, Optional

import pandas as pd
import numpy as np
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(f'model_evaluation_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    ]
)

# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import configuration for proxy
try:
    from config import active_config
    
    # Proxy configuration
    USE_PROXY = active_config.USE_PROXY
    PROXY_USERNAME = active_config.PROXY_USERNAME
    PROXY_PASSWORD = active_config.PROXY_PASSWORD
    PROXY_IP = active_config.PROXY_IP
    PROXY_PORT = active_config.PROXY_PORT
except ImportError:
    logging.error("Could not import config - defaulting to no proxy")
    USE_PROXY = False
    PROXY_USERNAME = ""
    PROXY_PASSWORD = ""
    PROXY_IP = ""
    PROXY_PORT = ""

# Import functions from train_model.py and predict.py
from train_model import fetch_historical_data, add_technical_indicators, add_target_labels
from predict import load_model

def evaluate_model(symbol: str, interval: str = '4h', threshold: float = 2.0, window: int = 5) -> Dict[str, Any]:
    """
    Evaluate a trained model against real historical data from Binance.
    
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
        
        # Fetch historical data (last 100 periods for a smaller test set to avoid timeouts)
        logging.info(f"Fetching historical data for {symbol} evaluation...")
        logging.info(f"Using proxy: {USE_PROXY}, Proxy IP: {PROXY_IP}, Port: {PROXY_PORT}")
        df = fetch_historical_data(symbol, interval, limit=100)
        
        # Add technical indicators
        df = add_technical_indicators(df)
        
        # Add target labels
        df = add_target_labels(df, window, threshold)
        
        # Ensure we have enough data
        if len(df) < 50:
            return {
                'success': False,
                'error': "Not enough data for evaluation",
                'symbol': symbol
            }
        
        # Extract features and target
        X = df[features]
        y = df['target']
        
        # Map target values (-1, 0, 1) to (0, 1, 2) for multi-class classification
        y_mapped = y.map({-1: 0, 0: 1, 1: 2})
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Make predictions
        y_pred_mapped = model.predict(X_scaled)
        
        # Map predictions back to original labels for reporting
        y_pred = np.select([y_pred_mapped == 0, y_pred_mapped == 1, y_pred_mapped == 2], [-1, 0, 1])
        
        # Calculate metrics
        accuracy = accuracy_score(y, y_pred)
        cm = confusion_matrix(y, y_pred)
        cr = classification_report(y, y_pred, target_names=['SELL', 'HOLD', 'BUY'], output_dict=True)
        
        # Print results
        logging.info(f"Evaluation Results for {symbol}:")
        logging.info(f"Accuracy: {accuracy:.4f}")
        
        logging.info(f"Confusion Matrix:")
        logging.info(f"{cm}")
        
        logging.info(f"Classification Report:")
        for label, metrics in cr.items():
            if label in ['SELL', 'HOLD', 'BUY']:
                logging.info(f"  {label}:")
                logging.info(f"    Precision: {metrics['precision']:.4f}")
                logging.info(f"    Recall: {metrics['recall']:.4f}")
                logging.info(f"    F1-score: {metrics['f1-score']:.4f}")
                logging.info(f"    Support: {metrics['support']}")

        # Get feature importance
        importance = model.feature_importances_
        importance_dict = {feature: float(importance[i]) for i, feature in enumerate(features)}
        
        # Get sample prediction with confidence
        sample_index = np.random.randint(0, len(X_scaled))
        sample_X = X_scaled[sample_index:sample_index+1]
        sample_prediction = model.predict(sample_X)[0]
        sample_proba = model.predict_proba(sample_X)[0]
        
        sample_signal_map = {0: 'SELL', 1: 'HOLD', 2: 'BUY'}
        sample_signal = sample_signal_map[sample_prediction]
        sample_confidence = sample_proba[sample_prediction]
        
        logging.info(f"Sample Prediction:")
        logging.info(f"  Signal: {sample_signal}")
        logging.info(f"  Confidence: {sample_confidence:.4f}")
        logging.info(f"  Probabilities: SELL={sample_proba[0]:.4f}, HOLD={sample_proba[1]:.4f}, BUY={sample_proba[2]:.4f}")
        
        # Return evaluation results
        return {
            'success': True,
            'symbol': symbol,
            'accuracy': float(accuracy),
            'confusion_matrix': cm.tolist(),
            'classification_report': cr,
            'feature_importance': importance_dict,
            'sample_prediction': {
                'signal': sample_signal,
                'confidence': float(sample_confidence),
                'probabilities': {
                    'SELL': float(sample_proba[0]),
                    'HOLD': float(sample_proba[1]),
                    'BUY': float(sample_proba[2])
                }
            }
        }
    
    except Exception as e:
        logging.error(f"Error evaluating model for {symbol}: {e}", exc_info=True)
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol
        }

def main():
    """
    Main function to parse arguments and evaluate models.
    """
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Evaluate trained ML models for cryptocurrency trading')
    parser.add_argument('--symbols', nargs='+', default=['BTCUSDT', 'ETHUSDT'], help='List of trading pair symbols')
    parser.add_argument('--interval', type=str, default='4h', help='Timeframe for historical data')
    parser.add_argument('--threshold', type=float, default=2.0, help='Price movement threshold percentage')
    parser.add_argument('--window', type=int, default=5, help='Number of future candles to look ahead')
    
    args = parser.parse_args()
    
    # Summary of evaluation configuration
    logging.info("=" * 80)
    logging.info("CryptoTrade ML Model Evaluation")
    logging.info("=" * 80)
    logging.info(f"Symbols: {args.symbols}")
    logging.info(f"Interval: {args.interval}")
    logging.info(f"Threshold: {args.threshold}%")
    logging.info(f"Window: {args.window} candles")
    logging.info("-" * 80)
    
    # Evaluate models for each symbol
    results = {}
    for symbol in args.symbols:
        logging.info(f"Evaluating model for {symbol}...")
        result = evaluate_model(symbol, args.interval, args.threshold, args.window)
        results[symbol] = result
        
        # Print summary for this symbol
        if result['success']:
            print(f"\n{'=' * 60}")
            print(f"Evaluation Summary for {symbol}")
            print(f"{'=' * 60}")
            print(f"Accuracy: {result['accuracy']:.4f}")
            
            print("\nConfusion Matrix:")
            cm = np.array(result['confusion_matrix'])
            print(f"          | Pred SELL | Pred HOLD | Pred BUY |")
            print(f"----------|-----------|-----------|----------|")
            print(f"True SELL | {cm[0, 0]:9d} | {cm[0, 1]:9d} | {cm[0, 2]:8d} |")
            print(f"True HOLD | {cm[1, 0]:9d} | {cm[1, 1]:9d} | {cm[1, 2]:8d} |")
            print(f"True BUY  | {cm[2, 0]:9d} | {cm[2, 1]:9d} | {cm[2, 2]:8d} |")
            
            print("\nClassification Report:")
            cr = result['classification_report']
            print(f"Class     | Precision | Recall    | F1-Score  | Support   |")
            print(f"----------|-----------|-----------|-----------|-----------|")
            for label in ['SELL', 'HOLD', 'BUY']:
                metrics = cr[label]
                print(f"{label:10s} | {metrics['precision']:.7f} | {metrics['recall']:.7f} | {metrics['f1-score']:.7f} | {metrics['support']:9d} |")
            
            print("\nTop 5 Most Important Features:")
            importance = result['feature_importance']
            sorted_importance = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]
            for feature, value in sorted_importance:
                print(f"  {feature}: {value:.4f}")
            
            print("\nSample Prediction:")
            sp = result['sample_prediction']
            print(f"  Signal: {sp['signal']} (Confidence: {sp['confidence']:.4f})")
            print(f"  Probabilities: SELL={sp['probabilities']['SELL']:.4f}, HOLD={sp['probabilities']['HOLD']:.4f}, BUY={sp['probabilities']['BUY']:.4f}")
            
            print(f"{'=' * 60}")
        else:
            print(f"\n{'=' * 60}")
            print(f"Evaluation Failed for {symbol}")
            print(f"{'=' * 60}")
            print(f"Error: {result['error']}")
            print(f"{'=' * 60}")
    
    # Print overall summary
    print("\n" + "=" * 80)
    print("Overall Evaluation Summary")
    print("=" * 80)
    
    success_count = sum(1 for r in results.values() if r['success'])
    print(f"Successfully evaluated {success_count} of {len(args.symbols)} models")
    
    if success_count > 0:
        avg_accuracy = sum(r['accuracy'] for r in results.values() if r['success']) / success_count
        print(f"Average accuracy: {avg_accuracy:.4f}")
    
    print("=" * 80)

# Entry point
if __name__ == "__main__":
    main()