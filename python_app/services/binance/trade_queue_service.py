#!/usr/bin/env python3
"""
Binance Trade Queue Service

This module integrates the Trade Execution Queue with the Binance Trading Service.
It provides:
1. A service layer that queues trade requests and executes them through Binance
2. Integration with risk management rules
3. Protection against API overloading using the queue
4. Retry mechanisms for failed trades

Usage:
- Initialize this service with BinanceTradingService
- Use this service for all Binance trading operations
- The queue will handle proper throttling and retry logic
"""

import os
import sys
import time
import logging
import threading
import json
from typing import Dict, List, Any, Optional, Union, Tuple, Callable

# Add current directory to path to ensure imports work correctly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'binance_trade_queue.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('binance_trade_queue')

# Import trade execution queue
from python_app.services.queue.trade_execution_queue import (
    TradeExecutionQueue, TradeRequest, get_trade_execution_queue, TradeStatus
)

# Import risk management (will be implemented by separate system)
try:
    from python_app.services.risk_management import check_risk_limits
except ImportError:
    logger.warning("Risk management module not found - using default implementation")
    
    def check_risk_limits(user_id, symbol, side, quantity, price=None):
        """Default risk management implementation that allows all trades"""
        logger.info(f"Risk check for {user_id} {symbol} {side} {quantity} - ALLOWED (default implementation)")
        return True


