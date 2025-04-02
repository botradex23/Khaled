#!/usr/bin/env python3
"""
Trade Execution Queue System

This module implements a robust trade execution queue that:
1. Processes trade requests sequentially to prevent overwhelming exchange APIs
2. Implements rate limiting to stay within exchange API constraints
3. Provides retry mechanisms for failed trade executions
4. Applies risk management rules to each trade before execution

The queue is implemented as a singleton to ensure only one queue instance exists
in the application.
"""

import os
import sys
import time
import logging
import threading
import uuid
import hashlib
import json
from typing import Dict, List, Any, Optional, Union, Tuple, Callable
from datetime import datetime, timedelta
from queue import Queue, Empty
from enum import Enum, auto

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'trade_queue.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('trade_queue')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import new trade logger
try:
    from python_app.utils.trade_logger import (
        log_trade_order, log_trade_execution, log_trade_error,
        update_trade_status
    )
except ImportError:
    try:
        from utils.trade_logger import (
            log_trade_order, log_trade_execution, log_trade_error, 
            update_trade_status
        )
    except ImportError:
        # Try the legacy logger as fallback
        try:
            from python_app.utils.ml_trade_logger import (
                log_trade_execution as ml_log_execution, 
                log_position_update, 
                log_error as ml_log_error
            )
            
            # Create adapter functions to match new logger interface
            def log_trade_order(symbol, side, quantity, order_type, source, **kwargs):
                logger.info(f"ORDER: {side} {quantity} {symbol} (legacy logger)")
                return kwargs.get('trade_id', str(uuid.uuid4()))
            
            def log_trade_execution(trade_id, success, **kwargs):
                symbol = kwargs.get('symbol', 'UNKNOWN')
                price = kwargs.get('executed_price')
                quantity = kwargs.get('executed_quantity', 0)
                position_id = kwargs.get('position_id')
                ml_log_execution(symbol, kwargs.get('side', 'UNKNOWN'), quantity, price, position_id, trade_id)
                return True
            
            def log_trade_error(trade_id, error_type, error_message, **kwargs):
                ml_log_error(error_message, kwargs.get('context'))
                return True
            
            def update_trade_status(trade_id, status, **kwargs):
                logger.info(f"STATUS: {trade_id} -> {status} (legacy logger)")
                return True
                
        except ImportError:
            logger.warning("Could not import any trade logger - using default logging")
            
            # Create stub functions if import fails
            def log_trade_order(symbol, side, quantity, order_type, source, **kwargs):
                logger.info(f"ORDER: {side} {quantity} {symbol} @ {kwargs.get('price', 'MARKET')} (source: {source})")
                return kwargs.get('trade_id', str(uuid.uuid4()))
            
            def log_trade_execution(trade_id, success, **kwargs):
                symbol = kwargs.get('symbol', 'UNKNOWN')
                price = kwargs.get('executed_price')
                quantity = kwargs.get('executed_quantity', 0)
                logger.info(f"EXECUTION: {trade_id} - {'SUCCESS' if success else 'FAILED'} - {quantity} {symbol} @ {price}")
                return True
            
            def log_trade_error(trade_id, error_type, error_message, **kwargs):
                logger.error(f"ERROR: {trade_id} - {error_type} - {error_message} - {kwargs.get('context', '')}")
                return True
            
            def update_trade_status(trade_id, status, **kwargs):
                logger.info(f"STATUS: {trade_id} -> {status}")
                return True


# Trade status enum
class TradeStatus(Enum):
    PENDING = auto()
    PROCESSING = auto()
    EXECUTED = auto()
    FAILED = auto()
    CANCELED = auto()
    RATE_LIMITED = auto()
    RISK_REJECTED = auto()


