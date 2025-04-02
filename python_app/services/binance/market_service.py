"""
Binance Market Price Service using the official binance-connector-python SDK

This module is responsible for:
1. Connecting to Binance API using the official Python SDK
2. Fetching real-time market data (prices, 24hr stats, etc.)
3. Handling proxy settings for geo-restricted regions
4. Providing a clean interface for other parts of the application
"""

import os
import time
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Union, Any, Tuple

import sys
# Add the parent directory to the Python path to allow imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

try:
    from python_app.config import active_config
    from python_app.models.binance_models import BinanceTickerPrice, Binance24hrTicker, LivePriceUpdate
except ImportError:
    try:
        from config import active_config
        from models.binance_models import BinanceTickerPrice, Binance24hrTicker, LivePriceUpdate
    except ImportError:
        # If all else fails, use relative imports
        import importlib.util
        import sys
        
        # Dynamically load the modules
        spec = importlib.util.spec_from_file_location("config", 
                                                     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "config.py"))
        config_module = importlib.util.module_from_spec(spec)
        sys.modules["config"] = config_module
        spec.loader.exec_module(config_module)
        active_config = config_module.active_config
        
        spec = importlib.util.spec_from_file_location("binance_models", 
                                                     os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "models", "binance_models.py"))
        models_module = importlib.util.module_from_spec(spec)
        sys.modules["binance_models"] = models_module
        spec.loader.exec_module(models_module)
        BinanceTickerPrice = models_module.BinanceTickerPrice
        Binance24hrTicker = models_module.Binance24hrTicker
        LivePriceUpdate = models_module.LivePriceUpdate

# Using the official Binance connector SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    from binance.lib.utils import config_logging
    config_logging(logging, logging.INFO)
except ImportError:
    logging.error("Binance connector SDK not found. Please install it using 'pip install binance-connector'")
    # Create a stub for Binance connector to avoid runtime errors when the library is not available
    class Spot:
        def __init__(self, base_url=None, api_key=None, api_secret=None, **kwargs):
            pass
            
        def ticker_price(self, symbol=None):
            return [{"symbol": "BTCUSDT", "price": "0.0"}]
            
        def ticker_24hr(self, symbol=None):
            return [{"symbol": "BTCUSDT", "priceChangePercent": "0.0", "lastPrice": "0.0"}]
            
        def klines(self, symbol=None, interval=None, limit=None, startTime=None, endTime=None, **kwargs):
            # Return a basic klines structure
            # Each kline is: [open_time, open, high, low, close, volume, close_time, quote_volume, trades_count, taker_buy_base_vol, taker_buy_quote_vol, ignore]
            
            # Calculate timestamps based on inputs
            now = int(time.time() * 1000)
            actual_end_time = endTime or now
            
            # Calculate interval in milliseconds
            interval_ms = 60000  # Default to 1m
            if interval:
                unit = interval[-1].lower()
                value = int(interval[:-1]) if len(interval) > 1 else 1
                
                if unit == 'm':
                    interval_ms = value * 60 * 1000
                elif unit == 'h':
                    interval_ms = value * 60 * 60 * 1000
                elif unit == 'd':
                    interval_ms = value * 24 * 60 * 60 * 1000
            
            # Generate candles from startTime to endTime if provided
            candles = []
            actual_limit = limit or 100
            
            if startTime:
                # Generate candles from startTime to endTime
                current_time = startTime
                for _ in range(actual_limit):
                    if current_time > actual_end_time:
                        break
                    
                    candle = [
                        current_time,
                        "50000.0",
                        "51000.0",
                        "49000.0",
                        "50500.0",
                        "100.0",
                        current_time + interval_ms - 1,  # Close time just before next candle
                        "5050000.0",
                        100,
                        "50.0",
                        "2525000.0",
                        "0"
                    ]
                    candles.append(candle)
                    current_time += interval_ms
            else:
                # Just generate the requested number of candles
                current_time = actual_end_time - (interval_ms * actual_limit)
                for _ in range(actual_limit):
                    candle = [
                        current_time,
                        "50000.0",
                        "51000.0",
                        "49000.0",
                        "50500.0",
                        "100.0",
                        current_time + interval_ms - 1,  # Close time just before next candle
                        "5050000.0",
                        100,
                        "50.0",
                        "2525000.0",
                        "0"
                    ]
                    candles.append(candle)
                    current_time += interval_ms
            
            return candles
    
    class ClientError(Exception): pass
    class ServerError(Exception): pass


