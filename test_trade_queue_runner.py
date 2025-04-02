#!/usr/bin/env python3
"""
Trade Queue Runner Test

This script demonstrates the complete flow of the Trade Execution Queue system:
1. Initializes Binance services with proper proxy configuration
2. Queues trade orders (both market and limit)
3. Shows how orders flow through the queue to execution
4. Integrates with risk management for trade validation
5. Handles errors and retry mechanisms

Usage:
    python test_trade_queue_runner.py [--help] [--use-testnet] [--paper-trading]
"""

import os
import sys
import time
import json
import logging
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join('logs', 'test_trade_queue.log'))
    ]
)
logger = logging.getLogger('test_trade_queue_runner')

# Try to import dotenv
try:
    import dotenv
    # Load environment variables
    dotenv.load_dotenv()
except ImportError:
    logger.warning("python-dotenv not installed, skipping .env loading")

# Add project root to path if needed
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import Binance services
try:
    from python_app.services.binance.binance_service_manager import (
        initialize_binance_services,
        place_order,
        get_order_status,
        cancel_order,
        check_api_connection
    )
    from python_app.services.queue.trade_execution_queue import TradeStatus
    from python_app.services.risk_management.risk_service import (
        check_risk_limits,
        get_risk_settings,
        update_risk_settings
    )
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error("Make sure you're running this script from the project root")
    sys.exit(1)

def parse_arguments():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Test the Trade Execution Queue system')
    parser.add_argument('--use-testnet', action='store_true', help='Use Binance Testnet')
    parser.add_argument('--paper-trading', action='store_true', help='Enable paper trading mode')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Trading symbol to test')
    parser.add_argument('--quantity', type=float, default=0.001, help='Quantity to trade')
    parser.add_argument('--market-price', action='store_true', help='Use market price for orders')
    parser.add_argument('--retry-failed', action='store_true', help='Test retry mechanism for failed orders')
    parser.add_argument('--test-cancel', action='store_true', help='Test order cancellation')
    return parser.parse_args()

def test_risk_management():
    """Test risk management integration"""
    logger.info("=== Testing Risk Management Integration ===")
    
    # Get default risk settings for user 1
    risk_settings = get_risk_settings(1)
    logger.info(f"Default risk settings: {json.dumps(risk_settings, indent=2)}")
    
    # Test risk check that should pass (small order)
    small_order_check = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.001,
        price=50000.0
    )
    logger.info(f"Small order risk check result: {small_order_check}")
    
    # Test risk check that should fail (order too large)
    max_order_size = risk_settings.get('maxOrderSize', 0.1)
    large_order_check = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=max_order_size * 2,  # Double the max order size
        price=50000.0
    )
    logger.info(f"Large order risk check result: {large_order_check}")
    
    return small_order_check

def test_queue_order_flow(args):
    """Test the complete order flow through the queue"""
    logger.info("=== Testing Queue Order Flow ===")
    
    # Place a market order
    market_order = place_order(
        symbol=args.symbol,
        side="BUY",
        quantity=args.quantity,
        order_type="MARKET",
        user_id=1,
        strategy_id="test_queue_flow",
        meta={"test": True, "queue_test": True}
    )
    
    logger.info(f"Market order queued: {json.dumps(market_order, indent=2)}")
    market_order_id = market_order.get('trade_id')
    
    # Wait briefly
    time.sleep(2)
    
    # Place a limit order
    current_price = 30000.0  # Safe default price
    try:
        # Try to get real price to make a realistic limit order
        from python_app.services.binance.binance_service_manager import get_symbol_price
        price_info = get_symbol_price(args.symbol)
        if isinstance(price_info, dict) and 'price' in price_info:
            current_price = float(price_info['price'])
    except Exception as e:
        logger.warning(f"Could not get current price: {e}, using default price")
    
    # Set limit price below market for safety (or above for sell orders)
    limit_price = current_price * 0.95  # 5% below current price for BUY orders
    
    limit_order = place_order(
        symbol=args.symbol,
        side="BUY",
        quantity=args.quantity,
        order_type="LIMIT",
        price=limit_price,
        user_id=1,
        strategy_id="test_queue_flow",
        meta={"test": True, "queue_test": True}
    )
    
    logger.info(f"Limit order queued: {json.dumps(limit_order, indent=2)}")
    limit_order_id = limit_order.get('trade_id')
    
    # Test cancellation if requested
    if args.test_cancel:
        logger.info("Testing order cancellation...")
        cancel_result = cancel_order(limit_order_id)
        logger.info(f"Cancel result: {json.dumps(cancel_result, indent=2)}")
    
    # Monitor order statuses
    orders = [
        {"id": market_order_id, "type": "MARKET", "status": None},
        {"id": limit_order_id, "type": "LIMIT", "status": None}
    ]
    
    # Poll order status for up to 30 seconds
    max_time = 30
    start_time = time.time()
    
    logger.info(f"Monitoring order statuses for up to {max_time} seconds...")
    
    while time.time() - start_time < max_time:
        all_complete = True
        
        for order in orders:
            # Skip orders that are already in final states
            if order['status'] in ['EXECUTED', 'FAILED', 'CANCELED', 'RISK_REJECTED']:
                continue
                
            # Check current status
            status_info = get_order_status(order['id'])
            order['status'] = status_info.get('status')
            
            logger.info(f"{order['type']} order {order['id']}: {order['status']}")
            
            # If order is not in a final state, we need to keep polling
            if order['status'] not in ['EXECUTED', 'FAILED', 'CANCELED', 'RISK_REJECTED']:
                all_complete = False
        
        if all_complete:
            logger.info("All orders have reached final states")
            break
            
        # Wait before polling again
        time.sleep(2)
    
    # Final status report
    logger.info("=== Final Order Statuses ===")
    for order in orders:
        status_info = get_order_status(order['id'])
        logger.info(f"{order['type']} order {order['id']}: {status_info.get('status')}")
        logger.info(json.dumps(status_info, indent=2))
    
    return orders

