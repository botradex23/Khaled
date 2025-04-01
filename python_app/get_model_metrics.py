"""
CryptoTrade ML Model Metrics Script

This script extracts and displays model evaluation metrics 
without performing full model retraining.

Usage:
    python get_model_metrics.py --symbols BTCUSDT ETHUSDT
"""

import os
import sys
import pickle
import argparse
import logging
from datetime import datetime
import json
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

def load_model_info(symbol):
    """
    Load the trained model metadata from disk.
    """
    # Determine file path
    symbol_lower = symbol.lower()
    model_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    model_path = os.path.join(model_dir, f'model_{symbol_lower}.pkl')
    
    if not os.path.exists(model_path):
        logging.error(f"Model file not found: {model_path}")
        return None
    
    try:
        with open(model_path, 'rb') as f:
            model_data = pickle.load(f)
        
        logging.info(f"Successfully loaded model metadata for {symbol} (trained at {model_data['trained_at']})")
        return model_data
    
    except Exception as e:
        logging.error(f"Error loading model: {e}")
        return None

def get_model_metrics(symbol, interval='4h', sample=True):
    """
    Get the model metrics by making a prediction with the sample parameter
    and analyzing the returned data.
    """
    try:
        # Get a prediction from the API
        api_url = f"http://localhost:5001/api/ml/predict/{symbol}?interval={interval}&sample={str(sample).lower()}"
        logging.info(f"Requesting prediction from: {api_url}")
        
        response = requests.get(api_url, timeout=30)
        response.raise_for_status()
        
        prediction_data = response.json()
        
        if not prediction_data.get('success', False):
            return {
                'success': False,
                'error': prediction_data.get('error', 'Unknown error'),
                'symbol': symbol
            }
        
        # Extract confidence and probabilities
        confidence = prediction_data.get('confidence', 0)
        signal = prediction_data.get('signal', 'UNKNOWN')
        probabilities = prediction_data.get('probabilities', {})
        
        # Get model info
        model_info = load_model_info(symbol)
        features = None
        
        if model_info and 'features' in model_info:
            features = model_info['features']
            
        return {
            'success': True,
            'symbol': symbol,
            'signal': signal,
            'confidence': confidence,
            'probabilities': probabilities,
            'features': features,
            'is_sample_data': prediction_data.get('is_sample_data', True)
        }
            
    except Exception as e:
        logging.error(f"Error getting model metrics: {e}")
        return {
            'success': False,
            'error': str(e),
            'symbol': symbol
        }

def get_single_sample_prediction(symbol, interval='4h'):
    """Get a sample prediction to display"""
    try:
        # Check if Python Flask service is running
        health_url = "http://localhost:5001/api/status"
        health_response = requests.get(health_url, timeout=5)
        health_response.raise_for_status()
        
        # Make a prediction request
        sample_url = f"http://localhost:5001/api/ml/predict/{symbol}?interval={interval}&sample=false"
        response = requests.get(sample_url, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        
        return {
            'success': True,
            'result': result
        }
    except Exception as e:
        logging.error(f"Error getting sample prediction: {e}")
        return {
            'success': False,
            'error': str(e)
        }

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Get ML model metrics')
    parser.add_argument('--symbols', nargs='+', default=['BTCUSDT', 'ETHUSDT'], help='Trading pair symbols')
    parser.add_argument('--interval', type=str, default='4h', help='Timeframe interval')
    
    args = parser.parse_args()
    
    print("=" * 80)
    print(f"CryptoTrade ML Model Metrics - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    for symbol in args.symbols:
        print(f"\nAnalyzing model for {symbol}...")
        metrics = get_model_metrics(symbol, args.interval)
        
        if metrics['success']:
            print(f"Model loaded successfully")
            print(f"Signal: {metrics['signal']}")
            print(f"Confidence: {metrics['confidence']:.4f}")
            print("\nClass probabilities:")
            for class_name, prob in metrics['probabilities'].items():
                print(f"  {class_name}: {prob:.4f}")
            
            if metrics['features']:
                print("\nFeatures used by model:")
                for feature in metrics['features']:
                    print(f"  - {feature}")
            
            print("\nGetting real-time prediction (not sample data)...")
            real_prediction = get_single_sample_prediction(symbol, args.interval)
            
            if real_prediction['success']:
                result = real_prediction['result']
                print(f"Current price: {result.get('current_price', 'N/A')}")
                print(f"Signal: {result.get('signal', 'N/A')}")
                print(f"Confidence: {result.get('confidence', 0):.4f}")
                print(f"Using sample data: {result.get('is_sample_data', True)}")
                
                indicators = result.get('indicators', {})
                if indicators:
                    print("\nKey technical indicators:")
                    for name, value in indicators.items():
                        print(f"  {name}: {value:.4f}")
        else:
            print(f"Error: {metrics.get('error', 'Unknown error')}")
        
        print("-" * 80)
    
    print("\nDone!")

if __name__ == "__main__":
    main()