#!/usr/bin/env python3
"""
Binance Trading Service using the official binance-connector-python SDK

This module is responsible for:
1. Connecting to Binance API using the official Python SDK
2. Executing trades directly with the Binance API
3. Checking existing positions before executing new orders
4. Supporting paper trading mode for safe testing
5. Logging all trade activities

Important: This service uses ONLY the official Binance SDK (binance-connector-python),
not HTTP requests or API wrappers.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple, cast

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'binance_trading.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('binance_trading')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Try to import configuration with different paths to handle various import contexts
try:
    from python_app.config import active_config
except ImportError:
    try:
        from config import active_config
    except ImportError:
        # If all else fails, use relative imports
        import importlib.util
        
        # Dynamically load the config module
        spec = importlib.util.spec_from_file_location(
            "config", 
            os.path.join(parent_dir, "config.py")
        )
        config_module = importlib.util.module_from_spec(spec)
        sys.modules["config"] = config_module
        spec.loader.exec_module(config_module)
        active_config = config_module.active_config

# Import ML trade logger
try:
    from python_app.utils.ml_trade_logger import (
        log_trade_execution, log_position_update, 
        log_position_close, log_error
    )
except ImportError:
    try:
        from utils.ml_trade_logger import (
            log_trade_execution, log_position_update, 
            log_position_close, log_error
        )
    except ImportError:
        logger.warning("Could not import ML trade logger - using default logging")
        
        # Create stub functions if import fails
        def log_trade_execution(symbol, action, quantity, price, position_id, trade_id=None, ml_confidence=None):
            logger.info(f"TRADE: {action} {quantity} {symbol} @ {price} (position: {position_id})")
            
        def log_position_update(symbol, position_id, entry_price, current_price, quantity, direction, unrealized_pnl, unrealized_pnl_pct):
            logger.info(f"POSITION UPDATE: {direction} {quantity} {symbol} (entry: {entry_price}, current: {current_price}, PnL: {unrealized_pnl})")
            
        def log_position_close(symbol, position_id, entry_price, exit_price, quantity, direction, realized_pnl, realized_pnl_pct, holding_period_hours, close_reason):
            logger.info(f"POSITION CLOSE: {direction} {quantity} {symbol} (entry: {entry_price}, exit: {exit_price}, PnL: {realized_pnl}, reason: {close_reason})")
            
        def log_error(symbol, operation, error_message, context=None):
            logger.error(f"ERROR: {symbol} {operation} - {error_message}")

# Using the official Binance connector SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
except ImportError:
    logger.error("Failed to import Binance connector. Please install it with: pip install binance-connector")
    # Create a stub Spot client for cases where the Binance connector is not available
    class Spot:
        def __init__(self, base_url=None, api_key=None, api_secret=None, **kwargs):
            pass
        
        def new_order(self, **params):
            logger.error("Binance connector not available - order not placed")
            return {"error": "Binance connector not available"}
        
        def get_account(self):
            return {"balances": []}
        
        def get_open_orders(self, **params):
            return []
        
    class ClientError(Exception): pass
    class ServerError(Exception): pass


class BinanceTradingService:
    """
    Service for trading cryptocurrencies via the Binance API
    
    This service uses the official Binance connector SDK to execute trades
    without any REST API or Flask endpoint intermediaries
    """
    
    def __init__(self, 
                 use_testnet: bool = None,
                 paper_mode: bool = True,  # Paper trading mode by default for safety
                 max_retries: int = 3,
                 user_id: str = None,      # User ID for API key lookup
                 api_key: str = None,      # Optional direct API key
                 secret_key: str = None):  # Optional direct secret key
        """
        Initialize the Binance Trading Service
        
        Args:
            use_testnet: Whether to use the Binance testnet (default: from active_config.USE_TESTNET)
            paper_mode: Whether to use paper trading mode (default: True)
            max_retries: Maximum number of retry attempts for orders (default: 3)
            user_id: User ID for API key lookup (default: None)
            api_key: Optional direct API key, overrides user_id lookup (default: None)
            secret_key: Optional direct secret key, overrides user_id lookup (default: None)
        """
        # If use_testnet is not specified, use the config value
        if use_testnet is None and active_config:
            use_testnet = active_config.USE_TESTNET
        else:
            use_testnet = use_testnet if use_testnet is not None else False
            
        self.use_testnet = use_testnet
        self.paper_mode = paper_mode
        self.max_retries = max_retries
        self.user_id = user_id
        self.api_key = api_key
        self.secret_key = secret_key
        self.base_url = active_config.BINANCE_TEST_URL if use_testnet else active_config.BINANCE_BASE_URL
        self.client = None  # Will be initialized on first use
        self.open_orders = []  # For tracking paper trade orders
        self.positions = []    # For tracking paper trade positions
        
        mode_str = "TESTNET" if use_testnet else "PRODUCTION"
        trade_type = "PAPER TRADING" if paper_mode else "REAL TRADING"
        logger.info(f"Binance Trading Service initialized in {mode_str} mode with {trade_type}")
    
    def _create_client(self) -> Spot:
        """
        Create a Binance API client using the official binance-connector SDK
        
        Returns:
            Configured Binance Spot client
        """
        # Try to get user-specific keys first
        api_key = self.api_key
        api_secret = self.secret_key
        
        # If direct keys aren't provided, try to get them from the user ID
        if (not api_key or not api_secret) and self.user_id:
            try:
                # Import here to avoid circular imports
                from python_app.services.api_key_service import get_user_api_keys
                user_api_key, user_secret_key = get_user_api_keys(self.user_id)
                
                if user_api_key and user_secret_key:
                    api_key = user_api_key
                    api_secret = user_secret_key
                    logger.info(f"Using API keys for user: {self.user_id}")
            except ImportError:
                logger.warning("Could not import API key service - falling back to default keys")
        
        # If still no keys, fall back to global configuration
        if not api_key or not api_secret:
            api_key = active_config.BINANCE_API_KEY
            api_secret = active_config.BINANCE_SECRET_KEY
            logger.info("Using default API keys from configuration")
        
        # Check if proxy is enabled in configuration
        use_proxy = False
        if hasattr(active_config, 'USE_PROXY'):
            use_proxy = active_config.USE_PROXY
            fallback_to_direct = active_config.FALLBACK_TO_DIRECT if hasattr(active_config, 'FALLBACK_TO_DIRECT') else False
        else:
            use_proxy = False
            fallback_to_direct = True
            
        # Setup proxy configuration if enabled
        proxies = None
        proxy_info = None
        
        if use_proxy:
            # Check if proxy settings are complete
            if (hasattr(active_config, 'PROXY_IP') and active_config.PROXY_IP and 
                hasattr(active_config, 'PROXY_PORT') and active_config.PROXY_PORT):
                
                # Format proxy URL based on authentication requirements
                if (hasattr(active_config, 'PROXY_USERNAME') and active_config.PROXY_USERNAME and 
                    hasattr(active_config, 'PROXY_PASSWORD') and active_config.PROXY_PASSWORD):
                    # Use URL-encoded username and password for special characters
                    import urllib.parse
                    # Get encoding method from config
                    encoding_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus") if active_config else "quote_plus"
                    # Apply URL encoding based on the method
                    if encoding_method == "none":
                        username = active_config.PROXY_USERNAME
                        password = active_config.PROXY_PASSWORD
                    elif encoding_method == "quote":
                        username = urllib.parse.quote(active_config.PROXY_USERNAME)
                        password = urllib.parse.quote(active_config.PROXY_PASSWORD)
                    else:  # Default to quote_plus
                    # Get encoding method from config
                    encoding_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus") if active_config else "quote_plus"
                    # Apply URL encoding based on the method
                    if encoding_method == "none":
                        username = active_config.PROXY_USERNAME
                        password = active_config.PROXY_PASSWORD
                    elif encoding_method == "quote":
                        username = urllib.parse.quote(active_config.PROXY_USERNAME)
                        password = urllib.parse.quote(active_config.PROXY_PASSWORD)
                    else:  # Default to quote_plus
                        username = urllib.parse.quote_plus(active_config.PROXY_USERNAME)
                        password = urllib.parse.quote_plus(active_config.PROXY_PASSWORD)
                    proxy_url = f"http://{username}:{password}@{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    proxy_info = f"{active_config.PROXY_IP}:{active_config.PROXY_PORT} with authentication"
                else:
                    proxy_url = f"http://{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    proxy_info = f"{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                
                proxies = {
                    "http": proxy_url,
                    "https": proxy_url
                }
                
                logger.info(f"Configured proxy connection to Binance API via {proxy_info}")
            else:
                logger.warning("Proxy is enabled but proxy settings are incomplete - falling back to direct connection")
                use_proxy = False
        
        # Create a client whether it's authenticated or not
        def create_client_with_params(use_proxy_param=False, proxies_param=None):
            # Build kwargs dictionary based on proxy settings
            kwargs = {
                "timeout": 30,  # seconds
            }
            
            if use_proxy_param and proxies_param:
                kwargs["proxies"] = proxies_param
                
            # Create client based on authentication status
            if api_key and api_secret:
                client = Spot(
                    base_url=self.base_url,
                    api_key=api_key,
                    api_secret=api_secret,
                    **kwargs
                )
                auth_type = "with credentials"
            else:
                client = Spot(
                    base_url=self.base_url,
                    **kwargs
                )
                auth_type = "without credentials (public access only)"
                
            return client, auth_type
        
        # First try with proxy if enabled
        if use_proxy and proxies:
            logger.info(f"Attempting to connect to Binance API using proxy at {proxy_info}")
            try:
                # Create client with proxy
                client, auth_type = create_client_with_params(True, proxies)
                
                # Test connection with a simple call
                account_info = None
                if api_key and api_secret:
                    # If authenticated, try a simple auth-required endpoint
                    try:
                        account_info = client.account()
                        logger.info("Successfully authenticated with Binance API via proxy")
                    except Exception as e:
                        logger.warning(f"Authentication test failed: {e}")
                        # Continue anyway as proxy connection might be working
                
                logger.info(f"Successfully connected to Binance API {auth_type} via proxy")
                return client
                
            except Exception as e:
                logger.warning(f"Failed to connect to Binance API via proxy: {e}")
                if not fallback_to_direct:
                    logger.error("Proxy connection failed and fallback is disabled - returning unconfigured client")
                    # Return a basic client anyway to avoid breaking the application
                    return Spot(base_url=self.base_url)
                else:
                    logger.info("Falling back to direct connection...")
        
        # Try direct connection if proxy is disabled or proxy connection failed with fallback enabled
        try:
            # Create client without proxy
            client, auth_type = create_client_with_params(False, None)
            
            # Test connection
            try:
                if api_key and api_secret:
                    # If authenticated, try a simple auth-required endpoint
                    account_info = client.account()
                    logger.info("Successfully authenticated with Binance API directly")
                else:
                    # If not authenticated, try a simple public endpoint
                    ping_response = client.ping()
                    logger.info("Successfully connected to Binance API directly (public access)")
            except Exception as e:
                # Connection test failed, but we'll still return the client
                logger.warning(f"Direct connection test failed: {e}")
                logger.warning("Returning client anyway - operations may fail")
            
            logger.info(f"Configured Binance client {auth_type}")
            return client
            
        except Exception as e:
            logger.error(f"Failed to create Binance client: {e}")
            # Return a basic client that might work later if connectivity issues resolve
            return Spot(base_url=self.base_url)
    
    def execute_trade(self, 
                     symbol: str, 
                     side: str, 
                     quantity: float, 
                     order_type: str = "MARKET",
                     price: Optional[float] = None,
                     ml_signal: Optional[Dict[str, Any]] = None,
                     position_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute a trade using the Binance SDK directly
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            side: Order side (BUY or SELL)
            quantity: Order quantity
            order_type: Order type (MARKET or LIMIT)
            price: Limit price (required for LIMIT orders)
            ml_signal: Machine learning signal that triggered this trade
            position_id: Position ID for tracking (mainly for paper trades)
            
        Returns:
            Order response data
        """
        # Ensure client is initialized
        if self.client is None:
            self.client = self._create_client()
        # Standardize inputs
        symbol = symbol.upper().replace('-', '')
        side = side.upper()
        order_type = order_type.upper()
        
        # Skip execution if signal is HOLD
        if ml_signal and ml_signal.get('signal') == 'HOLD':
            logger.info(f"Skipping execution for {symbol} due to HOLD signal")
            return {
                "success": True,
                "message": "Order not placed due to HOLD signal",
                "signal": "HOLD",
                "executed": False
            }
        
        # Check if we already have an open position for this symbol
        has_position = self.has_open_position(symbol, side)
        if has_position:
            logger.info(f"Skipping {side} order for {symbol} - position already exists")
            return {
                "success": True,
                "message": f"Position already exists for {symbol}",
                "executed": False
            }
        
        # Prepare order parameters
        params = {
            "symbol": symbol,
            "side": side,
            "type": order_type,
            "quantity": quantity
        }
        
        # Add price for LIMIT orders
        if order_type == "LIMIT" and price is not None:
            params["price"] = price
            params["timeInForce"] = "GTC"  # Good Till Canceled
        
        # Log the order attempt
        log_message = f"{'PAPER' if self.paper_mode else 'REAL'} ORDER: {side} {quantity} {symbol}"
        if order_type == "LIMIT":
            log_message += f" @ {price}"
        if ml_signal:
            confidence = ml_signal.get('confidence', 0)
            log_message += f" (ML confidence: {confidence:.2f})"
        
        logger.info(log_message)
        
        # If we're in paper mode, simulate the order execution
        if self.paper_mode:
            return self._execute_paper_trade(symbol, side, quantity, order_type, price, ml_signal, position_id)
        
        # Execute real order using Binance SDK
        for attempt in range(self.max_retries):
            try:
                # Use the Binance SDK new_order method directly
                response = self.client.new_order(**params)
                
                # Log the successful execution
                logger.info(f"Order executed: {response}")
                
                # Call logging service if available
                try:
                    if position_id:
                        log_trade_execution(
                            symbol=symbol,
                            action=side,
                            quantity=quantity,
                            price=price or float(response.get('price', 0)),
                            position_id=position_id,
                            trade_id=response.get('orderId'),
                            ml_confidence=ml_signal.get('confidence') if ml_signal else None
                        )
                except Exception as log_err:
                    logger.error(f"Error logging trade execution: {log_err}")
                
                return {
                    "success": True,
                    "message": "Order executed successfully",
                    "order_id": response.get('orderId'),
                    "executed": True,
                    "response": response
                }
                
            except ClientError as e:
                error_code = str(e).split(': ')[0] if ': ' in str(e) else 'unknown'
                error_msg = f"Binance client error: {e}"
                logger.error(f"Attempt {attempt+1}/{self.max_retries}: {error_msg}")
                
                # Log the error
                try:
                    log_error(
                        symbol=symbol,
                        operation=f"{side}_order",
                        error_message=error_msg,
                        context={
                            "attempt": attempt + 1,
                            "params": params
                        }
                    )
                except Exception as log_err:
                    logger.error(f"Error logging trade error: {log_err}")
                
                # If we've reached max retries, return failure
                if attempt == self.max_retries - 1:
                    return {
                        "success": False,
                        "message": error_msg,
                        "error_code": error_code,
                        "executed": False
                    }
                    
                # Wait before retrying
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except ServerError as e:
                error_msg = f"Binance server error: {e}"
                logger.error(f"Attempt {attempt+1}/{self.max_retries}: {error_msg}")
                
                # Log the error
                try:
                    log_error(
                        symbol=symbol,
                        operation=f"{side}_order",
                        error_message=error_msg,
                        context={
                            "attempt": attempt + 1,
                            "params": params
                        }
                    )
                except Exception as log_err:
                    logger.error(f"Error logging trade error: {log_err}")
                
                # If we've reached max retries, return failure
                if attempt == self.max_retries - 1:
                    return {
                        "success": False,
                        "message": error_msg,
                        "executed": False
                    }
                    
                # Wait before retrying
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                error_msg = f"Unexpected error executing order: {e}"
                logger.error(f"Attempt {attempt+1}/{self.max_retries}: {error_msg}")
                
                # Log the error
                try:
                    log_error(
                        symbol=symbol,
                        operation=f"{side}_order",
                        error_message=error_msg,
                        context={
                            "attempt": attempt + 1,
                            "params": params
                        }
                    )
                except Exception as log_err:
                    logger.error(f"Error logging trade error: {log_err}")
                
                # If we've reached max retries, return failure
                if attempt == self.max_retries - 1:
                    return {
                        "success": False,
                        "message": error_msg,
                        "executed": False
                    }
                    
                # Wait before retrying
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def _execute_paper_trade(self, 
                            symbol: str, 
                            side: str, 
                            quantity: float, 
                            order_type: str = "MARKET",
                            price: Optional[float] = None,
                            ml_signal: Optional[Dict[str, Any]] = None,
                            position_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Simulate a trade execution for paper trading mode
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            side: Order side (BUY or SELL)
            quantity: Order quantity
            order_type: Order type (MARKET or LIMIT)
            price: Limit price (required for LIMIT orders)
            ml_signal: Machine learning signal that triggered this trade
            position_id: Position ID for tracking
            
        Returns:
            Simulated order response data
        """
        # Generate a simulated order ID
        order_id = int(time.time() * 1000)
        
        # Use the provided price or get the current price
        # For paper trading we'll assume the order gets filled immediately at the current price
        execution_price = price
        if execution_price is None:
            # Try to get market price from our market service
            try:
                from python_app.services.binance.market_service import binance_market_service
                price_data = binance_market_service.get_symbol_price(symbol)
                if price_data and 'price' in price_data:
                    execution_price = float(price_data['price'])
            except Exception as e:
                logger.warning(f"Could not get market price: {e}. Using fallback price.")
                # Fallback price (BTC ~ $69,000, ETH ~ $1,900)
                execution_price = 69000.0 if 'BTC' in symbol else 1900.0 if 'ETH' in symbol else 1.0
        
        # Create a paper trading position
        paper_position = {
            "id": position_id or order_id,
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "entry_price": execution_price,
            "timestamp": datetime.now().isoformat(),
            "status": "OPEN",
            "ml_confidence": ml_signal.get('confidence') if ml_signal else None
        }
        
        # Store the position
        self.positions.append(paper_position)
        
        # Log the paper trade
        logger.info(f"PAPER TRADE EXECUTED: {side} {quantity} {symbol} @ {execution_price}")
        
        # Call logging service if available
        try:
            pos_id = position_id or order_id
            log_trade_execution(
                symbol=symbol,
                action=side,
                quantity=quantity,
                price=execution_price,
                position_id=pos_id,
                trade_id=f"PAPER-{order_id}",
                ml_confidence=ml_signal.get('confidence') if ml_signal else None
            )
        except Exception as log_err:
            logger.error(f"Error logging paper trade execution: {log_err}")
        
        # Return simulated response
        return {
            "success": True,
            "message": "Paper trade executed successfully",
            "order_id": order_id,
            "price": execution_price,
            "quantity": quantity,
            "side": side,
            "symbol": symbol,
            "type": order_type,
            "is_paper_trade": True,
            "position_id": position_id or order_id,
            "executed": True
        }
    
    def has_open_position(self, symbol: str, side: str) -> bool:
        """
        Check if there's already an open position for the symbol
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            side: Order side (BUY or SELL)
            
        Returns:
            True if a position exists, False otherwise
        """
        # Ensure client is initialized
        if self.client is None:
            self.client = self._create_client()
            
        # Standardize inputs
        symbol = symbol.upper().replace('-', '')
        side = side.upper()
        
        # For paper trading, check our tracked positions
        if self.paper_mode:
            opposite_side = "SELL" if side == "BUY" else "BUY"
            for position in self.positions:
                if position["symbol"] == symbol and position["side"] == opposite_side and position["status"] == "OPEN":
                    return True
            return False
        
        # For real trading, check open orders
        try:
            # Using the SDK's get_open_orders method
            open_orders = self.client.get_open_orders(symbol=symbol)
            
            # Check if any orders match our side
            for order in open_orders:
                if order.get('symbol') == symbol and order.get('side') == side:
                    return True
            
            # Also check account positions
            account_info = self.client.get_account()
            
            # Extract the base and quote assets from the symbol
            # e.g., BTCUSDT -> BTC and USDT
            base_asset = symbol[:-4] if symbol.endswith('USDT') else symbol[:-3]
            
            # Check balances for the base asset
            for balance in account_info.get('balances', []):
                asset = balance.get('asset', '')
                if asset == base_asset and float(balance.get('free', 0)) > 0:
                    # If we're trying to BUY and already have balance, or
                    # if we're trying to SELL and don't have balance
                    return (side == "BUY" and float(balance.get('free', 0)) > 0) or \
                           (side == "SELL" and float(balance.get('free', 0)) == 0)
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking open positions for {symbol}: {e}")
            # In case of error, default to False to allow potential order
            return False
    
    def close_position(self, 
                      symbol: str, 
                      position_id: int, 
                      quantity: Optional[float] = None, 
                      reason: str = "Manual close") -> Dict[str, Any]:
        """
        Close an open position
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            position_id: Position ID to close
            quantity: Quantity to close (defaults to full position)
            reason: Reason for closing the position
            
        Returns:
            Position close result
        """
        # Ensure client is initialized
        if self.client is None:
            self.client = self._create_client()
            
        # Standardize symbol
        symbol = symbol.upper().replace('-', '')
        
        # For paper trading
        if self.paper_mode:
            for i, position in enumerate(self.positions):
                if position["id"] == position_id and position["status"] == "OPEN":
                    # Calculate profit/loss
                    entry_price = position["entry_price"]
                    
                    # Get current price
                    current_price = None
                    try:
                        from python_app.services.binance.market_service import binance_market_service
                        price_data = binance_market_service.get_symbol_price(symbol)
                        if price_data and 'price' in price_data:
                            current_price = float(price_data['price'])
                    except Exception as e:
                        logger.warning(f"Could not get market price: {e}. Using fallback price.")
                        current_price = entry_price  # Fallback to no P&L
                    
                    # Use provided quantity or full position
                    close_quantity = quantity or position["quantity"]
                    
                    # Calculate P&L based on side
                    is_long = position["side"] == "BUY"
                    direction = "LONG" if is_long else "SHORT"
                    
                    if current_price:
                        if is_long:
                            pnl = (current_price - entry_price) * close_quantity
                            pnl_pct = ((current_price - entry_price) / entry_price) * 100
                        else:
                            pnl = (entry_price - current_price) * close_quantity
                            pnl_pct = ((entry_price - current_price) / entry_price) * 100
                    else:
                        pnl = 0
                        pnl_pct = 0
                    
                    # Calculate holding period in hours
                    start_time = datetime.fromisoformat(position["timestamp"])
                    end_time = datetime.now()
                    holding_period_hours = (end_time - start_time).total_seconds() / 3600
                    
                    # Update position
                    self.positions[i]["status"] = "CLOSED"
                    self.positions[i]["close_price"] = current_price
                    self.positions[i]["close_time"] = end_time.isoformat()
                    self.positions[i]["pnl"] = pnl
                    self.positions[i]["pnl_pct"] = pnl_pct
                    self.positions[i]["close_reason"] = reason
                    
                    # Log the position close
                    logger.info(f"PAPER POSITION CLOSED: {symbol} {direction} position with P&L: {pnl:.2f} ({pnl_pct:.2f}%)")
                    
                    # Call logging service if available
                    try:
                        log_position_close(
                            symbol=symbol,
                            position_id=position_id,
                            entry_price=entry_price,
                            exit_price=current_price,
                            quantity=close_quantity,
                            direction=direction,
                            realized_pnl=pnl,
                            realized_pnl_pct=pnl_pct,
                            holding_period_hours=holding_period_hours,
                            close_reason=reason
                        )
                    except Exception as log_err:
                        logger.error(f"Error logging position close: {log_err}")
                    
                    # Return close result
                    return {
                        "success": True,
                        "message": f"Position closed successfully: {reason}",
                        "position_id": position_id,
                        "symbol": symbol,
                        "quantity": close_quantity,
                        "entry_price": entry_price,
                        "exit_price": current_price,
                        "pnl": pnl,
                        "pnl_pct": pnl_pct,
                        "is_paper_trade": True
                    }
            
            # If no matching position found
            return {
                "success": False,
                "message": f"No open position found for {symbol} with ID {position_id}",
                "is_paper_trade": True
            }
        
        # For real trading
        else:
            # Get position details first
            position = self._get_position_details(symbol, position_id)
            if not position:
                return {
                    "success": False,
                    "message": f"No open position found for {symbol} with ID {position_id}"
                }
            
            # Create a market order in the opposite direction to close
            side = "SELL" if position.get("side") == "BUY" else "BUY"
            close_quantity = quantity or position.get("quantity", 0)
            
            return self.execute_trade(
                symbol=symbol,
                side=side,
                quantity=close_quantity,
                order_type="MARKET",
                ml_signal=None,
                position_id=position_id
            )
    
    def _get_position_details(self, symbol: str, position_id: int) -> Optional[Dict[str, Any]]:
        """
        Get details of a specific position
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            position_id: Position ID
            
        Returns:
            Position details or None if not found
        """
        # For paper trading
        if self.paper_mode:
            for position in self.positions:
                if position["id"] == position_id and position["symbol"] == symbol:
                    return position
            return None
        
        # For real trading, we would need to query the order history
        # This is a simplified implementation
        try:
            # Get position from Binance (in a real impl, this would query order history)
            # For now, we'll return a minimal position object
            return {
                "id": position_id,
                "symbol": symbol,
                "side": None,  # Would need to be determined from order history
                "quantity": 0  # Would need to be determined from order history
            }
        except Exception as e:
            logger.error(f"Error getting position details: {e}")
            return None
    
    def execute_ml_trade(self, 
                        symbol: str, 
                        ml_signal: Dict[str, Any],
                        position_id: Optional[int] = None,
                        quantity: Optional[float] = None) -> Dict[str, Any]:
        """
        Execute a trade based on ML signal
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            ml_signal: ML prediction signal with 'signal' key ('BUY', 'SELL', 'HOLD')
            position_id: Position ID for tracking (optional)
            quantity: Order quantity (optional, will calculate if not provided)
            
        Returns:
            Trade execution result
        """
        # Skip if signal is not provided or not valid
        if not ml_signal or 'signal' not in ml_signal:
            logger.warning(f"Invalid ML signal for {symbol}: {ml_signal}")
            return {
                "success": False,
                "message": "Invalid ML signal",
                "executed": False
            }
        
        # Skip if signal is HOLD
        signal_type = ml_signal.get('signal', '').upper()
        if signal_type == 'HOLD':
            logger.info(f"Skipping execution for {symbol} due to HOLD signal")
            return {
                "success": True,
                "message": "Order not placed due to HOLD signal",
                "signal": "HOLD",
                "executed": False
            }
        
        # Map signal to order side
        side = "BUY" if signal_type == 'BUY' else "SELL"
        
        # Determine quantity if not provided
        calculated_quantity = quantity
        if calculated_quantity is None:
            # For paper trading, use a default quantity based on the symbol
            if 'BTC' in symbol:
                calculated_quantity = 0.01  # 0.01 BTC
            elif 'ETH' in symbol:
                calculated_quantity = 0.1   # 0.1 ETH
            else:
                calculated_quantity = 10.0  # Default for other coins
        
        # Execute the trade
        return self.execute_trade(
            symbol=symbol,
            side=side,
            quantity=calculated_quantity,
            order_type="MARKET",
            ml_signal=ml_signal,
            position_id=position_id
        )


# Create a singleton instance
_binance_trading_service = None

def get_binance_trading_service(use_testnet: bool = None, 
                              paper_mode: bool = True,
                              user_id: str = None,
                              api_key: str = None,
                              secret_key: str = None) -> BinanceTradingService:
    """
    Get or create the BinanceTradingService instance
    
    If user_id is provided, it creates a new instance with user-specific API keys
    Otherwise, it returns the singleton instance.
    
    Args:
        use_testnet: Whether to use the Binance testnet
        paper_mode: Whether to use paper trading mode
        user_id: User ID for API key lookup (default: None)
        api_key: Optional direct API key (default: None)
        secret_key: Optional direct secret key (default: None)
        
    Returns:
        The BinanceTradingService instance
    """
    global _binance_trading_service
    
    # If user_id, api_key or secret_key are provided, create a new instance for this user
    if user_id or api_key or secret_key:
        return BinanceTradingService(
            use_testnet=use_testnet,
            paper_mode=paper_mode,
            user_id=user_id,
            api_key=api_key,
            secret_key=secret_key
        )
    
    # Otherwise, use or create the singleton instance
    if _binance_trading_service is None:
        _binance_trading_service = BinanceTradingService(
            use_testnet=use_testnet,
            paper_mode=paper_mode
        )
    return _binance_trading_service


# Create a default instance for easy importing
binance_trading_service = get_binance_trading_service()


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing Binance Trading Service ===\n")
    
    # Create the service
    service = get_binance_trading_service(paper_mode=True)
    
    # Test executing a trade
    print("Testing paper trade execution...")
    result = service.execute_trade(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.01,
        ml_signal={
            "signal": "BUY",
            "confidence": 0.85,
            "price": 69000.0
        }
    )
    print(f"Trade execution result: {json.dumps(result, indent=2)}")
    
    # Check if position exists
    print("\nChecking if position exists...")
    has_position = service.has_open_position("BTCUSDT", "BUY")
    print(f"Has open position? {has_position}")
    
    # Test closing the position
    if result.get('success', False) and result.get('position_id'):
        print("\nTesting position close...")
        position_id = result.get('position_id')
        close_result = service.close_position(
            symbol="BTCUSDT",
            position_id=position_id,
            reason="Test close"
        )
        print(f"Position close result: {json.dumps(close_result, indent=2)}")
    
    print("\nTest completed!")