def test_retry_mechanism(args):
    """Test the retry mechanism for failed orders"""
    logger.info("=== Testing Retry Mechanism ===")
    
    # Place an order that will fail (invalid symbol)
    invalid_order = place_order(
        symbol="INVALIDPAIRUSDT",  # This symbol doesn't exist
        side="BUY",
        quantity=args.quantity,
        order_type="MARKET",
        user_id=1,
        strategy_id="test_retry_mechanism",
        meta={"test": True, "retry_test": True}
    )
    
    logger.info(f"Invalid order queued: {json.dumps(invalid_order, indent=2)}")
    invalid_order_id = invalid_order.get('trade_id')
    
    # Monitor order status
    logger.info("Monitoring invalid order status...")
    
    # Poll order status for up to 30 seconds
    max_time = 30
    start_time = time.time()
    last_status = None
    
    while time.time() - start_time < max_time:
        status_info = get_order_status(invalid_order_id)
        current_status = status_info.get('status')
        
        # Only log if status changed
        if current_status != last_status:
            logger.info(f"Invalid order status: {current_status}")
            last_status = current_status
            
            # Show full status on changes
            logger.info(json.dumps(status_info, indent=2))
        
        # Check if order has reached a final state
        if current_status in ['FAILED', 'CANCELED', 'RISK_REJECTED']:
            logger.info("Invalid order has reached final state")
            break
            
        # Wait before polling again
        time.sleep(2)
    
    # Final status
    final_status = get_order_status(invalid_order_id)
    logger.info("=== Final Invalid Order Status ===")
    logger.info(json.dumps(final_status, indent=2))
    
    # Check if retries were attempted
    retries = final_status.get('retries', 0)
    logger.info(f"Order was retried {retries} times before failing")
    
    return final_status

def main():
    """Main function"""
    args = parse_arguments()
    
    logger.info("=== Trade Queue Runner Test ===")
    logger.info(f"Time: {datetime.now().isoformat()}")
    logger.info(f"Arguments: {args}")
    
    # Initialize Binance services
    logger.info("\nInitializing Binance services...")
    try:
        services = initialize_binance_services(
            use_testnet=args.use_testnet,
            paper_mode=args.paper_trading
        )
        logger.info("Binance services initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Binance services: {e}")
        return False
    
    # Check API connection
    connection_result = check_api_connection()
    logger.info(f"API connection: {connection_result.get('message')}")
    
    if not connection_result.get('connected') and not args.paper_trading:
        logger.warning("Not connected to Binance API and paper trading is disabled")
        logger.warning("Continuing with test, but orders may fail")
    
    # Test risk management integration
    risk_check_result = test_risk_management()
    if not risk_check_result:
        logger.error("Risk management integration test failed")
        return False
    
    # Test the queue order flow
    orders = test_queue_order_flow(args)
    
    # Test retry mechanism if requested
    if args.retry_failed:
        retry_status = test_retry_mechanism(args)
    
    logger.info("\n=== Test Complete ===")
    
    # Check if tests were successful
    success = True
    for order in orders:
        if order['status'] not in ['EXECUTED', 'CANCELED']:
            if not args.test_cancel or order['type'] != 'LIMIT':
                success = False
                logger.error(f"Order {order['id']} did not complete successfully: {order['status']}")
    
    if success:
        logger.info("All tests passed successfully!")
    else:
        logger.error("Some tests failed!")
    
    return success

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)