class BinanceTradeQueueService:
    """
    Service that integrates Trade Execution Queue with Binance Trading Service
    """
    
    def __init__(self, trading_service):
        """
        Initialize the trade queue service with a Binance trading service
        
        Args:
            trading_service: The BinanceTradingService instance to use for execution
        """
        self.trading_service = trading_service
        self.queue = get_trade_execution_queue()
        
        # Set up the queue callbacks
        self.queue.set_callbacks(
            trading_service_callback=self._execute_trade_callback,
            risk_check_callback=self._check_risk_callback
        )
        
        # Start the queue processor
        self.queue.start()
        logger.info("Binance Trade Queue Service initialized")
    
    def place_order(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: Optional[float] = None,
        user_id: Optional[int] = None,
        position_id: Optional[int] = None,
        strategy_id: Optional[str] = None,
        ml_signal: Optional[Dict[str, Any]] = None,
        meta: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Place a trade order via the queue
        
        Args:
            symbol: Trading pair symbol
            side: Order side (BUY/SELL)
            quantity: Order quantity
            order_type: Order type (MARKET/LIMIT)
            price: Limit price (required for LIMIT orders)
            user_id: User ID for risk management
            position_id: Position ID for tracking
            strategy_id: Strategy identifier
            ml_signal: ML signal data
            meta: Additional metadata
            
        Returns:
            Dictionary with order information and queue ID
        """
        # Create trade request
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
        
        # Add to queue
        trade_id = self.queue.add_trade(trade_request)
        
        logger.info(f"Queued {side} order for {symbol}, quantity: {quantity}, queue ID: {trade_id}")
        
        # Return immediate response with queue info
        return {
            "success": True,
            "message": "Order queued for execution",
            "trade_id": trade_id,
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "order_type": order_type,
            "price": price,
            "queued": True,
            "timestamp": time.time()
        }

    def get_order_status(self, trade_id: str) -> Dict[str, Any]:
        """
        Get the status of a queued order
        
        Args:
            trade_id: The queue ID of the trade
            
        Returns:
            Dictionary with order status information
        """
        return self.queue.get_trade_status(trade_id)

    def cancel_order(self, trade_id: str) -> Dict[str, Any]:
        """
        Attempt to cancel a queued order
        
        Args:
            trade_id: The queue ID of the trade
            
        Returns:
            Dictionary with cancellation result
        """
        result = self.queue.cancel_trade(trade_id)
        
        return {
            "success": result,
            "message": "Order canceled successfully" if result else "Failed to cancel order",
            "trade_id": trade_id
        }

    def get_queue_status(self) -> Dict[str, Any]:
        """
        Get the current status of the trade queue
        
        Returns:
            Dictionary with queue status information
        """
        return self.queue.get_queue_status()

    def _execute_trade_callback(self, trade_request: TradeRequest) -> Dict[str, Any]:
        """
        Callback function for the queue to execute trades
        
        Args:
            trade_request: The trade request to execute
            
        Returns:
            Dictionary with execution result
        """
        logger.info(f"Executing trade from queue: {trade_request.side} {trade_request.quantity} {trade_request.symbol}")
        
        try:
            # Execute the trade using the trading service
            if trade_request.order_type == "MARKET":
                result = self.trading_service.place_market_order(
                    symbol=trade_request.symbol,
                    side=trade_request.side,
                    quantity=trade_request.quantity
                )
            elif trade_request.order_type == "LIMIT":
                if not trade_request.price:
                    return {
                        "success": False,
                        "message": "Price is required for LIMIT orders",
                        "symbol": trade_request.symbol,
                        "side": trade_request.side
                    }
                
                result = self.trading_service.place_limit_order(
                    symbol=trade_request.symbol,
                    side=trade_request.side,
                    quantity=trade_request.quantity,
                    price=trade_request.price
                )
            else:
                return {
                    "success": False,
                    "message": f"Unsupported order type: {trade_request.order_type}",
                    "symbol": trade_request.symbol,
                    "side": trade_request.side
                }
            
            # Add additional information to the result
            result.update({
                "trade_id": trade_request.id,
                "position_id": trade_request.position_id,
                "strategy_id": trade_request.strategy_id,
                "user_id": trade_request.user_id,
                "ml_signal": trade_request.ml_signal
            })
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing trade {trade_request.id}: {str(e)}")
            
            # Return failure result
            return {
                "success": False,
                "message": f"Trading service error: {str(e)}",
                "symbol": trade_request.symbol,
                "side": trade_request.side,
                "trade_id": trade_request.id
            }

    def _check_risk_callback(self, trade_request: TradeRequest) -> bool:
        """
        Callback function for the queue to check risk management rules
        
        Args:
            trade_request: The trade request to check
            
        Returns:
            True if the trade is allowed, False if rejected
        """
        if not trade_request.user_id:
            # No user ID means no risk management
            logger.warning(f"No user ID for trade {trade_request.id}, skipping risk check")
            return True
        
        try:
            # Check risk limits
            result = check_risk_limits(
                user_id=trade_request.user_id,
                symbol=trade_request.symbol,
                side=trade_request.side,
                quantity=trade_request.quantity,
                price=trade_request.price
            )
            
            if not result:
                logger.warning(f"Risk check rejected trade {trade_request.id} for {trade_request.symbol}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in risk check for trade {trade_request.id}: {str(e)}")
            # Default to allowing the trade if risk check fails
            return True


# Singleton instance
_instance = None

def get_binance_trade_queue_service(trading_service=None):
    """
    Get or create the singleton instance of BinanceTradeQueueService
    
    Args:
        trading_service: The BinanceTradingService instance (only needed on first call)
        
    Returns:
        The BinanceTradeQueueService instance
    """
    global _instance
    
    if _instance is None:
        if trading_service is None:
            raise ValueError("trading_service must be provided when creating BinanceTradeQueueService")
        _instance = BinanceTradeQueueService(trading_service)
    
    return _instance


# Testing function
if __name__ == "__main__":
    print("Testing Binance Trade Queue Service")
    
    # Mock trading service for testing
    class MockBinanceTradingService:
        def place_market_order(self, symbol, side, quantity):
            print(f"MOCK: Placing market order {side} {quantity} {symbol}")
            time.sleep(0.5)  # Simulate API delay
            return {
                "success": True,
                "message": "Order executed successfully",
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "order_id": f"mock-market-{int(time.time())}"
            }
        
        def place_limit_order(self, symbol, side, quantity, price):
            print(f"MOCK: Placing limit order {side} {quantity} {symbol} @ {price}")
            time.sleep(0.5)  # Simulate API delay
            return {
                "success": True,
                "message": "Order placed successfully",
                "symbol": symbol,
                "side": side,
                "quantity": quantity,
                "price": price,
                "order_id": f"mock-limit-{int(time.time())}"
            }
    
    # Create service
    mock_trading_service = MockBinanceTradingService()
    service = get_binance_trade_queue_service(mock_trading_service)
    
    # Place a few test orders
    orders = []
    
    # Market order
    market_order = service.place_order(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.01,
        user_id=1,
        strategy_id="test_strategy"
    )
    orders.append(market_order["trade_id"])
    print(f"Placed market order: {market_order}")
    
    # Limit order
    limit_order = service.place_order(
        symbol="ETHUSDT",
        side="SELL",
        quantity=0.1,
        order_type="LIMIT",
        price=3000.0,
        user_id=1,
        strategy_id="test_strategy"
    )
    orders.append(limit_order["trade_id"])
    print(f"Placed limit order: {limit_order}")
    
    # Wait for processing
    print("\nWaiting for trade processing...")
    time.sleep(3)
    
    # Check order statuses
    print("\nOrder Statuses:")
    for order_id in orders:
        status = service.get_order_status(order_id)
        print(f"Order {order_id}: {status.get('status')}")
    
    # Check queue status
    print("\nQueue Status:")
    status = service.get_queue_status()
    print(json.dumps(status, indent=2))
    
    print("\nTest completed!")