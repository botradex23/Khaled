#!/usr/bin/env python3
"""
Binance Service Manager

This module is responsible for initializing and connecting all Binance-related services:
1. Market Service for price data
2. Trading Service for order execution
3. Trade Queue Service for managing trading operations

It provides a single point of entry for accessing all Binance services.
"""

import os
import sys
import time
import logging
from typing import Dict, Any, Optional

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
        logging.FileHandler(os.path.join('logs', 'binance_service_manager.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('binance_service_manager')

# Import services
from python_app.services.binance.market_service import BinanceMarketService, get_binance_market_service
from python_app.services.binance.trading_service import BinanceTradingService, get_binance_trading_service
from python_app.services.binance.trade_queue_service import BinanceTradeQueueService, get_binance_trade_queue_service
from python_app.services.risk_management.risk_service import check_risk_limits, get_risk_settings, update_risk_settings

# Singleton instances
_market_service = None
_trading_service = None
_trade_queue_service = None

def initialize_binance_services(
    use_testnet: bool = None,
    paper_mode: bool = True,
    api_key: Optional[str] = None,
    secret_key: Optional[str] = None,
    user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Initialize all Binance-related services
    
    Args:
        use_testnet: Whether to use Binance testnet
        paper_mode: Whether to use paper trading mode
        api_key: Optional direct API key
        secret_key: Optional direct secret key
        user_id: Optional user ID for API key lookup
        
    Returns:
        Dictionary with service instances
    """
    global _market_service, _trading_service, _trade_queue_service
    
    logger.info("Initializing Binance services")
    
    # Initialize market service first
    try:
        _market_service = get_binance_market_service(use_testnet)
        logger.info("Binance Market Service initialized")
    except Exception as e:
        logger.error(f"Error initializing Binance Market Service: {e}")
        raise
    
    # Initialize trading service
    try:
        _trading_service = get_binance_trading_service(
            use_testnet=use_testnet,
            paper_mode=paper_mode,
            api_key=api_key,
            secret_key=secret_key,
            user_id=user_id
        )
        logger.info("Binance Trading Service initialized")
    except Exception as e:
        logger.error(f"Error initializing Binance Trading Service: {e}")
        raise
    
    # Initialize trade queue service and connect it to trading service
    try:
        _trade_queue_service = get_binance_trade_queue_service(_trading_service)
        logger.info("Binance Trade Queue Service initialized and connected to Trading Service")
    except Exception as e:
        logger.error(f"Error initializing Binance Trade Queue Service: {e}")
        raise
    
    return {
        "market_service": _market_service,
        "trading_service": _trading_service,
        "trade_queue_service": _trade_queue_service
    }

def get_market_service() -> BinanceMarketService:
    """Get the Binance Market Service instance"""
    global _market_service
    
    if _market_service is None:
        _market_service = get_binance_market_service()
    
    return _market_service

def get_trading_service() -> BinanceTradingService:
    """Get the Binance Trading Service instance"""
    global _trading_service
    
    if _trading_service is None:
        _trading_service = get_binance_trading_service()
    
    return _trading_service

def get_trade_queue_service() -> BinanceTradeQueueService:
    """Get the Binance Trade Queue Service instance"""
    global _trade_queue_service
    
    if _trade_queue_service is None:
        # Make sure trading service is initialized first
        trading_service = get_trading_service()
        _trade_queue_service = get_binance_trade_queue_service(trading_service)
    
    return _trade_queue_service

def place_order(
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
    Place an order using the trade queue service
    
    This is a convenience function that initializes services if needed
    and places an order through the trade queue
    
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
    # Get trade queue service (initializing if needed)
    queue_service = get_trade_queue_service()
    
    # Place order through queue
    return queue_service.place_order(
        symbol=symbol,
        side=side,
        quantity=quantity,
        order_type=order_type,
        price=price,
        user_id=user_id,
        position_id=position_id,
        strategy_id=strategy_id,
        ml_signal=ml_signal,
        meta=meta
    )

def get_order_status(trade_id: str) -> Dict[str, Any]:
    """
    Get the status of a queued order
    
    Args:
        trade_id: The queue ID of the trade
        
    Returns:
        Dictionary with order status information
    """
    queue_service = get_trade_queue_service()
    return queue_service.get_order_status(trade_id)

def cancel_order(trade_id: str) -> Dict[str, Any]:
    """
    Attempt to cancel a queued order
    
    Args:
        trade_id: The queue ID of the trade
        
    Returns:
        Dictionary with cancellation result
    """
    queue_service = get_trade_queue_service()
    return queue_service.cancel_order(trade_id)

def check_api_connection() -> Dict[str, Any]:
    """
    Check connection to Binance API
    
    Returns:
        Dictionary with connection status information
    """
    market_service = get_market_service()
    
    # The market service doesn't have a direct 'check_connection' method,
    # so we'll perform a basic connection test
    try:
        # Try to get BTC price as a connection test
        price = market_service.get_symbol_price('BTCUSDT')
        
        # Check if we're using fallback data
        using_fallback = hasattr(market_service, 'cached_all_prices') and market_service.cached_all_prices
        
        # Check if there's an error in the response
        connection_error = None
        if isinstance(price, dict) and 'error' in price:
            connection_error = price['error']
        
        # Return the connection status
        return {
            'connected': not connection_error and not using_fallback,
            'using_fallback': using_fallback,
            'error': connection_error,
            'timestamp': int(time.time() * 1000),
            'data_source': 'binance-connector-python',
            'testnet': market_service.use_testnet,
            'message': 'Connected to Binance API' if not connection_error and not using_fallback else 
                      ('Using fallback data' if using_fallback else f'Connection error: {connection_error}')
        }
    except Exception as e:
        # Return error information
        return {
            'connected': False,
            'using_fallback': False,
            'error': str(e),
            'timestamp': int(time.time() * 1000),
            'data_source': 'binance-connector-python',
            'testnet': market_service.use_testnet,
            'message': f'Error checking connection: {str(e)}'
        }

def get_symbol_price(symbol: str) -> Dict[str, Any]:
    """
    Get current price for a symbol
    
    Args:
        symbol: Trading pair symbol
        
    Returns:
        Dictionary with price information
    """
    market_service = get_market_service()
    return market_service.get_symbol_price(symbol)

# Initialize services at module load time if possible
try:
    initialize_binance_services()
except Exception as e:
    logger.warning(f"Could not initialize Binance services at module load: {e}")
    logger.warning("Services will be initialized when first accessed")