class BinanceMarketService:
    """
    Service for interacting with Binance market data using the official binance-connector-python SDK
    Provides methods to fetch prices, statistics, and handle real-time updates
    """
    
    def __init__(self, use_testnet: bool = False):
        """
        Initialize the Binance Market Price Service
        
        Args:
            use_testnet: Whether to use the Binance testnet
        """
        self.use_testnet = use_testnet
        self.base_url = active_config.BINANCE_TEST_URL if use_testnet else active_config.BINANCE_BASE_URL
        self.client = self._create_client()
        self.live_prices = {}  # Cache for live prices
        
        logging.info(f"Binance Market Price Service initialized with base URL: {self.base_url}")
    
    def _create_client(self) -> Spot:
        """
        Create a Binance API client using the official binance-connector SDK
        
        Returns:
            Configured Binance Spot client
        """
        api_key = active_config.BINANCE_API_KEY
        api_secret = active_config.BINANCE_SECRET_KEY
        
        # Setup proxy configuration if enabled
        proxies = {}
        if active_config.USE_PROXY:
            proxy_url = f"http://{active_config.PROXY_USERNAME}:{active_config.PROXY_PASSWORD}@{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
            proxies = {
                "http": proxy_url,
                "https": proxy_url
            }
            logging.info(f"Using proxy connection to Binance API via {active_config.PROXY_IP}:{active_config.PROXY_PORT}")
        
        try:
            # Create params dictionary
            kwargs = {
                "timeout": 30,  # seconds
                "proxies": proxies if active_config.USE_PROXY else None
            }
            
            # Create client based on auth
            if api_key and api_secret:
                client = Spot(
                    base_url=self.base_url,
                    api_key=api_key,
                    api_secret=api_secret,
                    **kwargs
                )
                logging.info("Connected to Binance API with credentials")
            else:
                client = Spot(
                    base_url=self.base_url,
                    **kwargs
                )
                logging.info("Connected to Binance API without credentials (public access only)")
            
            return client
        except Exception as e:
            logging.error(f"Failed to create Binance client: {e}")
            # Return a basic client that might work with direct connections
            return Spot(base_url=self.base_url)
    
    def update_price(self, symbol: str, price: float, source: str = 'binance-websocket') -> None:
        """
        Update the cached price for a symbol
        
        Args:
            symbol: The trading pair symbol (e.g., BTCUSDT)
            price: The new price
            source: The source of the price update
        """
        symbol = symbol.upper()
        old_price = self.live_prices.get(symbol)
        self.live_prices[symbol] = price
        
        # Create a price update event object
        update = LivePriceUpdate(symbol, price, source)
        
        # Log significant price changes
        if old_price and abs(price - old_price) / old_price > 0.01:
            logging.info(f"Significant price change for {symbol}: {old_price} -> {price} ({((price - old_price) / old_price) * 100:.2f}%)")
    
    def get_latest_price(self, symbol: str) -> Optional[float]:
        """
        Get the latest cached price for a symbol
        
        Args:
            symbol: The trading pair symbol (e.g., BTCUSDT)
            
        Returns:
            The latest price or None if not found
        """
        symbol = symbol.upper()
        return self.live_prices.get(symbol)
    
    def get_all_latest_prices(self) -> List[Dict[str, Any]]:
        """
        Get all cached latest prices
        
        Returns:
            List of price updates
        """
        now = int(time.time() * 1000)
        return [
            LivePriceUpdate(symbol, price, 'binance-websocket').to_dict()
            for symbol, price in self.live_prices.items()
        ]
    
    def get_all_prices(self) -> List[Dict[str, str]]:
        """
        Get current prices for all symbols from Binance API
        
        Returns:
            List of symbol/price pairs
        """
        try:
            # Use the official Binance API for ticker_price which gets all symbols at once
            response = self.client.ticker_price()
            logging.info(f"Successfully fetched {len(response)} prices from Binance")
            
            # Update the price cache
            results = []
            for ticker in response:
                symbol = ticker.get('symbol', '')
                price = ticker.get('price', '')
                if price:
                    self.update_price(symbol, float(price), 'binance')
                    results.append(BinanceTickerPrice(symbol, price).to_dict())
            
            return results
        except ClientError as e:
            error_code = str(e).split(': ')[0] if ': ' in str(e) else 'unknown'
            if '-1003' in error_code:  # Rate limit code
                logging.error(f"API rate limit exceeded: {e}")
                raise ValueError("Binance API rate limit exceeded. Please try again later.")
            elif '-1022' in error_code:  # IP restricted
                logging.error(f"Binance API access restricted: {e}")
                raise ValueError("Binance API access restricted. Please try again later.")
            else:
                logging.error(f"Binance client error: {e}")
                raise ValueError(f"Binance API client error: {e}")
        except ServerError as e:
            logging.error(f"Binance server error: {e}")
            raise ValueError("Binance API server error. Please try again later.")
        except Exception as e:
            logging.error(f"Error fetching all prices from Binance: {e}")
            raise ValueError(f"Failed to fetch market data from Binance: {e}")
    
    def get_symbol_price(self, symbol: str) -> Optional[Dict[str, str]]:
        """
        Get current price for a specific symbol
        
        Args:
            symbol: The trading pair symbol (e.g., BTCUSDT)
            
        Returns:
            Symbol/price pair or None if not found
        """
        # Format symbol
        symbol = symbol.replace('-', '').upper()
        
        # Check if we have this in the live prices cache first
        cached_price = self.get_latest_price(symbol)
        if cached_price:
            logging.info(f"Using cached price for {symbol}: {cached_price}")
            return BinanceTickerPrice(symbol, str(cached_price)).to_dict()
        
        # Otherwise, fetch from API
        try:
            logging.info(f"Fetching price for {symbol} from Binance API")
            response = self.client.ticker_price(symbol=symbol)
            
            # Handle response which could be a list or single dict
            if isinstance(response, list):
                ticker = next((t for t in response if t.get('symbol') == symbol), None)
            else:
                ticker = response
                
            if ticker and ticker.get('price'):
                price = str(ticker.get('price', '0'))  # Ensure price is a string
                # Cache the price
                self.update_price(symbol, float(price), 'binance')
                
                return BinanceTickerPrice(symbol, price).to_dict()
            else:
                logging.warning(f"No price data returned for {symbol}")
                return None
        except ClientError as e:
            logging.error(f"Binance API error for {symbol}: {e}")
            return None
        except Exception as e:
            logging.error(f"Error fetching price for {symbol} from Binance: {e}")
            return None
    
    def get_klines(self, 
                   symbol: str, 
                   interval: str = '5m', 
                   limit: int = 100,
                   startTime: Optional[int] = None,
                   endTime: Optional[int] = None) -> List[List[Any]]:
        """
        Get klines/candlestick data for a symbol
        
        Args:
            symbol: The trading pair symbol (e.g., BTCUSDT)
            interval: Kline interval (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
            limit: Number of klines to retrieve (default: 100, max: 1000)
            startTime: Start time in milliseconds (optional)
            endTime: End time in milliseconds (optional)
            
        Returns:
            List of klines where each kline is a list of values:
            [open_time, open, high, low, close, volume, close_time, quote_volume, 
             trades_count, taker_buy_base_vol, taker_buy_quote_vol, ignore]
        """
        # Format symbol
        formatted_symbol = symbol.replace('-', '').upper()
        
        try:
            # Prepare parameters
            params = {
                'symbol': formatted_symbol,
                'interval': interval,
                'limit': limit
            }
            
            # Add optional parameters if provided
            if startTime is not None:
                params['startTime'] = startTime
            if endTime is not None:
                params['endTime'] = endTime
                
            log_msg = f"Fetching {limit} {interval} klines for {formatted_symbol}"
            if startTime:
                log_msg += f" from {datetime.fromtimestamp(startTime/1000)}"
            if endTime:
                log_msg += f" to {datetime.fromtimestamp(endTime/1000)}"
            logging.info(log_msg)
            
            # Call the Binance API to get klines
            response = self.client.klines(**params)
            
            logging.info(f"Successfully retrieved {len(response)} {interval} klines for {formatted_symbol}")
            return response
            
        except ClientError as e:
            # Handle specific error codes
            error_code = str(e).split(': ')[0] if ': ' in str(e) else 'unknown'
            if '-1003' in error_code:  # Rate limit code
                logging.error(f"API rate limit exceeded while fetching klines: {e}")
                raise ValueError("Binance API rate limit exceeded. Please try again later.")
            elif '-1022' in error_code:  # IP restricted
                logging.error(f"Binance API access restricted while fetching klines: {e}")
                raise ValueError("Binance API access restricted. Please try again later.")
            else:
                logging.error(f"Binance client error while fetching klines: {e}")
                raise ValueError(f"Binance API client error: {e}")
        except ServerError as e:
            logging.error(f"Binance server error while fetching klines: {e}")
            raise ValueError("Binance API server error. Please try again later.")
        except Exception as e:
            logging.error(f"Error fetching klines for {formatted_symbol} from Binance: {e}")
            raise ValueError(f"Failed to fetch klines data from Binance: {e}")
    
    def get_24hr_stats(self, symbol: Optional[str] = None) -> Union[List[Dict[str, Any]], Dict[str, Any], None]:
        """
        Get 24hr ticker statistics for one or all symbols
        
        Args:
            symbol: The trading pair symbol (optional)
            
        Returns:
            24hr statistics for the requested symbol(s)
        """
        try:
            if symbol:
                # Format symbol
                formatted_symbol = symbol.replace('-', '').upper()
                
                logging.info(f"Fetching 24hr stats for {formatted_symbol} from Binance API")
                response = self.client.ticker_24hr(symbol=formatted_symbol)
                
                # For single symbol queries, the response might be a dict instead of list
                if isinstance(response, list):
                    ticker = next((t for t in response if t.get('symbol') == formatted_symbol), None)
                    if not ticker:
                        logging.warning(f"No ticker found for {formatted_symbol}")
                        return None
                else:
                    ticker = response
                
                # The response from Binance is already in the correct format
                return Binance24hrTicker(ticker).to_dict()
            else:
                logging.info("Fetching 24hr stats for all symbols from Binance API")
                response = self.client.ticker_24hr()
                
                results = []
                for ticker in response:
                    results.append(Binance24hrTicker(ticker).to_dict())
                
                return results
                
        except ClientError as e:
            logging.error(f"Binance API error: {e}")
            raise ValueError(f"Binance API error: {e}")
        except ServerError as e:
            logging.error(f"Binance server error: {e}")
            raise ValueError("Binance API server error. Please try again later.")
        except Exception as e:
            logging.error(f"Error fetching 24hr stats from Binance: {e}")
            raise ValueError(f"Failed to fetch 24hr market statistics from Binance: {e}")


# Create a singleton instance for reuse
binance_market_service = BinanceMarketService(False)