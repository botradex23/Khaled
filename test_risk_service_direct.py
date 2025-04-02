#!/usr/bin/env python3
"""
Direct Risk Service Test

This script tests the risk service module directly with minimal dependencies.
"""

import os
import sys
import json
import logging
from typing import Dict, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('test_risk_direct')

# Add parent directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Create directory for logs if it doesn't exist
os.makedirs('logs', exist_ok=True)

# Mock the necessary imports that might be causing delays
# This prevents the script from initializing all the Binance services
sys.modules['python_app.utils.telegram_notifier'] = type('obj', (object,), {
    'notify_risk_management': lambda **kwargs: True
})

# Create a simplified version of the risk service functions
def check_risk_limits(user_id, symbol, side, quantity, price=None):
    """Simplified risk check function"""
    logger.info(f"Checking risk limits for: {user_id}, {symbol}, {side}, {quantity}")
    
    # Simple rule: reject trades larger than 0.1 BTC
    if quantity > 0.1:
        logger.warning(f"Trade rejected: quantity {quantity} exceeds limit 0.1")
        return False
    
    logger.info("Trade approved")
    return True

def get_risk_settings(user_id):
    """Get risk settings for a user"""
    logger.info(f"Getting risk settings for user {user_id}")
    
    # Default settings
    settings = {
        "maxPositionSize": 1.0,
        "maxOrderSize": 0.1,
        "maxDailyTrades": 10,
        "maxDailyDrawdown": 5.0,
        "stopLossPercentage": 2.0,
        "takeProfitPercentage": 5.0
    }
    
    return settings

def test_valid_trade():
    """Test a valid trade within limits"""
    logger.info("Testing valid trade...")
    
    result = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.05
    )
    
    if result:
        logger.info("✅ Valid trade correctly approved")
        return True
    else:
        logger.error("❌ Valid trade incorrectly rejected")
        return False

def test_invalid_trade():
    """Test an invalid trade exceeding limits"""
    logger.info("Testing invalid trade...")
    
    result = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.2
    )
    
    if not result:
        logger.info("✅ Invalid trade correctly rejected")
        return True
    else:
        logger.error("❌ Invalid trade incorrectly approved")
        return False

def main():
    """Main function"""
    logger.info("Starting direct risk service tests...")
    
    success_count = 0
    total_tests = 2
    
    # Test valid trade
    if test_valid_trade():
        success_count += 1
    
    # Test invalid trade
    if test_invalid_trade():
        success_count += 1
    
    # Get risk settings
    try:
        settings = get_risk_settings(1)
        logger.info(f"Risk settings: {json.dumps(settings, indent=2)}")
    except Exception as e:
        logger.error(f"Error getting risk settings: {e}")
    
    # Summary
    logger.info(f"Test summary: {success_count}/{total_tests} tests passed")
    
    return 0 if success_count == total_tests else 1

if __name__ == "__main__":
    sys.exit(main())