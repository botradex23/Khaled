#!/usr/bin/env python3
"""
Telegram Notification Service

This module provides a Telegram notification service for sending trade alerts.
It supports notifying admins about various trade events, with future support for
per-user notifications.

The service is designed to be modular and reusable across all trade-related components.
"""

import os
import sys
import json
import logging
import asyncio
import threading
from enum import Enum
from typing import Dict, Any, Optional, Union, List, Tuple
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'telegram_notifier.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('telegram_notifier')

# Add the parent directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import config with error handling
try:
    from python_app.config import active_config
except ImportError:
    try:
        from config import active_config
    except ImportError:
        logger.error("Could not import config - using default configuration")
        
        # Create placeholder config
        class Config:
            TELEGRAM_ENABLED = False
            TELEGRAM_BOT_TOKEN = ''
            TELEGRAM_ADMIN_CHAT_ID = ''
        
        active_config = Config()

# Import telegram library with error handling
try:
    from telegram import Bot
    from telegram.constants import ParseMode
    from telegram.error import TelegramError
    TELEGRAM_AVAILABLE = True
except ImportError:
    logger.warning("Telegram library not available - notifications will be disabled")
    TELEGRAM_AVAILABLE = False


class AlertType(Enum):
    """Types of alerts that can be sent"""
    AI_SIGNAL = "AI_SIGNAL"
    ORDER_CREATED = "ORDER_CREATED"
    TRADE_EXECUTED = "TRADE_EXECUTED"
    TRADE_ERROR = "TRADE_ERROR"
    RISK_MANAGEMENT = "RISK_MANAGEMENT"


