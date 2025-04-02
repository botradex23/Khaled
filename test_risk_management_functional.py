#!/usr/bin/env python3
"""
Risk Management Functional Test

This script tests the risk management functionality without relying on external services.
It exercises the risk limit checks and verifies that trades are properly accepted or rejected
based on the configured risk parameters.
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
logger = logging.getLogger('test_risk_management')

# Add parent directory to path if needed
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import risk management module
try:
    from python_app.services.risk_management.risk_service import (
        check_risk_limits, get_risk_settings, update_risk_settings
    )
    MODULES_AVAILABLE = True
except ImportError:
    try:
        # Try alternative import paths
        sys.path.append(os.path.join(current_dir, 'python_app'))
        from services.risk_management.risk_service import (
            check_risk_limits, get_risk_settings, update_risk_settings
        )
        MODULES_AVAILABLE = True
    except ImportError:
        logger.error("Failed to import required modules. Please make sure python_app is in your path.")
        MODULES_AVAILABLE = False


def test_risk_settings_access():
    """Test accessing risk settings for a user"""
    logger.info("Testing risk settings access...")
    
    # Get default risk settings for user 1
    settings = get_risk_settings(1)
    
    if settings:
        logger.info(f"✅ Successfully retrieved risk settings: {json.dumps(settings, indent=2)}")
        return True
    else:
        logger.error("❌ Failed to retrieve risk settings")
        return False


def test_valid_trade():
    """Test a valid trade that should pass risk checks"""
    logger.info("Testing valid trade within risk limits...")
    
    # This should pass risk limits (small quantity)
    result = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.05,  # Small quantity below the default limit of 0.1
        price=50000.0
    )
    
    if result:
        logger.info("✅ Valid trade correctly approved")
        return True
    else:
        logger.error("❌ Valid trade incorrectly rejected")
        return False


def test_invalid_trade():
    """Test an invalid trade that should fail risk checks"""
    logger.info("Testing invalid trade exceeding risk limits...")
    
    # This should fail risk limits (large quantity)
    result = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=1.5,  # Large quantity above the default limit of 0.1
        price=50000.0
    )
    
    if not result:
        logger.info("✅ Invalid trade correctly rejected")
        return True
    else:
        logger.error("❌ Invalid trade incorrectly approved")
        return False


def test_risk_settings_update():
    """Test updating risk settings for a user"""
    logger.info("Testing risk settings update...")
    
    # Get original settings
    original_settings = get_risk_settings(1)
    logger.info(f"Original settings: {json.dumps(original_settings, indent=2)}")
    
    # New settings with increased limits
    new_settings = {
        "maxOrderSize": 2.0,  # Increased from default 0.1
        "maxDailyTrades": 20  # Increased from default 10
    }
    
    # Update settings
    update_result = update_risk_settings(1, new_settings)
    
    if update_result:
        logger.info("✅ Successfully updated risk settings")
        
        # Verify updated settings
        updated_settings = get_risk_settings(1)
        logger.info(f"Updated settings: {json.dumps(updated_settings, indent=2)}")
        
        # Test that a previously invalid trade is now valid
        trade_result = check_risk_limits(
            user_id=1,
            symbol="BTCUSDT",
            side="BUY",
            quantity=1.5,  # Should now be valid with increased limit
            price=50000.0
        )
        
        if trade_result:
            logger.info("✅ Trade with increased limits correctly approved")
            return True
        else:
            logger.error("❌ Trade with increased limits incorrectly rejected")
            return False
    else:
        logger.error("❌ Failed to update risk settings")
        return False


def test_all_risk_functions():
    """Test all risk management functions"""
    success_count = 0
    total_tests = 4
    
    # Test case 1: Risk settings access
    if test_risk_settings_access():
        success_count += 1
    
    # Test case 2: Valid trade
    if test_valid_trade():
        success_count += 1
    
    # Test case 3: Invalid trade
    if test_invalid_trade():
        success_count += 1
    
    # Test case 4: Risk settings update
    if test_risk_settings_update():
        success_count += 1
    
    # Summary
    logger.info(f"Test summary: {success_count}/{total_tests} tests passed")
    
    return success_count == total_tests


def main():
    """Main function"""
    if not MODULES_AVAILABLE:
        logger.error("Required modules are not available. Exiting.")
        return 1
    
    logger.info("Starting risk management functional tests...")
    
    if test_all_risk_functions():
        logger.info("✅ All tests completed successfully!")
        return 0
    else:
        logger.warning("⚠️ Some tests did not complete successfully")
        return 1


if __name__ == "__main__":
    sys.exit(main())