#!/usr/bin/env python3
"""
Telegram Notifications Test Script

This script tests the Telegram notification system for trade alerts.
It demonstrates how to send notifications for various trade events.
"""

import os
import sys
import json
import logging
import time
from datetime import datetime

# Add the parent directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Set up basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("telegram_test")

# Import the Telegram notifier
try:
    from python_app.utils.telegram_notifier import (
        get_telegram_notifier, notify_signal, notify_order_created,
        notify_trade_executed, notify_trade_error, notify_risk_management
    )
except ImportError:
    try:
        from utils.telegram_notifier import (
            get_telegram_notifier, notify_signal, notify_order_created,
            notify_trade_executed, notify_trade_error, notify_risk_management
        )
    except ImportError:
        logger.error("Could not import Telegram notifier. Make sure it's installed correctly.")
        sys.exit(1)

# Import the trade logger
try:
    from python_app.utils.trade_logger import (
        log_trade_signal, log_trade_order, log_trade_execution,
        update_trade_status, log_trade_error
    )
except ImportError:
    try:
        from utils.trade_logger import (
            log_trade_signal, log_trade_order, log_trade_execution,
            update_trade_status, log_trade_error
        )
    except ImportError:
        logger.error("Could not import Trade Logger. Make sure it's installed correctly.")
        sys.exit(1)


def test_direct_notifications():
    """Test sending notifications directly via the Telegram notifier"""
    logger.info("Testing direct Telegram notifications...")
    
    # Get notifier instance
    notifier = get_telegram_notifier()
    
    if not notifier.enabled:
        logger.error("Telegram notifications are disabled. Check your configuration.")
        logger.info(f"Bot token configured: {bool(notifier.bot_token)}")
        logger.info(f"Admin chat ID configured: {bool(notifier.admin_chat_id)}")
        return False
    
    # Test signal notification
    logger.info("Testing AI signal notification...")
    signal_result = notify_signal(
        symbol="BTCUSDT",
        side="BUY",
        source="AI_GRID_BOT",
        confidence=0.91,
        price=67100.0,
        signal_id="SIG-TEST-1"
    )
    logger.info(f"Signal notification result: {signal_result}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test order creation notification
    logger.info("Testing order creation notification...")
    order_result = notify_order_created(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.001,
        order_type="MARKET",
        source="AI_GRID_BOT",
        trade_id="T-TEST-1",
        price=None
    )
    logger.info(f"Order creation notification result: {order_result}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test trade execution notification
    logger.info("Testing trade execution notification...")
    execution_result = notify_trade_executed(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.001,
        price=67100.0,
        trade_id="T-TEST-1",
        order_id="BINANCE-TEST-1",
        confidence=0.91
    )
    logger.info(f"Trade execution notification result: {execution_result}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test error notification
    logger.info("Testing error notification...")
    error_result = notify_trade_error(
        symbol="BTCUSDT",
        operation="EXECUTION",
        error_type="CONNECTION_ERROR",
        error_message="Failed to connect to Binance API",
        trade_id="T-TEST-1"
    )
    logger.info(f"Error notification result: {error_result}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test risk management notification
    logger.info("Testing risk management notification...")
    risk_result = notify_risk_management(
        symbol="BTCUSDT",
        rule="MAX_POSITIONS",
        reason="Maximum positions limit reached",
        trade_id="T-TEST-1",
        details={
            "current_positions": 10,
            "max_allowed": 10,
            "portfolio_risk": "75%"
        }
    )
    logger.info(f"Risk management notification result: {risk_result}")
    
    return True


def test_integrated_notifications():
    """Test sending notifications via the trade logger integration"""
    logger.info("Testing trade logger integration with Telegram notifications...")
    
    # Test logging a trade signal
    logger.info("Testing trade signal logging with notification...")
    signal_id = log_trade_signal(
        symbol="ETHUSDT",
        side="SELL",
        source="MACD_BOT",
        price=3100.0,
        quantity=0.1,
        signal_data={
            "confidence": 0.85,
            "indicators": {
                "rsi": 78.5,
                "macd": -0.125
            }
        }
    )
    logger.info(f"Signal logged with ID: {signal_id}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test logging an order creation
    logger.info("Testing order creation logging with notification...")
    trade_id = log_trade_order(
        symbol="ETHUSDT",
        side="SELL",
        quantity=0.1,
        order_type="MARKET",
        source="MACD_BOT",
        signal_id=signal_id
    )
    logger.info(f"Order logged with ID: {trade_id}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test logging an execution result
    logger.info("Testing execution result logging with notification...")
    execution_logged = log_trade_execution(
        trade_id=trade_id,
        success=True,
        executed_price=3095.0,
        executed_quantity=0.1,
        order_id="BINANCE-TEST-2",
        is_paper_trade=True
    )
    logger.info(f"Execution result logged: {execution_logged}")
    
    time.sleep(1)  # Delay to avoid rate limits
    
    # Test logging an error
    logger.info("Testing error logging with notification...")
    error_logged = log_trade_error(
        trade_id=trade_id,
        error_type="SLIPPAGE_ERROR",
        error_message="Price slippage exceeded tolerance",
        context={
            "symbol": "ETHUSDT",
            "operation": "EXECUTION",
            "expected_price": 3100.0,
            "actual_price": 3050.0,
            "slippage_percent": 1.6
        }
    )
    logger.info(f"Error logged: {error_logged}")
    
    return True


def main():
    """Main function"""
    print("\n=== Telegram Notifications Test ===\n")
    
    # Test direct notifications
    direct_success = test_direct_notifications()
    
    print("\n")
    
    # Test integrated notifications
    if direct_success:
        integrated_success = test_integrated_notifications()
    else:
        integrated_success = False
        print("Skipping integrated tests due to direct notification failure.")
    
    print("\n=== Test Results ===")
    print(f"Direct notifications: {'SUCCESS' if direct_success else 'FAILED'}")
    print(f"Integrated notifications: {'SUCCESS' if integrated_success else 'FAILED'}")
    print("\n=== Telegram Notifications Test Complete ===")


if __name__ == "__main__":
    main()