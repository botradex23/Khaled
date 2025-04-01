#!/usr/bin/env python3
"""
Main entry point for direct execution of the Binance Market Price Service
This script allows the service to be called directly from the Node.js bridge
"""

import sys
import json
import argparse
from .binance_market_service import BinanceMarketPriceService

def main():
    """Main function when executing the module directly"""
    parser = argparse.ArgumentParser(description='Binance Market Price Service')
    parser.add_argument('--action', type=str, required=True,
                        choices=['all-prices', 'symbol-price', '24hr-stats', 'latest-prices', 'simulated-prices'],
                        help='Action to perform')
    parser.add_argument('--symbol', type=str, help='Symbol for symbol-specific actions')
    
    args = parser.parse_args()
    service = BinanceMarketPriceService()
    
    try:
        # Initialize result to None
        result = None
        
        # Execute the requested action
        if args.action == 'all-prices':
            result = service.get_all_prices()
            
        elif args.action == 'symbol-price':
            if not args.symbol:
                raise ValueError("--symbol is required for this action")
            
            result = service.get_symbol_price(args.symbol)
            
        elif args.action == '24hr-stats':
            result = service.get_24hr_stats(args.symbol)
                
        elif args.action == 'latest-prices':
            result = service.get_all_latest_prices()
                
        elif args.action == 'simulated-prices':
            result = service.get_simulated_prices()
        
        # Check if result is None or not set
        if result is None:
            print("[]")  # Return empty array as fallback
        else:
            # Print JSON result for parsing by Node.js
            print(json.dumps(result))
        
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()