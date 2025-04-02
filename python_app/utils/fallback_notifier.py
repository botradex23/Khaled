"""
Fallback Notification System

This module provides fallback notification methods when external services (like Telegram)
are unavailable or not properly configured. It ensures critical notifications
are still recorded even if they can't be delivered externally.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, List, Union

# Configure logging
logger = logging.getLogger(__name__)

# Ensure the notifications directory exists
NOTIFICATIONS_DIR = os.path.join('logs', 'notifications')
os.makedirs(NOTIFICATIONS_DIR, exist_ok=True)

def log_risk_notification(
    symbol: str,
    rule: str,
    reason: str,
    details: Optional[Dict[str, Any]] = None,
    trade_id: Optional[str] = None
) -> bool:
    """
    Log a risk management notification to a local file
    
    Args:
        symbol: Trading pair symbol
        rule: Risk rule that was triggered
        reason: Reason for the rejection
        details: Additional details about the event
        trade_id: Trade ID (if available)
        
    Returns:
        bool: True if notification was logged, False otherwise
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        filename = f"risk_notification_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{rule}.json"
        filepath = os.path.join(NOTIFICATIONS_DIR, filename)
        
        notification = {
            'timestamp': timestamp,
            'symbol': symbol,
            'rule': rule,
            'reason': reason,
            'details': details or {},
            'trade_id': trade_id,
            'notification_type': 'risk_management'
        }
        
        with open(filepath, 'w') as f:
            json.dump(notification, f, indent=2)
        
        logger.info(f"Risk notification logged to {filepath}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to log risk notification: {e}")
        return False

def log_trade_notification(
    action: str,
    symbol: str,
    side: str,
    quantity: Union[float, str],
    price: Optional[Union[float, str]] = None,
    trade_id: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log a trade notification to a local file
    
    Args:
        action: The trade action (e.g., 'ORDER_CREATED', 'TRADE_EXECUTED')
        symbol: Trading pair symbol
        side: Order side (BUY/SELL)
        quantity: Order quantity
        price: Optional price for the trade
        trade_id: Trade ID (if available)
        details: Additional details about the trade
        
    Returns:
        bool: True if notification was logged, False otherwise
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        filename = f"trade_notification_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{action}.json"
        filepath = os.path.join(NOTIFICATIONS_DIR, filename)
        
        notification = {
            'timestamp': timestamp,
            'action': action,
            'symbol': symbol,
            'side': side,
            'quantity': str(quantity),
            'price': str(price) if price is not None else None,
            'trade_id': trade_id,
            'details': details or {},
            'notification_type': 'trade'
        }
        
        with open(filepath, 'w') as f:
            json.dump(notification, f, indent=2)
        
        logger.info(f"Trade notification logged to {filepath}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to log trade notification: {e}")
        return False

def log_error_notification(
    error_type: str,
    message: str,
    service: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log an error notification to a local file
    
    Args:
        error_type: Type of error
        message: Error message
        service: Service that generated the error
        details: Additional error details
        
    Returns:
        bool: True if notification was logged, False otherwise
    """
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        filename = f"error_notification_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{error_type}.json"
        filepath = os.path.join(NOTIFICATIONS_DIR, filename)
        
        notification = {
            'timestamp': timestamp,
            'error_type': error_type,
            'message': message,
            'service': service,
            'details': details or {},
            'notification_type': 'error'
        }
        
        with open(filepath, 'w') as f:
            json.dump(notification, f, indent=2)
        
        logger.info(f"Error notification logged to {filepath}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to log error notification: {e}")
        return False

def get_recent_notifications(limit: int = 10, notification_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get recent notifications from the log files
    
    Args:
        limit: Maximum number of notifications to return
        notification_type: Optional filter by notification type
        
    Returns:
        List of notification dictionaries, sorted by timestamp (newest first)
    """
    try:
        notifications = []
        
        # List all notification files
        files = [f for f in os.listdir(NOTIFICATIONS_DIR) if f.endswith('.json')]
        
        # Sort by filename (which includes timestamp)
        files.sort(reverse=True)
        
        for filename in files[:limit*2]:  # Get more than needed in case we filter by type
            try:
                filepath = os.path.join(NOTIFICATIONS_DIR, filename)
                with open(filepath, 'r') as f:
                    notification = json.load(f)
                
                # Filter by type if specified
                if notification_type is None or notification.get('notification_type') == notification_type:
                    notifications.append(notification)
                
                # Break if we have enough notifications
                if len(notifications) >= limit:
                    break
            except Exception as e:
                logger.error(f"Error reading notification file {filename}: {e}")
        
        return notifications
    
    except Exception as e:
        logger.error(f"Failed to get recent notifications: {e}")
        return []