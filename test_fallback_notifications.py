#!/usr/bin/env python3
"""
Fallback Notification System Test

This script tests the fallback notification system that logs notifications to files
when external services like Telegram are unavailable.
"""

import os
import sys
import json
import logging
import traceback
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('fallback_test')

# Add current directory to Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import the fallback notifier
try:
    from python_app.utils.fallback_notifier import (
        log_risk_notification,
        log_trade_notification,
        log_error_notification,
        get_recent_notifications
    )
    FALLBACK_AVAILABLE = True
except ImportError:
    try:
        # Try alternative import path
        sys.path.append(os.path.join(current_dir, 'python_app'))
        from utils.fallback_notifier import (
            log_risk_notification,
            log_trade_notification,
            log_error_notification,
            get_recent_notifications
        )
        FALLBACK_AVAILABLE = True
    except ImportError as e:
        logger.error(f"Failed to import fallback notifier: {e}")
        FALLBACK_AVAILABLE = False


def test_risk_notification():
    """Test logging a risk notification"""
    logger.info("Testing risk notification logging")
    
    result = log_risk_notification(
        symbol="BTCUSDT",
        rule="MAX_ORDER_SIZE",
        reason="Order size exceeds maximum allowed",
        details={
            "user_id": 1,
            "requested_size": 2.5,
            "maximum_allowed": 1.0
        },
        trade_id="test-risk-123"
    )
    
    if result:
        logger.info("✅ Risk notification logged successfully")
        return True
    else:
        logger.error("❌ Failed to log risk notification")
        return False


def test_trade_notification():
    """Test logging a trade notification"""
    logger.info("Testing trade notification logging")
    
    result = log_trade_notification(
        action="ORDER_CREATED",
        symbol="ETHUSDT",
        side="BUY",
        quantity=0.5,
        price=3000.0,
        trade_id="test-trade-456",
        details={
            "user_id": 1,
            "order_type": "LIMIT",
            "time_in_force": "GTC"
        }
    )
    
    if result:
        logger.info("✅ Trade notification logged successfully")
        return True
    else:
        logger.error("❌ Failed to log trade notification")
        return False


def test_error_notification():
    """Test logging an error notification"""
    logger.info("Testing error notification logging")
    
    result = log_error_notification(
        error_type="API_CONNECTION_ERROR",
        message="Failed to connect to Binance API",
        service="BinanceMarketService",
        details={
            "endpoint": "/api/v3/ticker/price",
            "status_code": 403,
            "error_message": "API key expired"
        }
    )
    
    if result:
        logger.info("✅ Error notification logged successfully")
        return True
    else:
        logger.error("❌ Failed to log error notification")
        return False


def test_retrieve_notifications():
    """Test retrieving recent notifications"""
    logger.info("Testing notification retrieval")
    
    # Log one of each type first
    log_risk_notification(
        symbol="BTCUSDT",
        rule="TEST_RETRIEVAL",
        reason="Testing notification retrieval"
    )
    
    log_trade_notification(
        action="TEST_RETRIEVAL",
        symbol="ETHUSDT",
        side="BUY",
        quantity=0.1
    )
    
    log_error_notification(
        error_type="TEST_RETRIEVAL",
        message="Testing notification retrieval"
    )
    
    # Now retrieve all notifications
    notifications = get_recent_notifications(limit=5)
    
    if len(notifications) > 0:
        logger.info(f"✅ Retrieved {len(notifications)} notifications successfully")
        logger.info(f"Most recent notification: {json.dumps(notifications[0], indent=2)}")
        return True
    else:
        logger.error("❌ Failed to retrieve notifications")
        return False


def test_filtered_notifications():
    """Test retrieving notifications filtered by type"""
    logger.info("Testing filtered notification retrieval")
    
    # Retrieve only risk notifications
    risk_notifications = get_recent_notifications(
        limit=3,
        notification_type="risk_management"
    )
    
    if len(risk_notifications) > 0:
        logger.info(f"✅ Retrieved {len(risk_notifications)} risk notifications successfully")
        return True
    else:
        logger.error("❌ Failed to retrieve risk notifications")
        return False


def run_all_tests():
    """Run all notification tests"""
    logger.info("Starting fallback notification tests")
    
    test_results = {
        "risk_notification": test_risk_notification(),
        "trade_notification": test_trade_notification(),
        "error_notification": test_error_notification(),
        "retrieve_notifications": test_retrieve_notifications(),
        "filtered_notifications": test_filtered_notifications()
    }
    
    success_count = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    logger.info(f"Test summary: {success_count}/{total_tests} tests passed")
    logger.info(f"Detailed results: {json.dumps(test_results, indent=2)}")
    
    return success_count == total_tests


def main():
    """Main function"""
    if not FALLBACK_AVAILABLE:
        logger.error("Fallback notifier is not available. Exiting.")
        return 1
    
    try:
        success = run_all_tests()
        
        if success:
            logger.info("✅ All fallback notification tests completed successfully!")
            return 0
        else:
            logger.warning("⚠️ Some fallback notification tests failed")
            return 1
    except Exception as e:
        logger.error(f"❌ Error in main test execution: {e}")
        logger.error(f"Stack trace: {traceback.format_exc()}")
        return 1


if __name__ == "__main__":
    sys.exit(main())