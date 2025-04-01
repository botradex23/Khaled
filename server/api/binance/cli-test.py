#!/usr/bin/env python3
"""
Command-line tool for testing the Binance Market Price Service
This script provides a simple CLI interface for testing the Python-based Binance API service
"""

import argparse
import json
import time
from binance_market_service import BinanceMarketPriceService

# Create an instance of the service
binance_market_service = BinanceMarketPriceService()

def main():
    """Main function for the CLI tool"""
    parser = argparse.ArgumentParser(description='Binance Market Price Service CLI Tool')
    parser.add_argument('--action', type=str, required=True,
                        choices=['all-prices', 'symbol-price', '24hr-stats', 'latest-prices', 'simulated-prices'],
                        help='Action to perform')
    parser.add_argument('--symbol', type=str, help='Symbol for symbol-specific actions')
    parser.add_argument('--format', type=str, choices=['json', 'table'], default='json',
                        help='Output format (json or table)')
    parser.add_argument('--limit', type=int, help='Limit the number of results')
    
    args = parser.parse_args()
    result = None  # Initialize result to avoid "possibly unbound" error
    
    try:
        # Execute the requested action
        if args.action == 'all-prices':
            result = binance_market_service.get_all_prices()
            if args.limit and args.limit > 0:
                result = result[:args.limit]
            
        elif args.action == 'symbol-price':
            if not args.symbol:
                raise ValueError("--symbol is required for this action")
            
            result = binance_market_service.get_symbol_price(args.symbol)
            
        elif args.action == '24hr-stats':
            result = binance_market_service.get_24hr_stats(args.symbol)
            if args.limit and args.limit > 0 and isinstance(result, list):
                result = result[:args.limit]
                
        elif args.action == 'latest-prices':
            result = binance_market_service.get_all_latest_prices()
            if args.limit and args.limit > 0:
                result = result[:args.limit]
                
        elif args.action == 'simulated-prices':
            result = binance_market_service._get_simulated_ticker_prices()
            if args.limit and args.limit > 0:
                result = result[:args.limit]
        
        # Format and display the results
        if result is not None:
            if args.format == 'json':
                print(json.dumps(result, indent=2))
            elif args.format == 'table':
                display_as_table(result)
        else:
            print("No results returned from the operation")
        
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0

def display_as_table(data):
    """Display data in a tabular format"""
    if not data:
        print("No data to display")
        return
    
    # Handle different data structures
    if isinstance(data, dict):
        # Single item (dict)
        headers = list(data.keys())
        rows = [list(data.values())]
    elif isinstance(data, list) and len(data) > 0 and all(isinstance(item, dict) for item in data):
        # List of dicts
        headers = list(data[0].keys())
        rows = [list(item.values()) for item in data]
    else:
        # Unknown structure, fall back to JSON
        print(json.dumps(data, indent=2))
        return
    
    # Calculate column widths
    col_widths = []
    for i, h in enumerate(headers):
        header_width = len(str(h))
        max_value_width = 0
        for row in rows:
            if i < len(row):  # Ensure index is in bounds
                max_value_width = max(max_value_width, len(str(row[i])))
        col_widths.append(max(header_width, max_value_width))
    
    # Print header
    header_row = ' | '.join(f"{h:<{col_widths[i]}}" for i, h in enumerate(headers))
    print(header_row)
    print('-' * len(header_row))
    
    # Print rows
    for row in rows:
        # Convert row values to strings and ensure there's a value for each column
        str_values = []
        for i in range(len(headers)):
            if i < len(row):
                str_values.append(str(row[i]))
            else:
                str_values.append('')
        
        print(' | '.join(f"{val:<{col_widths[i]}}" for i, val in enumerate(str_values)))

if __name__ == "__main__":
    exit(main())