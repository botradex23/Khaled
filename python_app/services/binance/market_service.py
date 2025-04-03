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
        # Import our enhanced proxy manager - using explicit import here
        import sys
        import os
        
        # Get the proxy manager through various import paths
        try:
            from python_app.services.binance.proxy_manager import get_proxy_manager
            proxy_manager = get_proxy_manager()
        except ImportError:
            try:
                from .proxy_manager import get_proxy_manager
                proxy_manager = get_proxy_manager()
            except ImportError:
                # For direct script execution
                sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
                try:
                    from proxy_manager import get_proxy_manager
                    proxy_manager = get_proxy_manager()
                except ImportError as e:
                    logger.error(f"Failed to import proxy_manager: {e}")
                    # Create a minimal proxy list with empty configuration
                    # This will make the client fall back to direct connection
                    class MinimalProxyManager:
                        def __init__(self):
                            self.proxy_list = []
                        def get_current_proxy(self):
                            return None
                        def rotate_proxy(self):
                            pass
                    proxy_manager = MinimalProxyManager()
        
        # Always enable fallback to direct connection (more reliable)
        fallback_to_direct = True
        
        # Try all available proxies before falling back to direct connection
        num_proxies = len(proxy_manager.proxy_list)
        for proxy_attempt in range(num_proxies):
            try:
                # Get base parameters
                kwargs = {
                    "base_url": self.base_url,
                    "timeout": 15  # Increased timeout for reliability
                }
                
                # Get current proxy
                current_proxy = proxy_manager.get_current_proxy()
                if current_proxy:
                    # Format proxy URL in a way compatible with urllib3
                    proxy_ip = current_proxy.get('ip')
                    proxy_port = current_proxy.get('port')
                    proxy_username = current_proxy.get('username')
                    proxy_password = current_proxy.get('password')
                    
                    # Build proxy string
                    proxy_str = f"{proxy_ip}:{proxy_port}"
                    
                    # Set proxies in the format expected by requests/urllib3
                    # Use HTTP protocol for both HTTP_PROXY and HTTPS_PROXY as recommended in the error message
                    if proxy_username and proxy_password:
                        import urllib.parse
                        encoded_auth = f"{urllib.parse.quote(proxy_username)}:{urllib.parse.quote(proxy_password)}"
                        os.environ['HTTP_PROXY'] = f"http://{encoded_auth}@{proxy_str}"
                        os.environ['HTTPS_PROXY'] = f"http://{encoded_auth}@{proxy_str}"  # Use HTTP protocol for HTTPS_PROXY
                    else:
                        os.environ['HTTP_PROXY'] = f"http://{proxy_str}"
                        os.environ['HTTPS_PROXY'] = f"http://{proxy_str}"  # Use HTTP protocol for HTTPS_PROXY
                        
                    logger.info(f"Testing proxy #{proxy_attempt+1}/{num_proxies}: {proxy_ip}:{proxy_port}")
                
                # Create client with parameters
                client = Spot(**kwargs)
                
                # Test the connection
                client.ping()
                logger.info(f"✅ Successfully connected to Binance API with proxy #{proxy_attempt+1}")
                return client
                
            except Exception as e:
                error_str = str(e)
                logger.warning(f"Failed to connect with proxy #{proxy_attempt+1}: {e}")
                
                # Clear environment variables
                if 'HTTP_PROXY' in os.environ:
                    del os.environ['HTTP_PROXY']
                if 'HTTPS_PROXY' in os.environ:
                    del os.environ['HTTPS_PROXY']
                
                # Check for specific errors 
                if "402 Payment Required" in error_str:
                    logger.error(f"Proxy payment required error. Rotating to next proxy.")
                elif "451" in error_str and "restricted location" in error_str:
                    logger.error(f"Geo-restriction error detected (451). Rotating to next proxy.")
                    
                # Rotate to the next proxy for the next attempt
                proxy_manager.rotate_proxy()
        
        # If we get here, all proxies failed
        logger.error(f"All {num_proxies} proxies failed to connect to Binance API")
        
        # If fallback is not allowed, return a basic client
        if not fallback_to_direct:
            logger.error("Proxy connections failed and fallback is disabled - returning unconfigured client")
            return Spot(base_url=self.base_url)
        
        # Try direct connection as a last resort
        logger.info("Attempting direct connection to Binance API...")
        try:
            # Clear any proxy environment variables
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
                
            # Create params dictionary without proxy
            kwargs = {
                "timeout": 15,  # seconds
                "base_url": self.base_url
            }
            
            # Create client without proxy
            client = Spot(**kwargs)
            
            # Test the connection
            client.ping()
            logger.info("✅ Successfully connected to Binance API directly")
            return client
            
        except Exception as e:
            logger.error(f"Failed to create Binance client with direct connection: {e}")
            logger.warning("All connection attempts failed - returning basic unconfigured client")
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
                # Check if this is a geo-restriction error (451)
                error_str = str(e)
                if "451" in error_str and "restricted location" in error_str:
                    logger.error("Geo-restriction error detected (451). Proxy might not be working correctly.")
                    
                if attempt == self.max_retries - 1:
                    error_response = {
                        'success': False,
                        'error': f"Binance client error: {e}",
                        'symbol': symbol,
                        'geo_restricted': "451" in error_str and "restricted location" in error_str
                    }
                    logger.error(f"Failed to get price for {symbol} after {self.max_retries} attempts: {error_response}")
                    return error_response
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