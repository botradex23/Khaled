#!/usr/bin/env python3
"""
Command-line interface for testing live predictions.

Usage:
    python test_cli.py --symbol BTCUSDT --model balanced|standard
"""

import os
import sys
import json
import argparse
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Add current directory to path
sys.path.append('.')

def main():
    """Main function for the CLI"""
    parser = argparse.ArgumentParser(description='Test live predictions from the command line')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Symbol to predict (default: BTCUSDT)')
    parser.add_argument('--model', type=str, default='balanced', choices=['balanced', 'standard'],
                        help='Model type to use (default: balanced)')
    parser.add_argument('--output', type=str, default='json', choices=['json', 'plain'],
                        help='Output format (default: json)')
    
    args = parser.parse_args()
    
    # Import the direct prediction function
    try:
        from direct_test import direct_predict
        
        # Make prediction
        result = direct_predict(args.symbol, args.model)
        
        if result:
            if args.output == 'json':
                print(json.dumps(result, indent=2))
            else:
                print(f"Prediction for {args.symbol} using {args.model} model:")
                print(f"- Signal: {result['predicted_label']}")
                print(f"- Confidence: {result['confidence']:.4f}")
                print(f"- Current price: {result['current_price']}")
                print("\nKey indicators:")
                for indicator, value in result['indicators'].items():
                    print(f"- {indicator}: {value}")
        else:
            print("Prediction failed")
            
    except Exception as e:
        logging.error(f"Error in CLI: {e}", exc_info=True)
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()