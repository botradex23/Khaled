#!/usr/bin/env python3
"""
Risk Management Notification Test

This script tests the risk management notification system, specifically focusing on
Telegram notifications when trades are rejected due to risk violations.

It will:
1. Configure the risk service with test settings
2. Attempt to execute trades that exceed risk limits
3. Verify that notifications are sent correctly
"""

import os
import sys
import json
import time
import logging
import traceback
from typing import Dict, Any
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('logs/risk_notifications_test.log')
    ]
)
logger = logging.getLogger('risk_notifications_test')

# Add the current directory to the Python path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Create logs directory if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Import required modules
try:
    from python_app.services.risk_management.risk_service import (
        check_risk_limits, send_risk_notification
    )
    from python_app.utils.telegram_notifier import send_message, send_markdown_message
    
    MODULES_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    logger.error(traceback.format_exc())
    
    try:
        # Try alternative import paths
        sys.path.append(os.path.join(current_dir, 'python_app'))
        from services.risk_management.risk_service import (
            check_risk_limits, send_risk_notification
        )
        from utils.telegram_notifier import send_message, send_markdown_message
        
        MODULES_AVAILABLE = True
    except ImportError as e:
        logger.error(f"Failed with alternative import paths: {e}")
        logger.error(traceback.format_exc())
        MODULES_AVAILABLE = False

def test_direct_telegram():
    """Test direct Telegram notification"""
    logger.info("Testing direct Telegram notification")
    
    try:
        # Send a simple test message
        result = send_message(
            "🔔 *Risk Notification Test*\n\n"
            "This is a test of the risk notification system."
        )
        
        if result:
            logger.info("✅ Direct Telegram notification sent successfully")
            return True
        else:
            logger.error("❌ Failed to send direct Telegram notification")
            return False
    except Exception as e:
        logger.error(f"❌ Error sending direct Telegram notification: {e}")
        logger.error(traceback.format_exc())
        return False

def test_markdown_telegram():
    """Test markdown-formatted Telegram notification"""
    logger.info("Testing markdown Telegram notification")
    
    try:
        # Send a formatted message
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        result = send_markdown_message(
            f"*🔔 Risk Management Test*\n\n"
            f"*Symbol:* `BTCUSDT`\n"
            f"*Action:* Trade Rejected\n"
            f"*Reason:* Exceeds maximum position size\n"
            f"*Details:* Order size: 2.5 BTC, Max allowed: 1.0 BTC\n"
            f"*Time:* {timestamp}\n\n"
            f"This is a test notification."
        )
        
        if result:
            logger.info("✅ Markdown Telegram notification sent successfully")
            return True
        else:
            logger.error("❌ Failed to send markdown Telegram notification")
            return False
    except Exception as e:
        logger.error(f"❌ Error sending markdown Telegram notification: {e}")
        logger.error(traceback.format_exc())
        return False

def test_risk_notification():
    """Test risk-specific notification"""
    logger.info("Testing risk notification function")
    
    try:
        # Send a risk notification
        result = send_risk_notification(
            symbol="ETHUSDT",
            rule="MAX_ORDER_SIZE",
            reason="Order size exceeds maximum allowed",
            details={
                "requested_size": "1.5 ETH",
                "maximum_allowed": "0.5 ETH"
            },
            trade_id="test-trade-123"
        )
        
        if result:
            logger.info("✅ Risk notification sent successfully")
            return True
        else:
            logger.error("❌ Failed to send risk notification")
            return False
    except Exception as e:
        logger.error(f"❌ Error sending risk notification: {e}")
        logger.error(traceback.format_exc())
        return False

def test_risk_rejection():
    """Test a full risk check and notification scenario"""
    logger.info("Testing risk check and notification scenario")
    
    try:
        # Perform a risk check that should fail
        result = check_risk_limits(
            user_id=1,
            symbol="BTCUSDT",
            side="BUY",
            quantity=2.0,  # Intentionally high to trigger rejection
            price=50000.0
        )
        
        if not result:
            logger.info("✅ Trade correctly rejected due to risk limits")
            
            # Pause to allow notification to be sent
            logger.info("Waiting for notification to be processed...")
            time.sleep(1)
            
            return True
        else:
            logger.error("❌ Trade was incorrectly approved despite exceeding risk limits")
            return False
    except Exception as e:
        logger.error(f"❌ Error during risk check and notification test: {e}")
        logger.error(traceback.format_exc())
        return False

def test_notification_resilience():
    """Test the system's resilience when notifications fail"""
    logger.info("Testing notification resilience")
    
    # Save original function to restore later
    original_send_message = send_message
    
    try:
        # Mock the send_message function to always fail
        def mock_send_message(*args, **kwargs):
            logger.info("Simulating failed notification delivery")
            return False
        
        # Replace the real function with our mock
        globals()['send_message'] = mock_send_message
        
        # Now perform a risk check - this should still work despite notification failure
        result = check_risk_limits(
            user_id=1,
            symbol="BTCUSDT",
            side="BUY",
            quantity=2.0,
            price=50000.0
        )
        
        if not result:
            logger.info("✅ Risk check correctly rejected trade despite notification failure")
            return True
        else:
            logger.error("❌ Risk check incorrectly approved trade")
            return False
    except Exception as e:
        logger.error(f"❌ Error testing notification resilience: {e}")
        logger.error(traceback.format_exc())
        return False
    finally:
        # Restore the original function
        globals()['send_message'] = original_send_message

def run_all_tests():
    """Run all notification tests"""
    logger.info("Starting risk notification tests")
    
    test_results = {
        "direct_telegram": test_direct_telegram(),
        "markdown_telegram": test_markdown_telegram(),
        "risk_notification": test_risk_notification(),
        "risk_rejection": test_risk_rejection(),
        "notification_resilience": test_notification_resilience()
    }
    
    success_count = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    logger.info(f"Test summary: {success_count}/{total_tests} tests passed")
    logger.info(f"Detailed results: {json.dumps(test_results, indent=2)}")
    
    return success_count == total_tests

def main():
    """Main function"""
    if not MODULES_AVAILABLE:
        logger.error("Required modules are not available. Exiting.")
        return 1
    
    try:
        success = run_all_tests()
        
        if success:
            logger.info("✅ All risk notification tests completed successfully!")
            return 0
        else:
            logger.warning("⚠️ Some risk notification tests failed")
            return 1
    except Exception as e:
        logger.error(f"❌ Error in main test execution: {e}")
        logger.error(traceback.format_exc())
        return 1

if __name__ == "__main__":
    sys.exit(main())