class AlertPriority(Enum):
    """Priority levels for alerts"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class TelegramNotifier:
    """
    Service for sending Telegram notifications about trade events
    """
    
    _instance = None
    _lock = threading.Lock()
    _message_queue = []
    _is_sending = False
    _last_sent = {}  # To prevent duplicate messages
    
    @classmethod
    def get_instance(cls) -> 'TelegramNotifier':
        """
        Get the singleton instance of the Telegram notifier
        
        Returns:
            TelegramNotifier: The singleton instance
        """
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize the Telegram notifier"""
        self.logger = logger
        self.enabled = active_config.TELEGRAM_ENABLED and TELEGRAM_AVAILABLE
        self.bot_token = active_config.TELEGRAM_BOT_TOKEN
        self.admin_chat_id = active_config.TELEGRAM_ADMIN_CHAT_ID
        
        if self.enabled:
            try:
                self.bot = Bot(token=self.bot_token)
                self.logger.info("Telegram bot initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize Telegram bot: {e}")
                self.enabled = False
                self.bot = None
        else:
            self.bot = None
            if not active_config.TELEGRAM_ENABLED:
                self.logger.warning("Telegram notifications disabled in configuration")
            elif not TELEGRAM_AVAILABLE:
                self.logger.warning("Telegram library not available")
    
    def _format_message(self, alert_type: AlertType, data: Dict[str, Any]) -> str:
        """
        Format a message based on the alert type and data
        
        Args:
            alert_type: Type of alert
            data: Dictionary with alert data
            
        Returns:
            str: Formatted message in Markdown format
        """
        timestamp = datetime.now().strftime("%H:%M:%S UTC")
        
        if alert_type == AlertType.AI_SIGNAL:
            symbol = data.get('symbol', 'UNKNOWN')
            side = data.get('side', 'UNKNOWN')
            confidence = data.get('confidence', 0)
            price = data.get('price')
            source = data.get('source', 'UNKNOWN')
            signal_id = data.get('signal_id', 'UNKNOWN')
            
            price_str = f"${price:,.2f}" if price else "Market Price"
            emoji = "🟢" if side == "BUY" else "🔴" if side == "SELL" else "⚪"
            
            message = f"{emoji} *New AI Signal*\n\n"
            message += f"*Symbol:* {symbol}\n"
            message += f"*Action:* {side}\n"
            message += f"*Price:* {price_str}\n"
            message += f"*Confidence:* {confidence:.0%}\n"
            message += f"*Source:* {source}\n"
            message += f"*ID:* {signal_id}\n"
            message += f"*Time:* {timestamp}"
        
        elif alert_type == AlertType.ORDER_CREATED:
            symbol = data.get('symbol', 'UNKNOWN')
            side = data.get('side', 'UNKNOWN')
            quantity = data.get('quantity', 0)
            price = data.get('price')
            order_type = data.get('order_type', 'UNKNOWN')
            trade_id = data.get('trade_id', 'UNKNOWN')
            source = data.get('source', 'UNKNOWN')
            
            price_str = f"${price:,.2f}" if price else "Market Price"
            emoji = "📝" if side == "BUY" else "📝" if side == "SELL" else "📝"
            
            message = f"{emoji} *Order Created*\n\n"
            message += f"*Symbol:* {symbol}\n"
            message += f"*Side:* {side}\n"
            message += f"*Quantity:* {quantity}\n"
            message += f"*Price:* {price_str}\n"
            message += f"*Type:* {order_type}\n"
            message += f"*Source:* {source}\n"
            message += f"*Trade ID:* {trade_id}\n"
            message += f"*Time:* {timestamp}"
        
        elif alert_type == AlertType.TRADE_EXECUTED:
            symbol = data.get('symbol', 'UNKNOWN')
            side = data.get('side', 'UNKNOWN')
            quantity = data.get('executed_quantity', data.get('quantity', 0))
            price = data.get('executed_price', data.get('price', 0))
            trade_id = data.get('trade_id', 'UNKNOWN')
            order_id = data.get('order_id', 'UNKNOWN')
            confidence = data.get('confidence')
            
            price_str = f"${price:,.2f}" if price else "Unknown Price"
            confidence_str = f"{confidence:.0%}" if confidence else "N/A"
            emoji = "✅" if side == "BUY" else "✅" if side == "SELL" else "✅"
            
            message = f"{emoji} *Trade Executed*\n\n"
            message += f"*Symbol:* {symbol}\n"
            message += f"*Side:* {side}\n"
            message += f"*Quantity:* {quantity}\n"
            message += f"*Price:* {price_str}\n"
            message += f"*Confidence:* {confidence_str}\n"
            message += f"*Trade ID:* {trade_id}\n"
            message += f"*Order ID:* {order_id}\n"
            message += f"*Time:* {timestamp}"
        
        elif alert_type == AlertType.TRADE_ERROR:
            symbol = data.get('symbol', 'UNKNOWN')
            operation = data.get('operation', 'trade operation')
            error_type = data.get('error_type', 'Unknown Error')
            error_message = data.get('error_message', 'No details available')
            trade_id = data.get('trade_id', 'UNKNOWN')
            
            emoji = "❌"
            
            message = f"{emoji} *Trade Error*\n\n"
            message += f"*Symbol:* {symbol}\n"
            message += f"*Operation:* {operation}\n"
            message += f"*Error Type:* {error_type}\n"
            message += f"*Message:* {error_message}\n"
            message += f"*Trade ID:* {trade_id}\n"
            message += f"*Time:* {timestamp}"
        
        elif alert_type == AlertType.RISK_MANAGEMENT:
            symbol = data.get('symbol', 'UNKNOWN')
            rule = data.get('rule', 'Unknown Rule')
            reason = data.get('reason', 'No details available')
            details = data.get('details', {})
            trade_id = data.get('trade_id', 'UNKNOWN')
            
            emoji = "🛑"
            
            message = f"{emoji} *Risk Management Alert*\n\n"
            message += f"*Symbol:* {symbol}\n"
            message += f"*Rule:* {rule}\n"
            message += f"*Reason:* {reason}\n"
            message += f"*Trade ID:* {trade_id}\n"
            message += f"*Time:* {timestamp}\n\n"
            
            # Add additional details if available
            if details:
                message += "*Details:*\n"
                for key, value in details.items():
                    message += f"• {key}: {value}\n"
        
        else:
            # Generic message format for unknown alert types
            emoji = "ℹ️"
            message = f"{emoji} *Trading Alert*\n\n"
            
            for key, value in data.items():
                if key != 'alert_type' and not key.startswith('_'):
                    message += f"*{key.replace('_', ' ').title()}:* {value}\n"
            
            message += f"*Time:* {timestamp}"
        
        return message
    
    def _get_message_hash(self, alert_type: AlertType, data: Dict[str, Any]) -> str:
        """
        Generate a hash for the message to prevent duplicates
        
        Args:
            alert_type: Type of alert
            data: Dictionary with alert data
            
        Returns:
            str: Message hash
        """
        # Include relevant fields in the hash
        key_fields = ['symbol', 'trade_id', 'signal_id', 'error_message']
        hash_dict = {
            'alert_type': alert_type.value,
            'timestamp': datetime.now().strftime("%Y-%m-%d %H:%M")  # Minute precision
        }
        
        for field in key_fields:
            if field in data:
                hash_dict[field] = data[field]
        
        return json.dumps(hash_dict, sort_keys=True)
    
    def _should_send_message(self, alert_type: AlertType, data: Dict[str, Any]) -> bool:
        """
        Determine if a message should be sent (prevents duplicates)
        
        Args:
            alert_type: Type of alert
            data: Dictionary with alert data
            
        Returns:
            bool: True if the message should be sent, False otherwise
        """
        message_hash = self._get_message_hash(alert_type, data)
        current_time = datetime.now()
        
        # Check if this is a duplicate message within the last 5 minutes
        if message_hash in self._last_sent:
            last_time = self._last_sent[message_hash]
            if (current_time - last_time).total_seconds() < 300:  # 5 minutes
                return False
        
        # Update the last sent time
        self._last_sent[message_hash] = current_time
        
        # Cleanup old entries
        self._last_sent = {k: v for k, v in self._last_sent.items() 
                         if (current_time - v).total_seconds() < 3600}  # 1 hour
        
        return True
    
    async def _send_message_async(self, chat_id: str, message: str) -> bool:
        """
        Send a message via Telegram asynchronously
        
        Args:
            chat_id: Telegram chat ID
            message: Message to send
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled or not self.bot:
            self.logger.warning("Telegram bot is not enabled or not initialized")
            return False
        
        try:
            await self.bot.send_message(
                chat_id=chat_id,
                text=message,
                parse_mode=ParseMode.MARKDOWN
            )
            return True
        except TelegramError as e:
            self.logger.error(f"Failed to send Telegram message: {e}")
            return False
    
    def send_message(self, chat_id: str, message: str) -> bool:
        """
        Send a message via Telegram
        
        Args:
            chat_id: Telegram chat ID
            message: Message to send
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled:
            self.logger.warning("Telegram notifications are disabled")
            return False
        
        try:
            # Create event loop for asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            result = loop.run_until_complete(self._send_message_async(chat_id, message))
            loop.close()
            return result
        except Exception as e:
            self.logger.error(f"Error sending Telegram message: {e}")
            return False
    
    def notify_admin(self, alert_type: AlertType, data: Dict[str, Any], 
                    priority: AlertPriority = AlertPriority.MEDIUM) -> bool:
        """
        Send a notification to the admin
        
        Args:
            alert_type: Type of alert
            data: Dictionary with alert data
            priority: Alert priority
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled or not self.admin_chat_id:
            self.logger.warning("Admin notifications are disabled or admin chat ID not set")
            return False
        
        # Check if this message should be sent (avoid duplicates)
        if not self._should_send_message(alert_type, data):
            self.logger.info(f"Skipping duplicate {alert_type.value} notification")
            return True
        
        message = self._format_message(alert_type, data)
        return self.send_message(self.admin_chat_id, message)
    
    def notify_user(self, user_id: Union[int, str], chat_id: str, 
                   alert_type: AlertType, data: Dict[str, Any],
                   priority: AlertPriority = AlertPriority.MEDIUM) -> bool:
        """
        Send a notification to a specific user
        
        Args:
            user_id: User ID in the system
            chat_id: User's Telegram chat ID
            alert_type: Type of alert
            data: Dictionary with alert data
            priority: Alert priority
            
        Returns:
            bool: True if successful, False otherwise
        """
        if not self.enabled:
            self.logger.warning("User notifications are disabled")
            return False
        
        if not chat_id:
            self.logger.warning(f"No Telegram chat ID for user {user_id}")
            return False
        
        # Check if this message should be sent (avoid duplicates)
        if not self._should_send_message(alert_type, data):
            self.logger.info(f"Skipping duplicate {alert_type.value} notification for user {user_id}")
            return True
        
        message = self._format_message(alert_type, data)
        return self.send_message(chat_id, message)
    
    def notify_signal(self, symbol: str, side: str, source: str, 
                     confidence: Optional[float] = None, price: Optional[float] = None,
                     signal_id: Optional[str] = None, **kwargs) -> bool:
        """
        Send a notification about a new AI signal
        
        Args:
            symbol: Trading pair symbol
            side: Trade side (BUY or SELL)
            source: Signal source (e.g., AI_GRID_BOT)
            confidence: Signal confidence (0-1)
            price: Signal price
            signal_id: Signal ID
            
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'symbol': symbol,
            'side': side,
            'source': source,
            'confidence': confidence,
            'price': price,
            'signal_id': signal_id,
            **kwargs
        }
        return self.notify_admin(AlertType.AI_SIGNAL, data)
    
    def notify_order_created(self, symbol: str, side: str, quantity: float,
                            order_type: str, source: str, trade_id: str, 
                            price: Optional[float] = None, **kwargs) -> bool:
        """
        Send a notification about an order being created
        
        Args:
            symbol: Trading pair symbol
            side: Trade side (BUY or SELL)
            quantity: Order quantity
            order_type: Order type (MARKET, LIMIT, etc.)
            source: Order source (e.g., AI_GRID_BOT)
            trade_id: Trade ID
            price: Order price
            
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'order_type': order_type,
            'source': source,
            'trade_id': trade_id,
            'price': price,
            **kwargs
        }
        return self.notify_admin(AlertType.ORDER_CREATED, data)
    
    def notify_trade_executed(self, symbol: str, side: str, quantity: float,
                             price: float, trade_id: str, order_id: Optional[str] = None,
                             confidence: Optional[float] = None, **kwargs) -> bool:
        """
        Send a notification about a trade being executed
        
        Args:
            symbol: Trading pair symbol
            side: Trade side (BUY or SELL)
            quantity: Executed quantity
            price: Execution price
            trade_id: Trade ID
            order_id: Exchange order ID
            confidence: Signal confidence (if available)
            
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'symbol': symbol,
            'side': side,
            'executed_quantity': quantity,
            'executed_price': price,
            'trade_id': trade_id,
            'order_id': order_id,
            'confidence': confidence,
            **kwargs
        }
        return self.notify_admin(AlertType.TRADE_EXECUTED, data, AlertPriority.HIGH)
    
    def notify_trade_error(self, symbol: str, operation: str, error_type: str,
                          error_message: str, trade_id: Optional[str] = None,
                          **kwargs) -> bool:
        """
        Send a notification about a trade error
        
        Args:
            symbol: Trading pair symbol
            operation: Operation that failed (e.g., ORDER, EXECUTION)
            error_type: Type of error
            error_message: Error message
            trade_id: Trade ID (if available)
            
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'symbol': symbol,
            'operation': operation,
            'error_type': error_type,
            'error_message': error_message,
            'trade_id': trade_id,
            **kwargs
        }
        return self.notify_admin(AlertType.TRADE_ERROR, data, AlertPriority.HIGH)
    
    def notify_risk_management(self, symbol: str, rule: str, reason: str,
                              trade_id: Optional[str] = None, details: Optional[Dict] = None,
                              **kwargs) -> bool:
        """
        Send a notification about a risk management event
        
        Args:
            symbol: Trading pair symbol
            rule: Risk rule that was triggered
            reason: Reason for the event
            trade_id: Trade ID (if available)
            details: Additional details about the event
            
        Returns:
            bool: True if successful, False otherwise
        """
        data = {
            'symbol': symbol,
            'rule': rule,
            'reason': reason,
            'trade_id': trade_id,
            'details': details or {},
            **kwargs
        }
        return self.notify_admin(AlertType.RISK_MANAGEMENT, data, AlertPriority.HIGH)


# Convenience functions to simplify imports
def get_telegram_notifier() -> TelegramNotifier:
    """
    Get the singleton instance of the Telegram notifier
    
    Returns:
        TelegramNotifier: The singleton instance
    """
    return TelegramNotifier.get_instance()


def notify_signal(symbol: str, side: str, source: str, 
                 confidence: Optional[float] = None, price: Optional[float] = None,
                 signal_id: Optional[str] = None, **kwargs) -> bool:
    """
    Send a notification about a new AI signal
    
    Args:
        symbol: Trading pair symbol
        side: Trade side (BUY or SELL)
        source: Signal source (e.g., AI_GRID_BOT)
        confidence: Signal confidence (0-1)
        price: Signal price
        signal_id: Signal ID
        
    Returns:
        bool: True if successful, False otherwise
    """
    notifier = get_telegram_notifier()
    return notifier.notify_signal(symbol, side, source, confidence, price, signal_id, **kwargs)


def notify_order_created(symbol: str, side: str, quantity: float,
                        order_type: str, source: str, trade_id: str, 
                        price: Optional[float] = None, **kwargs) -> bool:
    """
    Send a notification about an order being created
    
    Args:
        symbol: Trading pair symbol
        side: Trade side (BUY or SELL)
        quantity: Order quantity
        order_type: Order type (MARKET, LIMIT, etc.)
        source: Order source (e.g., AI_GRID_BOT)
        trade_id: Trade ID
        price: Order price
        
    Returns:
        bool: True if successful, False otherwise
    """
    notifier = get_telegram_notifier()
    return notifier.notify_order_created(symbol, side, quantity, order_type, source, trade_id, price, **kwargs)


def notify_trade_executed(symbol: str, side: str, quantity: float,
                         price: float, trade_id: str, order_id: Optional[str] = None,
                         confidence: Optional[float] = None, **kwargs) -> bool:
    """
    Send a notification about a trade being executed
    
    Args:
        symbol: Trading pair symbol
        side: Trade side (BUY or SELL)
        quantity: Executed quantity
        price: Execution price
        trade_id: Trade ID
        order_id: Exchange order ID
        confidence: Signal confidence (if available)
        
    Returns:
        bool: True if successful, False otherwise
    """
    notifier = get_telegram_notifier()
    return notifier.notify_trade_executed(symbol, side, quantity, price, trade_id, order_id, confidence, **kwargs)


def notify_trade_error(symbol: str, operation: str, error_type: str,
                      error_message: str, trade_id: Optional[str] = None,
                      **kwargs) -> bool:
    """
    Send a notification about a trade error
    
    Args:
        symbol: Trading pair symbol
        operation: Operation that failed (e.g., ORDER, EXECUTION)
        error_type: Type of error
        error_message: Error message
        trade_id: Trade ID (if available)
        
    Returns:
        bool: True if successful, False otherwise
    """
    notifier = get_telegram_notifier()
    return notifier.notify_trade_error(symbol, operation, error_type, error_message, trade_id, **kwargs)


def notify_risk_management(symbol: str, rule: str, reason: str,
                          trade_id: Optional[str] = None, details: Optional[Dict] = None,
                          **kwargs) -> bool:
    """
    Send a notification about a risk management event
    
    Args:
        symbol: Trading pair symbol
        rule: Risk rule that was triggered
        reason: Reason for the event
        trade_id: Trade ID (if available)
        details: Additional details about the event
        
    Returns:
        bool: True if successful, False otherwise
    """
    notifier = get_telegram_notifier()
    return notifier.notify_risk_management(symbol, rule, reason, trade_id, details, **kwargs)


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing Telegram Notification Service ===\n")
    
    # Get notifier instance
    notifier = get_telegram_notifier()
    
    print(f"Telegram notifications enabled: {notifier.enabled}")
    if notifier.enabled:
        print(f"Admin chat ID configured: {bool(notifier.admin_chat_id)}")
    
    if notifier.enabled and notifier.admin_chat_id:
        # Test signal notification
        print("\nTesting signal notification...")
        signal_result = notifier.notify_signal(
            symbol="BTCUSDT",
            side="BUY",
            source="AI_GRID_BOT",
            confidence=0.91,
            price=67100.0,
            signal_id="SIG-12345"
        )
        print(f"Signal notification sent: {signal_result}")
        
        # Test order creation notification
        print("\nTesting order creation notification...")
        order_result = notifier.notify_order_created(
            symbol="BTCUSDT",
            side="BUY",
            quantity=0.001,
            order_type="MARKET",
            source="AI_GRID_BOT",
            trade_id="T-94593",
            price=None
        )
        print(f"Order creation notification sent: {order_result}")
        
        # Test trade execution notification
        print("\nTesting trade execution notification...")
        execution_result = notifier.notify_trade_executed(
            symbol="BTCUSDT",
            side="BUY",
            quantity=0.001,
            price=67100.0,
            trade_id="T-94593",
            order_id="BINANCE123456",
            confidence=0.91
        )
        print(f"Trade execution notification sent: {execution_result}")
        
        # Test error notification
        print("\nTesting error notification...")
        error_result = notifier.notify_trade_error(
            symbol="BTCUSDT",
            operation="EXECUTION",
            error_type="CONNECTION_ERROR",
            error_message="Failed to connect to Binance API",
            trade_id="T-94593"
        )
        print(f"Error notification sent: {error_result}")
        
        # Test risk management notification
        print("\nTesting risk management notification...")
        risk_result = notifier.notify_risk_management(
            symbol="BTCUSDT",
            rule="MAX_POSITIONS",
            reason="Maximum positions limit reached",
            trade_id="T-94593",
            details={
                "current_positions": 10,
                "max_allowed": 10,
                "portfolio_risk": "75%"
            }
        )
        print(f"Risk management notification sent: {risk_result}")
    
    print("\n=== Telegram Notification Test Complete ===")