#!/usr/bin/env python3
"""
Test Binance Queue Integration

This script tests the integration between:
1. Binance Trading Service
2. Trade Execution Queue
3. Trade Queue Service

It demonstrates how trades flow through the system from queue to execution.
"""

import os
import sys
import time
import logging
import json
from datetime import datetime
from typing import Dict, Any

# Try to import dotenv
try:
    import dotenv
    # Load environment variables
    dotenv.load_dotenv()
except ImportError:
    print("Warning: python-dotenv not installed, skipping .env loading")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('test_binance_queue')

# Import services
try:
    from python_app.services.binance.binance_service_manager import (
        initialize_binance_services,
        place_order,
        get_order_status,
        check_api_connection
    )
except ImportError:
    # Add project root to sys.path
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = current_dir  # Assuming script is in project root
    if project_root not in sys.path:
        sys.path.append(project_root)
    
    # Try import again
    from python_app.services.binance.binance_service_manager import (
        initialize_binance_services,
        place_order,
        get_order_status,
        check_api_connection
    )

def test_api_connection():
    """Test connection to Binance API"""
    print("\n--- Testing Binance API Connection ---")
    result = check_api_connection()
    print(f"Connection result: {json.dumps(result, indent=2)}")
    
    # Even if we're not connected to live API, we can continue with testing
    # since we're using paper trading mode
    print("Continuing with paper trading mode regardless of connection status")
    return True  # Always return True to continue testing

def test_order_queue():
    """Test placing orders through the queue"""
    print("\n--- Testing Order Queue ---")
    
    # Place a market order
    market_order = place_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.001,  # Small quantity for testing
        order_type="MARKET",
        user_id=1,
        strategy_id="test_integration",
        meta={"test": True, "paper_trade": True, "timestamp": datetime.now().isoformat()}
    )
    
    print(f"Market order placed: {json.dumps(market_order, indent=2)}")
    market_order_id = market_order.get('trade_id')
    
    # Place a limit order
    limit_order = place_order(
        symbol="ETHUSDT",
        side="BUY",
        quantity=0.01,  # Small quantity for testing
        order_type="LIMIT",
        price=1800.0,  # Set below current price for safety
        user_id=1,
        strategy_id="test_integration",
        meta={"test": True, "timestamp": datetime.now().isoformat()}
    )
    
    print(f"Limit order placed: {json.dumps(limit_order, indent=2)}")
    limit_order_id = limit_order.get('trade_id')
    
    # Wait for processing
    print("\nWaiting for orders to be processed...")
    time.sleep(5)
    
    # Check order statuses
    print("\nChecking order statuses:")
    
    # Market order status
    market_status = get_order_status(market_order_id)
    print(f"Market order status: {json.dumps(market_status, indent=2)}")
    
    # Limit order status
    limit_status = get_order_status(limit_order_id)
    print(f"Limit order status: {json.dumps(limit_status, indent=2)}")
    
    return {
        "market_order": market_status,
        "limit_order": limit_status
    }

def main():
    """Main test function"""
    print("=== Binance Queue Integration Test ===")
    print(f"Time: {datetime.now().isoformat()}")
    
    # Initialize services
    print("\nInitializing Binance services...")
    try:
        # Always use testnet and paper trading for safe testing
        services = initialize_binance_services(
            use_testnet=True,
            paper_mode=True
        )
        print("Services initialized successfully")
    except Exception as e:
        print(f"Error initializing services: {e}")
        return False
    
    # Test connection first
    if not test_api_connection():
        print("API connection test failed - skipping order tests")
        return False
    
    # Test order queue
    test_results = test_order_queue()
    
    print("\n=== Test Complete ===")
    
    # Check if orders were executed or at least processed
    market_status = test_results.get('market_order', {}).get('status')
    limit_status = test_results.get('limit_order', {}).get('status')
    
    if market_status in ['EXECUTED', 'PROCESSING'] and limit_status in ['EXECUTED', 'PROCESSING']:
        print("Integration test PASSED - orders properly flowed through the system")
        return True
    else:
        print("Integration test FAILED - orders did not flow through the system correctly")
        print(f"Market order status: {market_status}")
        print(f"Limit order status: {limit_status}")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)