# Trade request data structure
class TradeRequest:
    def __init__(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        position_id: Optional[int] = None,
        user_id: Optional[int] = None,
        strategy_id: Optional[str] = None,
        ml_signal: Optional[Dict[str, Any]] = None,
        meta: Optional[Dict[str, Any]] = None
    ):
        self.id = str(uuid.uuid4())
        self.symbol = symbol.upper().replace('-', '')  # Standardize format
        self.side = side.upper()
        self.quantity = quantity
        self.order_type = order_type.upper()
        self.price = price
        self.position_id = position_id
        self.user_id = user_id
        self.strategy_id = strategy_id
        self.ml_signal = ml_signal or {}
        self.meta = meta or {}
        self.status = TradeStatus.PENDING
        self.error_message = None
        self.result = None
        self.created_at = datetime.now()
        self.processed_at = None
        self.retries = 0
        self.max_retries = 3

    def to_dict(self) -> Dict[str, Any]:
        """Convert trade request to dictionary for serialization"""
        return {
            "id": self.id,
            "symbol": self.symbol,
            "side": self.side,
            "quantity": self.quantity,
            "order_type": self.order_type,
            "price": self.price,
            "position_id": self.position_id,
            "user_id": self.user_id,
            "strategy_id": self.strategy_id,
            "status": self.status.name,
            "error_message": self.error_message,
            "result": self.result,
            "created_at": self.created_at.isoformat(),
            "processed_at": self.processed_at.isoformat() if self.processed_at else None,
            "retries": self.retries,
            "ml_signal": self.ml_signal,
            "meta": self.meta
        }


