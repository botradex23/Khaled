#!/usr/bin/env python3
"""
Risk Management Service

This module provides risk management functionality for trading operations,
including:
1. Checking if a proposed trade meets risk limits
2. Getting risk settings for a specific user
3. Updating user risk settings
"""

import os
import sys
import json
import logging
import requests
from typing import Dict, Any, Optional, Union, List, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'risk_management.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('risk_management')

# Add current directory to path to ensure imports work correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import config if available
try:
    from python_app.config import active_config
except ImportError:
    try:
        from config import active_config
    except ImportError:
        # Default configuration
        class DefaultConfig:
            RISK_API_ENDPOINT = "http://localhost:5000/api/risk-management"
        active_config = DefaultConfig()


def check_risk_limits(
    user_id: int,
    symbol: str,
    side: str,
    quantity: float,
    price: Optional[float] = None
) -> bool:
    """
    Check if a proposed trade meets the risk limits for the user
    
    Args:
        user_id: The user ID
        symbol: Trading pair symbol
        side: Order side (BUY/SELL)
        quantity: Order quantity
        price: Optional price for the trade
        
    Returns:
        True if the trade is allowed, False if rejected
    """
    logger.info(f"Checking risk limits for user {user_id}: {side} {quantity} {symbol}")
    
    try:
        # Get risk settings for the user
        risk_settings = get_risk_settings(user_id)
        
        # If we couldn't get risk settings, default to allowing the trade
        if not risk_settings:
            logger.warning(f"No risk settings found for user {user_id}, allowing trade")
            return True
        
        # Extract risk parameters
        max_position_size = risk_settings.get('maxPositionSize', float('inf'))
        max_order_size = risk_settings.get('maxOrderSize', float('inf'))
        max_daily_trades = risk_settings.get('maxDailyTrades', float('inf'))
        max_daily_drawdown = risk_settings.get('maxDailyDrawdown', float('inf'))
        
        # Connect to Node.js risk management system via API
        try:
            response = requests.post(
                f"{active_config.RISK_API_ENDPOINT}/check-trade",
                json={
                    "userId": user_id,
                    "symbol": symbol,
                    "side": side,
                    "quantity": quantity,
                    "price": price
                },
                timeout=2.0  # Short timeout to avoid blocking
            )
            
            if response.status_code == 200:
                result = response.json()
                allowed = result.get('allowed', True)
                reason = result.get('reason', 'Unknown')
                
                if not allowed:
                    logger.warning(f"Trade rejected by risk API: {reason}")
                
                return allowed
            else:
                logger.error(f"Error from risk API: {response.status_code} - {response.text}")
                # Default to local risk check if API fails
        
        except (requests.RequestException, json.JSONDecodeError) as e:
            logger.error(f"Failed to connect to risk management API: {str(e)}")
            # Continue with local risk checking
        
        # Perform basic risk checks locally as a fallback
        # 1. Check maximum order size
        if quantity > max_order_size:
            logger.warning(f"Trade rejected: Order size {quantity} exceeds limit {max_order_size}")
            return False
        
        # All checks passed
        logger.info(f"Trade approved for user {user_id}: {side} {quantity} {symbol}")
        return True
        
    except Exception as e:
        logger.error(f"Error in risk check: {str(e)}")
        # Default to allowing the trade in case of errors
        return True


def get_risk_settings(user_id: int) -> Dict[str, Any]:
    """
    Get risk settings for a specific user
    
    Args:
        user_id: The user ID
        
    Returns:
        Dictionary with risk settings
    """
    logger.info(f"Getting risk settings for user {user_id}")
    
    try:
        # Try to get settings from the Node.js risk management system
        try:
            response = requests.get(
                f"{active_config.RISK_API_ENDPOINT}/settings/{user_id}",
                timeout=2.0
            )
            
            if response.status_code == 200:
                settings = response.json()
                logger.info(f"Got risk settings for user {user_id} from API")
                return settings
            else:
                logger.error(f"Error from risk API: {response.status_code} - {response.text}")
                # Fall back to default settings
        
        except (requests.RequestException, json.JSONDecodeError) as e:
            logger.error(f"Failed to get risk settings from API: {str(e)}")
            # Continue with default settings
        
        # Default risk settings
        default_settings = {
            "maxPositionSize": 1.0,      # BTC
            "maxOrderSize": 0.1,         # BTC
            "maxDailyTrades": 10,        # Number of trades
            "maxDailyDrawdown": 5.0,     # Percentage
            "stopLossPercentage": 2.0,   # Percentage
            "takeProfitPercentage": 5.0  # Percentage
        }
        
        logger.info(f"Using default risk settings for user {user_id}")
        return default_settings
        
    except Exception as e:
        logger.error(f"Error getting risk settings: {str(e)}")
        return {}


def update_risk_settings(user_id: int, settings: Dict[str, Any]) -> bool:
    """
    Update risk settings for a specific user
    
    Args:
        user_id: The user ID
        settings: Dictionary with risk settings to update
        
    Returns:
        True if successful, False otherwise
    """
    logger.info(f"Updating risk settings for user {user_id}")
    
    try:
        # Try to update settings via the API
        try:
            response = requests.put(
                f"{active_config.RISK_API_ENDPOINT}/settings/{user_id}",
                json=settings,
                timeout=2.0
            )
            
            if response.status_code == 200:
                logger.info(f"Updated risk settings for user {user_id}")
                return True
            else:
                logger.error(f"Error updating risk settings: {response.status_code} - {response.text}")
                return False
        
        except requests.RequestException as e:
            logger.error(f"Failed to update risk settings: {str(e)}")
            return False
        
    except Exception as e:
        logger.error(f"Error updating risk settings: {str(e)}")
        return False


# Testing
if __name__ == "__main__":
    print("Testing Risk Management Service")
    
    # Test risk checks
    result = check_risk_limits(
        user_id=1,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.1,
        price=50000.0
    )
    
    print(f"Risk check result: {result}")
    
    # Test getting risk settings
    settings = get_risk_settings(1)
    print(f"Risk settings: {json.dumps(settings, indent=2)}")