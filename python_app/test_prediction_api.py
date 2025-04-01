#!/usr/bin/env python3
"""
Test the ML prediction API

This script tests the ML prediction API by making a request to the prediction
endpoint with sample market data to see if we get a valid prediction.
"""

import sys
import json
import requests
from pprint import pprint

# Sample market data for testing prediction
SAMPLE_MARKET_DATA = {
    'open': 82491.31,
    'high': 82493.7,
    'low': 82392.52,
    'close': 82471.07,
    'volume': 85.63449,
    'sma_5': 82297.324,
    'sma_10': 82181.365,
    'sma_20': 82128.95,
    'sma_50': 81899.5804,
    'sma_100': 81963.6279,
    'ema_5': 82330.98380683674,
    'ema_10': 82237.19266099698,
    'ema_20': 82141.39877359924,
    'ema_50': 82015.54205376017,
    'ema_100': 81984.99161665728,
    'rsi_14': 74.96886012072812,
    'ema_12': 82213.45416089744,
    'ema_26': 82101.4217944416,
    'macd': 112.0323664558382,
    'macd_signal': 82.59444987631211,
    'macd_hist': 29.43791657952609,
    'bb_middle': 82128.95,
    'bb_std': 144.331960379675,
    'bb_upper': 82417.61392075935,
    'bb_lower': 81840.28607924064,
    'atr_14': 139.75571428571337,
    'roc_5': 0.5056904957241537,
    'roc_10': 0.3230440392621103,
    'roc_20': 0.5471929872687076,
    'stoch_k': 91.05060181009723,
    'stoch_d': 87.45739478414062,
    'future_price': 83434.71,
    'price_change_pct': 1.1684582241991033
}

def test_available_models():
    """Test the available-models endpoint"""
    print("Testing available models endpoint...")
    try:
        response = requests.get('http://localhost:5001/api/ml/prediction/available-models')
        data = response.json()
        
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return data.get('success', False)
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_model_info():
    """Test the model-info endpoint"""
    print("\nTesting model info endpoint...")
    try:
        response = requests.get('http://localhost:5001/api/ml/prediction/model-info/btcusdt')
        data = response.json()
        
        print(f"Status code: {response.status_code}")
        print(f"Success: {data.get('success', False)}")
        print(f"Symbol: {data.get('symbol', 'N/A')}")
        
        if 'metadata' in data:
            metadata = data['metadata']
            print(f"Accuracy: {metadata.get('evaluation', {}).get('accuracy', 'N/A')}")
            print(f"Class mapping: {metadata.get('class_mapping', {})}")
        
        return data.get('success', False)
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_prediction():
    """Test the prediction endpoint"""
    print("\nTesting prediction endpoint...")
    try:
        response = requests.post(
            'http://localhost:5001/api/ml/prediction/predict/btcusdt',
            json=SAMPLE_MARKET_DATA
        )
        data = response.json()
        
        print(f"Status code: {response.status_code}")
        print(f"Response: {json.dumps(data, indent=2)}")
        
        return data.get('success', False)
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def main():
    """Main entry point"""
    # Test available models endpoint
    if not test_available_models():
        print("Failed to get available models")
        return 1
    
    # Test model info endpoint
    if not test_model_info():
        print("Failed to get model info")
        return 1
    
    # Test prediction endpoint
    if not test_prediction():
        print("Failed to make prediction")
        return 1
    
    print("\nAll tests passed!")
    return 0

if __name__ == '__main__':
    sys.exit(main())