class TradeExecutionQueue:
    """
    Singleton trade execution queue that processes trades sequentially
    with rate limiting and retry mechanisms
    """
    _instance = None
    _lock = threading.RLock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(TradeExecutionQueue, cls).__new__(cls)
            return cls._instance

    def __init__(self):
        if not hasattr(self, 'initialized'):
            self.queue = Queue()
            self.processing_thread = None
            self.is_processing = False
            self.rate_limit_window = 1.0  # seconds
            self.rate_limit_max_requests = 10  # max requests per window
            self.request_timestamps = []
            self.executed_trades = {}
            self.risk_check_callback = None
            self.trading_service_callback = None
            self.initialized = True
            self.stopping = False
            self.history = []  # Store history of processed trades
            self.max_history_size = 1000
            logger.info("Trade Execution Queue initialized")

    def set_callbacks(
        self,
        trading_service_callback: Callable[[TradeRequest], Dict[str, Any]],
        risk_check_callback: Optional[Callable[[TradeRequest], bool]] = None
    ) -> None:
        """
        Set callback functions for trade execution and risk checking
        
        Args:
            trading_service_callback: Function to call for executing trades
            risk_check_callback: Optional function to validate trades against risk rules
        """
        self.trading_service_callback = trading_service_callback
        self.risk_check_callback = risk_check_callback
        logger.info("Trade execution queue callbacks configured")

    def start(self) -> None:
        """Start the trade execution queue processor thread"""
        if self.is_processing:
            logger.warning("Trade queue processor already running")
            return
        
        self.is_processing = True
        self.stopping = False
        self.processing_thread = threading.Thread(
            target=self._process_queue,
            daemon=True,
            name="TradeQueueProcessor"
        )
        self.processing_thread.start()
        logger.info("Trade execution queue processor started")

    def stop(self) -> None:
        """Stop the trade execution queue processor thread"""
        self.stopping = True
        self.is_processing = False
        if self.processing_thread and self.processing_thread.is_alive():
            self.processing_thread.join(timeout=5.0)
        logger.info("Trade execution queue processor stopped")

    def add_trade(self, trade_request: TradeRequest) -> str:
        """
        Add a trade request to the execution queue
        
        Args:
            trade_request: The trade request to enqueue
            
        Returns:
            The ID of the queued trade request
        """
        if not self.is_processing:
            self.start()
        
        # Add to queue
        self.queue.put(trade_request)
        
        logger.info(f"Trade request for {trade_request.symbol} {trade_request.side} queued with ID {trade_request.id}")
        return trade_request.id
        
    def add_trade_safe(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Safely add a trade to the queue with duplicate and concurrency checks
        
        Args:
            trade_data: Dictionary containing trade request data
            
        Returns:
            Dictionary with success status and trade ID or error message
        """
        try:
            # Convert dictionary to TradeRequest object
            trade_request = self._dict_to_trade_request(trade_data)
            
            # Check for duplicate trades
            if self.is_duplicate_trade(trade_request):
                return {
                    "success": False,
                    "message": f"Duplicate trade detected for {trade_request.symbol} {trade_request.side}",
                    "trade_id": trade_request.id,
                    "duplicate_detected": True
                }
            
            # Check for similar orders already in progress
            if self.is_same_order_in_progress(trade_request):
                return {
                    "success": False,
                    "message": f"Similar trade already in progress for {trade_request.symbol} {trade_request.side}",
                    "trade_id": trade_request.id,
                    "concurrent_detected": True
                }
            
            # Add to queue if checks pass
            self.add_trade(trade_request)
            
            return {
                "success": True,
                "message": "Trade added to queue",
                "trade_id": trade_request.id
            }
        except Exception as e:
            logger.error(f"Error adding trade safely: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def add_trade_with_batching(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a trade with batching support for similar in-progress trades
        
        Args:
            trade_data: Dictionary containing trade request data
            
        Returns:
            Dictionary with success status and trade details
        """
        try:
            # Convert dictionary to TradeRequest object
            trade_request = self._dict_to_trade_request(trade_data)
            
            # Get in-progress trades
            in_progress = self.get_in_progress_trades()
            
            # Check for similar trades that could be batched
            for existing_trade in in_progress:
                # Only batch trades for the same symbol and side
                if (existing_trade["symbol"] == trade_request.symbol and
                    existing_trade["side"] == trade_request.side and
                    existing_trade["order_type"] == trade_request.order_type):
                    
                    # Found a trade we can batch with
                    batch_id = f"{existing_trade['id']}-batch"
                    
                    # Update existing trade's metadata to indicate batching
                    existing_id = existing_trade["id"]
                    if existing_id in self.executed_trades:
                        # Add batching info to metadata
                        if "batched_trades" not in self.executed_trades[existing_id].meta:
                            self.executed_trades[existing_id].meta["batched_trades"] = []
                        
                        self.executed_trades[existing_id].meta["batched_trades"].append({
                            "trade_id": trade_request.id,
                            "symbol": trade_request.symbol,
                            "side": trade_request.side,
                            "quantity": trade_request.quantity,
                            "added_at": datetime.now().isoformat()
                        })
                        
                        # Adjust quantity if needed
                        if trade_request.order_type == "MARKET":
                            # For market orders, we can combine quantities
                            self.executed_trades[existing_id].quantity += trade_request.quantity
                            
                            logger.info(
                                f"Batched trade {trade_request.id} with existing trade {existing_id}, "
                                f"new quantity: {self.executed_trades[existing_id].quantity}"
                            )
                    
                    return {
                        "success": True,
                        "message": "Trade batched with existing order",
                        "trade_id": trade_request.id,
                        "batched": True,
                        "batch_id": batch_id,
                        "combined_with": existing_id
                    }
            
            # If no matching trade found, add normally
            self.add_trade(trade_request)
            
            return {
                "success": True,
                "message": "Trade added to queue",
                "trade_id": trade_request.id,
                "batched": False
            }
        except Exception as e:
            logger.error(f"Error adding trade with batching: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def add_trade_idempotent(self, trade_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Add a trade with idempotency support
        
        Args:
            trade_data: Dictionary containing trade request data including trade_id
            
        Returns:
            Dictionary with success status and trade details
        """
        try:
            # Check if trade ID is provided
            if "trade_id" not in trade_data or not trade_data["trade_id"]:
                return {
                    "success": False,
                    "message": "Missing trade_id for idempotent operation"
                }
            
            trade_id = trade_data["trade_id"]
            
            # Check if this trade already exists
            existing_trade = self.get_trade_by_id(trade_id)
            if existing_trade:
                # Return the existing trade info
                return {
                    "success": True,
                    "message": "Trade already exists",
                    "idempotent_match": True,
                    "trade_id": trade_id,
                    "status": existing_trade.get("status"),
                    "order_id": existing_trade.get("order_id")
                }
            
            # Convert dictionary to TradeRequest object with the specified ID
            trade_request = self._dict_to_trade_request(trade_data)
            trade_request.id = trade_id
            
            # Add to queue
            self.add_trade(trade_request)
            
            return {
                "success": True,
                "message": "Trade added to queue",
                "trade_id": trade_id,
                "idempotent_match": False
            }
        except Exception as e:
            logger.error(f"Error adding trade idempotently: {str(e)}")
            return {
                "success": False,
                "message": f"Error: {str(e)}"
            }
    
    def get_trade_by_id(self, trade_id: str) -> Optional[Dict[str, Any]]:
        """
        Get a trade by its ID
        
        Args:
            trade_id: The ID of the trade to retrieve
            
        Returns:
            Trade data as a dictionary, or None if not found
        """
        # Check active trades
        if trade_id in self.executed_trades:
            return self.executed_trades[trade_id].to_dict()
        
        # Check history
        for trade in self.history:
            if trade.id == trade_id:
                return trade.to_dict()
        
        return None
        
    def _dict_to_trade_request(self, trade_data: Dict[str, Any]) -> TradeRequest:
        """
        Convert a dictionary to a TradeRequest object
        
        Args:
            trade_data: Dictionary with trade data
            
        Returns:
            TradeRequest object
        """
        # Extract required fields
        symbol = trade_data["symbol"]
        side = trade_data["side"]
        quantity = float(trade_data["quantity"])
        
        # Extract optional fields
        order_type = trade_data.get("type", "MARKET")
        price = float(trade_data["price"]) if "price" in trade_data and trade_data["price"] is not None else None
        position_id = int(trade_data["position_id"]) if "position_id" in trade_data and trade_data["position_id"] is not None else None
        user_id = int(trade_data["user_id"]) if "user_id" in trade_data and trade_data["user_id"] is not None else None
        strategy_id = trade_data.get("strategy_id")
        ml_signal = trade_data.get("ml_signal", {})
        meta = trade_data.get("meta", {})
        
        # Create TradeRequest object
        trade_request = TradeRequest(
            symbol=symbol,
            side=side,
            quantity=quantity,
            order_type=order_type,
            price=price,
            position_id=position_id,
            user_id=user_id,
            strategy_id=strategy_id,
            ml_signal=ml_signal,
            meta=meta
        )
        
        # Set ID if provided
        if "trade_id" in trade_data and trade_data["trade_id"]:
            trade_request.id = trade_data["trade_id"]
            
        return trade_request

    def get_trade_status(self, trade_id: str) -> Dict[str, Any]:
        """
        Get status information for a specific trade
        
        Args:
            trade_id: The ID of the trade request
            
        Returns:
            Dictionary with trade status information
        """
        # Check active queue
        if trade_id in self.executed_trades:
            return self.executed_trades[trade_id].to_dict()
        
        # Check history
        for trade in self.history:
            if trade.id == trade_id:
                return trade.to_dict()
        
        return {
            "id": trade_id,
            "status": "NOT_FOUND", 
            "message": "Trade request not found"
        }

    def get_queue_status(self) -> Dict[str, Any]:
        """
        Get status information about the trade execution queue
        
        Returns:
            Dictionary with queue status information
        """
        return {
            "queue_size": self.queue.qsize(),
            "is_processing": self.is_processing,
            "recent_trades": len(self.executed_trades),
            "history_size": len(self.history)
        }

    def cancel_trade(self, trade_id: str) -> bool:
        """
        Cancel a pending trade if it hasn't been processed yet
        
        Args:
            trade_id: The ID of the trade request to cancel
            
        Returns:
            True if successfully canceled, False otherwise
        """
        # Can't modify queue directly, so we'll mark the trade as CANCELED if we find it later
        if trade_id in self.executed_trades:
            trade = self.executed_trades[trade_id]
            if trade.status == TradeStatus.PENDING:
                trade.status = TradeStatus.CANCELED
                logger.info(f"Trade {trade_id} for {trade.symbol} marked as canceled")
                return True
        
        logger.warning(f"Unable to cancel trade {trade_id}: not found or already processing")
        return False

    def _check_rate_limit(self) -> bool:
        """
        Check if we're within API rate limits
        
        Returns:
            True if we can proceed, False if we should wait
        """
        now = time.time()
        
        # Remove timestamps outside the current window
        self.request_timestamps = [ts for ts in self.request_timestamps 
                                  if now - ts <= self.rate_limit_window]
        
        # Check if we've hit the limit
        if len(self.request_timestamps) >= self.rate_limit_max_requests:
            wait_time = self.rate_limit_window - (now - min(self.request_timestamps))
            logger.warning(f"Rate limit reached, need to wait {wait_time:.2f} seconds")
            return False
        
        return True
        
    def is_duplicate_trade(self, trade_request: TradeRequest) -> bool:
        """
        Check if a trade request is a duplicate of a recently executed trade
        
        Args:
            trade_request: The trade request to check
            
        Returns:
            True if the trade is a duplicate, False otherwise
        """
        # Generate a hash of the trade's key properties to check for functional duplicates
        trade_hash = self._generate_trade_hash(trade_request)
        
        # Check executed trades
        for trade_id, trade in self.executed_trades.items():
            # Skip if it's the same trade ID
            if trade_id == trade_request.id:
                continue
                
            # Only check trades from the last hour
            if (datetime.now() - trade.created_at) > timedelta(hours=1):
                continue
                
            # Check if properties match (same symbol, side, quantity, etc.)
            if self._generate_trade_hash(trade) == trade_hash:
                logger.warning(
                    f"Duplicate trade detected: {trade_request.symbol} {trade_request.side} {trade_request.quantity} - "
                    f"matches existing trade {trade_id} with status {trade.status.name}"
                )
                return True
                
        # Check history
        recent_history = self.history[-50:] if len(self.history) > 50 else self.history
        for trade in recent_history:
            # Skip if it's the same trade ID
            if trade.id == trade_request.id:
                continue
                
            # Only check trades from the last hour
            if (datetime.now() - trade.created_at) > timedelta(hours=1):
                continue
                
            # Check if properties match
            if self._generate_trade_hash(trade) == trade_hash:
                logger.warning(
                    f"Duplicate trade detected: {trade_request.symbol} {trade_request.side} {trade_request.quantity} - "
                    f"matches historical trade {trade.id} with status {trade.status.name}"
                )
                return True
                
        return False
    
    def _generate_trade_hash(self, trade: TradeRequest) -> str:
        """
        Generate a hash string that represents the functional identity of a trade
        
        Args:
            trade: The trade to generate a hash for
            
        Returns:
            A hash string representing the trade's core properties
        """
        # Extract key fields that define a unique trade
        key_fields = {
            "symbol": trade.symbol,
            "side": trade.side,
            "quantity": str(trade.quantity),  # Convert to string for consistent hashing
            "order_type": trade.order_type,
            "price": str(trade.price) if trade.price is not None else "MARKET",
            "user_id": str(trade.user_id) if trade.user_id is not None else "NONE",
            "strategy_id": str(trade.strategy_id) if trade.strategy_id is not None else "NONE"
        }
        
        # Create a JSON string to hash
        json_str = json.dumps(key_fields, sort_keys=True)
        
        # Generate hash
        return hashlib.md5(json_str.encode()).hexdigest()
    
    def is_same_order_in_progress(self, trade_request: TradeRequest) -> bool:
        """
        Check if an identical order is already being processed
        
        Args:
            trade_request: Trade request to check
            
        Returns:
            True if an identical order is in progress, False otherwise
        """
        # Look for in-progress trades with same symbol, side, and similar quantity
        for trade_id, trade in self.executed_trades.items():
            # Only check active trades (PENDING, PROCESSING)
            if trade.status not in [TradeStatus.PENDING, TradeStatus.PROCESSING]:
                continue
                
            # Check if basic properties match
            if (trade.symbol == trade_request.symbol and 
                trade.side == trade_request.side and
                trade.order_type == trade_request.order_type):
                
                # For market orders, check if quantities are similar (within 5%)
                quantity_diff_pct = abs(trade.quantity - trade_request.quantity) / trade.quantity
                if quantity_diff_pct < 0.05:  # 5% tolerance
                    logger.warning(
                        f"Similar trade already in progress: {trade_request.symbol} {trade_request.side} {trade_request.quantity} - "
                        f"matches in-progress trade {trade_id} with {trade.quantity} units"
                    )
                    return True
                    
                # For limit orders, check price as well
                if (trade_request.order_type in ["LIMIT", "STOP_LOSS_LIMIT", "TAKE_PROFIT_LIMIT"] and
                    trade_request.price is not None and trade.price is not None):
                    price_diff_pct = abs(trade.price - trade_request.price) / trade.price
                    if price_diff_pct < 0.01:  # 1% price tolerance
                        logger.warning(
                            f"Similar limit order already in progress: {trade_request.symbol} {trade_request.side} "
                            f"{trade_request.quantity} @ {trade_request.price} - matches in-progress trade {trade_id}"
                        )
                        return True
                        
        return False
    
    def get_in_progress_trades(self) -> List[Dict[str, Any]]:
        """
        Get a list of all trades currently in progress (PENDING or PROCESSING)
        
        Returns:
            List of in-progress trades as dictionaries
        """
        result = []
        
        # Add trades from execution map that are in progress
        for trade_id, trade in self.executed_trades.items():
            if trade.status in [TradeStatus.PENDING, TradeStatus.PROCESSING]:
                result.append(trade.to_dict())
                
        return result

    def _process_queue(self) -> None:
        """Main queue processing thread function"""
        logger.info("Trade queue processor thread started")
        
        while self.is_processing and not self.stopping:
            try:
                # Try to get a trade request with a timeout
                try:
                    trade_request = self.queue.get(timeout=1.0)
                except Empty:
                    # No trades to process, check if we should exit
                    continue
                
                # Check if this trade was canceled while waiting in the queue
                if trade_request.status == TradeStatus.CANCELED:
                    logger.info(f"Skipping canceled trade {trade_request.id}")
                    self.queue.task_done()
                    continue
                
                # Check rate limit
                if not self._check_rate_limit():
                    # Put the request back and wait
                    trade_request.status = TradeStatus.RATE_LIMITED
                    self.queue.put(trade_request)
                    self.queue.task_done()
                    time.sleep(0.5)  # Wait a bit before retrying
                    continue
                
                # Record request for rate limiting
                self.request_timestamps.append(time.time())
                
                # Process the trade
                self._execute_trade(trade_request)
                
                # Mark task as done
                self.queue.task_done()
                
            except Exception as e:
                logger.error(f"Error in trade queue processor: {str(e)}")
                time.sleep(1.0)  # Wait a bit to avoid spinning on errors
                
        logger.info("Trade queue processor thread stopped")

    def _execute_trade(self, trade_request: TradeRequest) -> None:
        """
        Execute a single trade request
        
        Args:
            trade_request: The trade request to execute
        """
        trade_request.status = TradeStatus.PROCESSING
        self.executed_trades[trade_request.id] = trade_request
        
        # Log start of processing
        logger.info(f"Processing trade {trade_request.id}: {trade_request.side} {trade_request.quantity} {trade_request.symbol}")
        
        # Log order creation in the centralized trade logger
        try:
            # Create an order log entry when we start processing
            source = trade_request.meta.get('source', 'TRADE_QUEUE')
            if 'source' not in trade_request.meta:
                trade_request.meta['source'] = source
            
            # Log the order with the centralized trade logger
            log_trade_order(
                symbol=trade_request.symbol,
                side=trade_request.side,
                quantity=trade_request.quantity,
                order_type=trade_request.order_type,
                source=source,
                price=trade_request.price,
                user_id=str(trade_request.user_id) if trade_request.user_id else None,
                strategy_id=trade_request.strategy_id,
                trade_id=trade_request.id,
                metadata=trade_request.meta
            )
            
            # Update order status to PROCESSING
            update_trade_status(trade_request.id, "PROCESSING")
        except Exception as e:
            logger.warning(f"Failed to log trade order creation: {e}")
        
        try:
            # Check risk management rules if callback provided
            if self.risk_check_callback:
                if not self.risk_check_callback(trade_request):
                    # Trade rejected by risk management
                    trade_request.status = TradeStatus.RISK_REJECTED
                    trade_request.error_message = "Trade rejected by risk management rules"
                    logger.warning(f"Trade {trade_request.id} rejected by risk management")
                    
                    # Log rejection in centralized trade logger
                    try:
                        log_trade_error(
                            trade_id=trade_request.id,
                            error_type="RISK_REJECTED",
                            error_message="Trade rejected by risk management rules",
                            context={
                                "symbol": trade_request.symbol,
                                "side": trade_request.side,
                                "quantity": trade_request.quantity
                            }
                        )
                    except Exception as e:
                        logger.error(f"Failed to log trade error: {e}")
                    
                    # Update order status to REJECTED
                    update_trade_status(trade_request.id, "REJECTED", {
                        "rejection_reason": "RISK_MANAGEMENT"
                    })
                    return
            
            # Execute the trade through the trading service
            if not self.trading_service_callback:
                raise ValueError("Trading service callback not set")
            
            # Mark processing time
            trade_request.processed_at = datetime.now()
            
            # Execute trade
            result = self.trading_service_callback(trade_request)
            
            # Process result
            if result.get('success', False):
                trade_request.status = TradeStatus.EXECUTED
                trade_request.result = result
                logger.info(f"Trade {trade_request.id} executed successfully: {trade_request.symbol} {trade_request.side}")
                
                # Get execution details
                executed_price = result.get('price')
                executed_quantity = result.get('quantity', trade_request.quantity)
                is_paper_trade = result.get('is_paper_trade', False)
                order_id = result.get('order_id')
                
                # Log execution in centralized trade logger
                log_trade_execution(
                    trade_id=trade_request.id, 
                    success=True,
                    executed_price=executed_price,
                    executed_quantity=executed_quantity,
                    order_id=order_id,
                    is_paper_trade=is_paper_trade,
                    execution_data=result
                )
                
                # Update order status to EXECUTED
                update_trade_status(trade_request.id, "EXECUTED", {
                    "execution_time": datetime.now().isoformat(),
                    "is_paper_trade": is_paper_trade
                })
            else:
                if trade_request.retries < trade_request.max_retries and "rate limit" in str(result.get('message', '')).lower():
                    # Rate limit hit, requeue after incrementing retry count
                    trade_request.retries += 1
                    trade_request.status = TradeStatus.PENDING
                    logger.warning(f"Trade {trade_request.id} hit rate limit, requeueing (retry {trade_request.retries}/{trade_request.max_retries})")
                    
                    # Update order status to indicate rate limiting
                    update_trade_status(trade_request.id, "RATE_LIMITED", {
                        "retry_count": trade_request.retries,
                        "max_retries": trade_request.max_retries
                    })
                    
                    self.queue.put(trade_request)
                    return
                else:
                    # Other failure
                    trade_request.status = TradeStatus.FAILED
                    trade_request.error_message = result.get('message', 'Unknown error')
                    trade_request.result = result
                    logger.error(f"Trade {trade_request.id} failed: {trade_request.error_message}")
                    
                    # Log execution failure in centralized trade logger
                    log_trade_execution(
                        trade_id=trade_request.id,
                        success=False,
                        error_message=trade_request.error_message,
                        execution_data=result
                    )
                    
                    # Update order status to FAILED
                    update_trade_status(trade_request.id, "FAILED", {
                        "error_message": trade_request.error_message,
                        "failure_time": datetime.now().isoformat()
                    })
            
        except Exception as e:
            trade_request.status = TradeStatus.FAILED
            trade_request.error_message = str(e)
            logger.error(f"Error executing trade {trade_request.id}: {str(e)}")
            
            # Log error in centralized trade logger
            log_trade_error(
                trade_id=trade_request.id,
                error_type="EXECUTION_ERROR",
                error_message=str(e),
                context={
                    "symbol": trade_request.symbol,
                    "side": trade_request.side,
                    "quantity": trade_request.quantity
                }
            )
            
            # Update order status to FAILED
            update_trade_status(trade_request.id, "FAILED", {
                "error_message": str(e),
                "failure_time": datetime.now().isoformat()
            })
        
        finally:
            # Move to history if completed
            if trade_request.status in [TradeStatus.EXECUTED, TradeStatus.FAILED, TradeStatus.CANCELED, TradeStatus.RISK_REJECTED]:
                # Add to history
                self.history.append(trade_request)
                # Limit history size
                if len(self.history) > self.max_history_size:
                    self.history = self.history[-self.max_history_size:]
                # Remove from active trades
                if trade_request.id in self.executed_trades:
                    del self.executed_trades[trade_request.id]


# Create a singleton instance
trade_execution_queue = TradeExecutionQueue()

# Helper function to get or create the queue
def get_trade_execution_queue() -> TradeExecutionQueue:
    """Get the singleton trade execution queue instance"""
    return trade_execution_queue

# Testing
if __name__ == "__main__":
    print("Testing Trade Execution Queue")
    
    # Mock trading service callback
    def mock_trading_service(trade_request):
        print(f"MOCK: Executing trade {trade_request.id}: {trade_request.side} {trade_request.quantity} {trade_request.symbol}")
        time.sleep(0.5)  # Simulate API call delay
        return {
            "success": True,
            "message": "Trade executed successfully",
            "order_id": f"mock-{uuid.uuid4()}",
            "symbol": trade_request.symbol,
            "side": trade_request.side,
            "quantity": trade_request.quantity,
            "price": trade_request.price or 50000.0,  # Mock price
            "executed": True
        }
    
    # Mock risk management check
    def mock_risk_check(trade_request):
        # Reject trades for "RISKYSYMBOL"
        if trade_request.symbol == "RISKYSYMBOL":
            return False
        # Otherwise approve
        return True
    
    # Set up the queue
    queue = get_trade_execution_queue()
    queue.set_callbacks(
        trading_service_callback=mock_trading_service,
        risk_check_callback=mock_risk_check
    )
    queue.start()
    
    # Create and queue some test trades
    trades = []
    symbols = ["BTCUSDT", "ETHUSDT", "RISKYSYMBOL", "SOLUSDT"]
    sides = ["BUY", "SELL"]
    
    for i in range(5):
        symbol = symbols[i % len(symbols)]
        side = sides[i % len(sides)]
        trade = TradeRequest(
            symbol=symbol,
            side=side,
            quantity=0.01,
            price=None,
            user_id=1,
            strategy_id="test_strategy",
            ml_signal={"confidence": 0.85, "signal": side}
        )
        trade_id = queue.add_trade(trade)
        trades.append(trade_id)
        print(f"Added trade {trade_id}: {side} {symbol}")
    
    # Wait for processing to complete
    time.sleep(5)
    
    # Check statuses
    print("\nTrade Statuses:")
    for trade_id in trades:
        status = queue.get_trade_status(trade_id)
        print(f"Trade {trade_id}: {status['status']}")
    
    # Check queue status
    print("\nQueue Status:")
    status = queue.get_queue_status()
    print(status)
    
    # Stop the queue
    queue.stop()
    print("Test completed!")