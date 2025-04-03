#!/usr/bin/env python3
"""
Binance Market Service

This module provides services for accessing market data from Binance
using the official Binance Connector SDK.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'binance_market.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('binance_market')

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
        if spec:
            config_module = importlib.util.module_from_spec(spec)
            sys.modules["config"] = config_module
            if spec.loader:
                spec.loader.exec_module(config_module)
                active_config = config_module.active_config
            else:
                logger.error("Failed to load config module: spec.loader is None")
                active_config = None
        else:
            logger.error("Failed to load config module: spec is None")
            active_config = None

# Using the official Binance connector SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
except ImportError:
    logger.error("Failed to import Binance connector. Please install it with: pip install binance-connector")
    # Create stubs for error classes if import fails
    class Spot:
        def __init__(self, base_url=None, **kwargs):
            pass
        
        def ticker_price(self, **params):
            return {"symbol": params.get("symbol", "BTCUSDT"), "price": "69000.0"}
        
        def ticker_24hr(self, **params):
            return [{"symbol": "BTCUSDT", "lastPrice": "69000.0", "priceChangePercent": "2.5"}]
        
        def exchange_info(self, **params):
            return {"symbols": [{"symbol": "BTCUSDT", "status": "TRADING"}]}
            
    class ClientError(Exception): pass
    class ServerError(Exception): pass


class BinanceMarketService:
    """
    Service for accessing market data from Binance
    
    This service uses the official Binance connector SDK to get market data
    such as prices, tickers, and exchange information.
    """
    
    def __init__(self, use_testnet: bool = None, max_retries: int = 3):
        """
        Initialize the Binance Market Service
        
        Args:
            use_testnet: Whether to use the Binance testnet (default: from active_config.USE_TESTNET)
            max_retries: Maximum number of retry attempts (default: 3)
        """
        # If use_testnet is not specified, use the config value
        if use_testnet is None and active_config:
            use_testnet = active_config.USE_TESTNET
        else:
            use_testnet = use_testnet if use_testnet is not None else False
            
        self.use_testnet = use_testnet
        self.max_retries = max_retries
        self.base_url = active_config.BINANCE_TEST_URL if use_testnet else active_config.BINANCE_BASE_URL if active_config else 'https://api.binance.com'
        
        # Initialize Binance client
        self.client = self._create_client()
        
        mode_str = "TESTNET" if use_testnet else "PRODUCTION"
        logger.info(f"Binance Market Service initialized in {mode_str} mode")
    
    def _create_client(self) -> Spot:
        """
        Create a Binance API client for market data
        
        Returns:
            Binance Spot client
        """
        # Check if proxy is enabled in configuration
        use_proxy = False
        if active_config:
            use_proxy = active_config.USE_PROXY
            fallback_to_direct = active_config.FALLBACK_TO_DIRECT
        else:
            use_proxy = False
            fallback_to_direct = True
            
        # Setup proxy configuration if enabled
        proxies = None
        proxy_info = None
        
        if use_proxy:
            # Check if proxy settings are complete
            if (active_config and 
                active_config.PROXY_IP and 
                active_config.PROXY_PORT):
                
                # Format proxy URL based on authentication requirements
                if active_config.PROXY_USERNAME and active_config.PROXY_PASSWORD:
                    # Use URL-encoded username and password for special characters
                    import urllib.parse
                    # Get encoding method and protocol from config
                    encoding_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus") if active_config else "quote_plus"
                    proxy_protocol = getattr(active_config, "PROXY_PROTOCOL", "http") if active_config else "http"
                    
                    # Try all encoding methods sequentially
                    encoding_methods = ["none", "quote", "quote_plus"]
                    
                    # If a specific method is configured, try it first
                    configured_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus")
                    if configured_method in encoding_methods:
                        encoding_methods.remove(configured_method)
                        encoding_methods.insert(0, configured_method)
                    
                    # Try to create a client with each encoding method until one works
                    username = active_config.PROXY_USERNAME
                    password = active_config.PROXY_PASSWORD
                    
                    # Try a direct format without any encoding for Webshare proxies
                    proxy_username = active_config.PROXY_USERNAME
                    proxy_password = active_config.PROXY_PASSWORD
                    
                    # Create proxy URL with the specified protocol - using direct format
                    proxy_url = f"{proxy_protocol}://{proxy_username}:{proxy_password}@{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    
                    # Alternative proxy format sometimes needed for requests library - without auth in URL
                    proxy_url_alt = f"{proxy_protocol}://{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    proxy_info = f"{active_config.PROXY_IP}:{active_config.PROXY_PORT} with authentication (protocol: {proxy_protocol})"
                else:
                    proxy_protocol = getattr(active_config, "PROXY_PROTOCOL", "http") if active_config else "http"
                    proxy_url = f"{proxy_protocol}://{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    proxy_info = f"{active_config.PROXY_IP}:{active_config.PROXY_PORT} (protocol: {proxy_protocol})"
                
                # Prepare the basic proxy URL without auth
                proxy_url_basic = f"{proxy_protocol}://{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                
                # Prepare auth and proxy settings for binance-connector library
                proxies = {
                    "http": proxy_url_basic,  # Without auth in URL
                    "https": proxy_url_basic  # Without auth in URL
                }
                
                # Setup proxy auth separately for requests (used by binance-connector)
                # This format is more standard and should work with most proxy providers
                from requests.auth import HTTPProxyAuth
                auth = HTTPProxyAuth(proxy_username, proxy_password)
                
                logger.info(f"Configured proxy connection to Binance API via {proxy_info}")
            else:
                logger.warning("Proxy is enabled but proxy settings are incomplete - falling back to direct connection")
                use_proxy = False
        
        # First try with proxy if enabled
        if use_proxy and proxies:
            logger.info(f"Attempting to connect to Binance API using proxy at {proxy_info}")
            try:
                # Create params dictionary with proxy and auth if available
                kwargs = {
                    "timeout": 10,  # seconds
                    "proxies": proxies
                }
                
                # Add auth if it's defined (for authenticated proxies)
                if 'auth' in locals():
                    kwargs["auth"] = auth
                
                # Create client with proxy
                client = Spot(
                    base_url=self.base_url,
                    **kwargs
                )
                
                # Test connection with a simple ping
                client.ping()
                
                logger.info(f"Successfully connected to Binance API via proxy")
                return client
                
            except Exception as e:
                logger.warning(f"Failed to connect to Binance API via proxy: {e}")
                if not fallback_to_direct:
                    logger.error("Proxy connection failed and fallback is disabled - returning unconfigured client")
                    return Spot(base_url=self.base_url)
                else:
                    logger.info("Falling back to direct connection...")
        
        # Try direct connection if proxy is disabled or proxy connection failed with fallback enabled
        try:
            # Create params dictionary without proxy
            kwargs = {
                "timeout": 10,  # seconds
            }
            
            # Create client without proxy
            client = Spot(
                base_url=self.base_url,
                **kwargs
            )
            
            # Test connection
            try:
                client.ping()
                logger.info(f"Successfully connected to Binance API directly")
            except Exception as e:
                # Connection test failed, but we'll still return the client
                logger.warning(f"Direct connection test failed: {e}")
                logger.warning("Returning unconfigured client anyway - operations may fail")
            
            return client
            
        except Exception as e:
            logger.error(f"Failed to create Binance client: {e}")
            # Return a basic client that might work later if connectivity issues resolve
            return Spot(base_url=self.base_url)
    
    def get_symbol_price(self, symbol: str, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get current price for a symbol
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            force_refresh: Whether to force refresh the price (parameter kept for backward compatibility)
            
        Returns:
            Price data
        """
        # Format symbol
        symbol = symbol.upper().replace('-', '')
        
        # Get price from Binance API (always fresh data)
        for attempt in range(self.max_retries):
            try:
                price_data = self.client.ticker_price(symbol=symbol)
                return price_data
                
            except ClientError as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Binance client error: {e}")
                if attempt == self.max_retries - 1:
                    return {
                        'success': False,
                        'error': f"Binance client error: {e}",
                        'symbol': symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except ServerError as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Binance server error: {e}")
                if attempt == self.max_retries - 1:
                    return {
                        'success': False,
                        'error': f"Binance server error: {e}",
                        'symbol': symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Unexpected error: {e}")
                if attempt == self.max_retries - 1:
                    return {
                        'success': False,
                        'error': f"Unexpected error: {e}",
                        'symbol': symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def get_24hr_ticker(self, symbol: Optional[str] = None) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Get 24-hour ticker for one or all symbols
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT) or None for all symbols
            
        Returns:
            24-hour ticker data
        """
        # Format symbol if provided
        formatted_symbol = symbol.upper().replace('-', '') if symbol else None
        
        # Get ticker from Binance API
        for attempt in range(self.max_retries):
            try:
                if formatted_symbol:
                    ticker_data = self.client.ticker_24hr(symbol=formatted_symbol)
                else:
                    ticker_data = self.client.ticker_24hr()
                
                return ticker_data
                
            except (ClientError, ServerError) as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Binance API error: {e}")
                if attempt == self.max_retries - 1:
                    return [] if not formatted_symbol else {
                        'success': False,
                        'error': f"Binance API error: {e}",
                        'symbol': formatted_symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Unexpected error: {e}")
                if attempt == self.max_retries - 1:
                    return [] if not formatted_symbol else {
                        'success': False,
                        'error': f"Unexpected error: {e}",
                        'symbol': formatted_symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
    
    def get_exchange_info(self, symbol: Optional[str] = None) -> Dict[str, Any]:
        """
        Get exchange information
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT) or None for all symbols
            
        Returns:
            Exchange information
        """
        # Format symbol if provided
        formatted_symbol = symbol.upper().replace('-', '') if symbol else None
        
        # Get exchange info from Binance API
        for attempt in range(self.max_retries):
            try:
                if formatted_symbol:
                    exchange_info = self.client.exchange_info(symbol=formatted_symbol)
                else:
                    exchange_info = self.client.exchange_info()
                
                return exchange_info
                
            except (ClientError, ServerError) as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Binance API error: {e}")
                if attempt == self.max_retries - 1:
                    return {
                        'success': False,
                        'error': f"Binance API error: {e}",
                        'symbol': formatted_symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Unexpected error: {e}")
                if attempt == self.max_retries - 1:
                    return {
                        'success': False,
                        'error': f"Unexpected error: {e}",
                        'symbol': formatted_symbol
                    }
                time.sleep(2 ** attempt)  # Exponential backoff
                
    def get_all_prices(self) -> List[Dict[str, Any]]:
        """
        Get prices for all symbols from Binance
        
        Returns:
            List of price data for all symbols
        """
        # Get all prices directly from API
        for attempt in range(self.max_retries):
            try:
                # Use the ticker_price method to get all symbols
                all_prices = self.client.ticker_price()
                return all_prices
                
            except (ClientError, ServerError) as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Binance API error fetching all prices: {e}")
                if attempt == self.max_retries - 1:
                    # After all retries, return error information
                    error_response = {
                        'success': False,
                        'error': f"Failed to fetch prices from Binance: {e}",
                        'timestamp': int(time.time())
                    }
                    return [error_response]
                time.sleep(2 ** attempt)  # Exponential backoff
                
            except Exception as e:
                logger.warning(f"Attempt {attempt+1}/{self.max_retries}: Unexpected error fetching all prices: {e}")
                if attempt == self.max_retries - 1:
                    # After all retries, return error information
                    error_response = {
                        'success': False,
                        'error': f"Unexpected error fetching prices: {e}",
                        'timestamp': int(time.time())
                    }
                    return [error_response]
                time.sleep(2 ** attempt)  # Exponential backoff
            
    def get_24hr_stats(self, symbol: Optional[str] = None) -> Union[List[Dict[str, Any]], Dict[str, Any]]:
        """
        Get 24hr statistics for a symbol or all symbols
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT) or None for all symbols
            
        Returns:
            24hr statistics for the requested symbol(s)
        """
        # This is just a wrapper around get_24hr_ticker for naming consistency
        return self.get_24hr_ticker(symbol)


# Create a singleton instance
_binance_market_service = None

def get_binance_market_service(use_testnet: bool = False) -> BinanceMarketService:
    """
    Get or create the BinanceMarketService singleton instance
    
    Args:
        use_testnet: Whether to use the Binance testnet
        
    Returns:
        The BinanceMarketService instance
    """
    global _binance_market_service
    if _binance_market_service is None:
        _binance_market_service = BinanceMarketService(
            use_testnet=use_testnet
        )
    return _binance_market_service


# Create a default instance for easy importing
binance_market_service = get_binance_market_service()


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing Binance Market Service ===\n")
    
    # Create the service
    service = get_binance_market_service()
    
    # Test getting price
    print("Testing price retrieval...")
    price = service.get_symbol_price("BTCUSDT")
    print(f"BTCUSDT price: {price}")
    
    # Test getting 24-hour ticker
    print("\nTesting 24-hour ticker retrieval...")
    ticker = service.get_24hr_ticker("BTCUSDT")
    print(f"BTCUSDT 24hr ticker: {ticker}")
    
    # Test getting exchange info
    print("\nTesting exchange info retrieval...")
    exchange_info = service.get_exchange_info("BTCUSDT")
    print(f"BTCUSDT exchange info available: {'symbols' in exchange_info}")
    
    print("\nTest completed!")