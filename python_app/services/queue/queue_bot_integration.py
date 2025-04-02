#!/usr/bin/env python3
"""
Trade Queue Bot Integration

This module integrates the Trade Execution Queue with the Bot Synchronization service
to prevent duplicate orders and bot conflicts.
"""

import os
import sys
import logging
import threading
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'queue_bot_integration.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('queue_bot_integration')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import services
try:
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue, TradeRequest, TradeStatus
    from python_app.services.coordination import bot_synchronizer, LockType
except ImportError:
    logger.error("Failed to import required modules")
    raise

def setup_queue_bot_integration():
    """
    Setup integration between trade queue and bot synchronization
    
    This configures the trade execution queue to check with the bot synchronizer
    before processing trades to prevent conflicts.
    """
    # Get the singleton instances
    queue = TradeExecutionQueue()
    
    # Store original methods to wrap
    original_add_trade = queue.add_trade
    original_execute_trade = queue._execute_trade
    
    def synchronized_add_trade(trade_request: TradeRequest) -> str:
        """
        Wrapped version of add_trade that checks with bot synchronizer
        
        Args:
            trade_request: The trade request to enqueue
            
        Returns:
            The ID of the queued trade request
        """
        # Check for duplicate trades
        if queue.is_duplicate_trade(trade_request):
            logger.warning(
                f"Duplicate trade detected for {trade_request.symbol} {trade_request.side} - "
                f"Request rejected by queue duplicate detection"
            )
            trade_request.status = TradeStatus.CANCELED
            trade_request.error_message = "Duplicate trade rejected"
            return trade_request.id
        
        # Check for concurrent identical orders
        if queue.is_same_order_in_progress(trade_request):
            logger.warning(
                f"Concurrent identical order detected for {trade_request.symbol} {trade_request.side} - "
                f"Request rejected by queue concurrency check"
            )
            trade_request.status = TradeStatus.CANCELED
            trade_request.error_message = "Concurrent identical order rejected"
            return trade_request.id
        
        # Register trade with bot synchronizer
        bot_id = str(trade_request.user_id) if trade_request.user_id else trade_request.strategy_id
        if bot_id:
            # Convert TradeRequest to dictionary for bot synchronizer
            trade_details = {
                "symbol": trade_request.symbol,
                "side": trade_request.side,
                "quantity": trade_request.quantity,
                "price": trade_request.price,
                "order_type": trade_request.order_type,
                "bot_id": bot_id,
                "strategy_id": trade_request.strategy_id,
                "trade_id": trade_request.id,
                "timestamp": datetime.now().isoformat()
            }
            
            # Check with bot synchronizer
            if not bot_synchronizer.register_trade(trade_details):
                logger.warning(
                    f"Trade rejected by bot synchronizer: {trade_request.symbol} {trade_request.side} "
                    f"from bot {bot_id}"
                )
                trade_request.status = TradeStatus.CANCELED
                trade_request.error_message = "Trade rejected by bot synchronizer - conflict with another bot"
                return trade_request.id
        
        # If we get here, the trade is allowed
        return original_add_trade(trade_request)
    
    def synchronized_execute_trade(trade_request: TradeRequest) -> None:
        """
        Wrapped version of _execute_trade that acquires locks before execution
        
        Args:
            trade_request: The trade request to execute
        """
        bot_id = str(trade_request.user_id) if trade_request.user_id else trade_request.strategy_id
        symbol = trade_request.symbol
        
        # Only try to acquire lock if bot_id is provided
        if bot_id and symbol:
            # Try to acquire symbol lock
            if not bot_synchronizer.acquire_lock(LockType.SYMBOL, symbol):
                logger.warning(
                    f"Failed to acquire lock for {symbol} - execution delayed for trade {trade_request.id}"
                )
                # Put back in queue for later execution
                trade_request.status = TradeStatus.PENDING
                queue.queue.put(trade_request)
                return
            
            try:
                # Execute trade with lock held
                original_execute_trade(trade_request)
            finally:
                # Release lock even if execution fails
                bot_synchronizer.release_lock(LockType.SYMBOL, symbol)
        else:
            # Execute without locking if no bot_id or symbol
            original_execute_trade(trade_request)
    
    # Replace methods with synchronized versions
    queue.add_trade = synchronized_add_trade
    queue._execute_trade = synchronized_execute_trade
    
    logger.info("Successfully integrated trade queue with bot synchronization")
    return True

# Run setup when this module is imported
is_integrated = setup_queue_bot_integration()