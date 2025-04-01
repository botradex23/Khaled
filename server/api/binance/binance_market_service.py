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
    
    class ClientError(Exception): pass
    class ServerError(Exception): pass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')

# Base URLs for Binance API
BINANCE_BASE_URL = 'https://api.binance.com'
BINANCE_TEST_URL = 'https://testnet.binancefuture.com'

# Proxy configuration for bypassing geo-restrictions
USE_PROXY = True  # Enable proxy to overcome geographical restrictions
PROXY_USERNAME = "ahjqspco"
PROXY_PASSWORD = "dzx3r1prpz9k"
PROXY_IP = os.environ.get('PROXY_IP', '185.199.228.220')  # Working proxy IP from tests
PROXY_PORT = os.environ.get('PROXY_PORT', '7300')         # Working proxy port

class BinanceTickerPrice:
    """Class representing a ticker price from Binance"""
    def __init__(self, symbol: str, price: str):
        self.symbol = symbol
        self.price = price
        
    def to_dict(self) -> Dict[str, str]:
        return {
            'symbol': self.symbol,
            'price': self.price
        }

class Binance24hrTicker:
    """Class representing 24hr ticker statistics from Binance"""
    def __init__(self, data: Dict[str, Any]):
        self.symbol = data.get('symbol', '')
        self.priceChange = data.get('priceChange', '0')
        self.priceChangePercent = data.get('priceChangePercent', '0')
        self.weightedAvgPrice = data.get('weightedAvgPrice', '0')
        self.prevClosePrice = data.get('prevClosePrice', '0')
        self.lastPrice = data.get('lastPrice', '0')
        self.lastQty = data.get('lastQty', '0')
        self.bidPrice = data.get('bidPrice', '0')
        self.bidQty = data.get('bidQty', '0')
        self.askPrice = data.get('askPrice', '0')
        self.askQty = data.get('askQty', '0')
        self.openPrice = data.get('openPrice', '0')
        self.highPrice = data.get('highPrice', '0')
        self.lowPrice = data.get('lowPrice', '0')
        self.volume = data.get('volume', '0')
        self.quoteVolume = data.get('quoteVolume', '0')
        self.openTime = data.get('openTime', 0)
        self.closeTime = data.get('closeTime', 0)
        self.firstId = data.get('firstId', 0)
        self.lastId = data.get('lastId', 0)
        self.count = data.get('count', 0)
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'symbol': self.symbol,
            'priceChange': self.priceChange,
            'priceChangePercent': self.priceChangePercent,
            'weightedAvgPrice': self.weightedAvgPrice,
            'prevClosePrice': self.prevClosePrice,
            'lastPrice': self.lastPrice,
            'lastQty': self.lastQty,
            'bidPrice': self.bidPrice,
            'bidQty': self.bidQty,
            'askPrice': self.askPrice,
            'askQty': self.askQty,
            'openPrice': self.openPrice,
            'highPrice': self.highPrice,
            'lowPrice': self.lowPrice,
            'volume': self.volume,
            'quoteVolume': self.quoteVolume,
            'openTime': self.openTime,
            'closeTime': self.closeTime,
            'firstId': self.firstId,
            'lastId': self.lastId,
            'count': self.count
        }

class LivePriceUpdate:
    """Class representing a real-time price update"""
    def __init__(self, symbol: str, price: float, source: str = 'binance'):
        self.symbol = symbol
        self.price = price
        self.timestamp = int(time.time() * 1000)
        self.source = source
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'symbol': self.symbol,
            'price': self.price,
            'timestamp': self.timestamp,
            'source': self.source
        }

class BinanceMarketPriceService:
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
        self.base_url = BINANCE_TEST_URL if use_testnet else BINANCE_BASE_URL
        self.client = self._create_client()
        self.live_prices = {}  # Cache for live prices
        self._last_simulated_prices = {}  # For when real data isn't available
        
        logging.info(f"Binance Market Price Service initialized with base URL: {self.base_url}")
    
    def _create_client(self) -> Spot:
        """
        Create a Binance API client using the official binance-connector SDK
        
        Returns:
            Configured Binance Spot client
        """
        api_key = os.environ.get('BINANCE_API_KEY', '')
        api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
        
        # Setup proxy configuration if enabled
        proxies = {}
        if USE_PROXY:
            proxy_url = f"http://{PROXY_USERNAME}:{PROXY_PASSWORD}@{PROXY_IP}:{PROXY_PORT}"
            proxies = {
                "http": proxy_url,
                "https": proxy_url
            }
            logging.info(f"Using proxy connection to Binance API via {PROXY_IP}:{PROXY_PORT}")
        
        try:
            # Use the official base URL
            base_url = self.base_url
            
            # Create params dictionary
            kwargs = {
                "timeout": 30,  # seconds
                "proxies": proxies if USE_PROXY else None
            }
            
            # Create client based on auth
            if api_key and api_secret:
                client = Spot(
                    base_url=base_url,
                    api_key=api_key,
                    api_secret=api_secret,
                    **kwargs
                )
                logging.info("Connected to Binance API with credentials")
            else:
                client = Spot(
                    base_url=base_url,
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
        
        # Update simulated prices cache too
        if symbol in self._last_simulated_prices:
            self._last_simulated_prices[symbol] = str(price)
    
    def get_latest_price(self, symbol: str) -> Optional[float]:
        """
        Get the latest cached price for a symbol
        
        Args:
            symbol: The trading pair symbol (e.g., BTCUSDT)
            
        Returns:
            The latest price or None if not available
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
    
    def get_simulated_prices(self) -> Dict[str, float]:
        """
        This method no longer provides simulated prices but throws an error instead
        
        Returns:
            Never returns normally
            
        Raises:
            ValueError: Always raises an error indicating that real data is required
        """
        raise ValueError("Market data unavailable. Real API data is required. Please check your API keys and connection.")
    
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
    
    def _get_simulated_ticker_prices(self) -> List[Dict[str, str]]:
        """
        Generate simulated ticker prices for testing or when API is unavailable
        
        Returns:
            List of simulated ticker prices
        """
        # Base prices
        base_prices = {
            'BTCUSDT': '71530.25',
            'ETHUSDT': '3946.12',
            'BNBUSDT': '605.87',
            'SOLUSDT': '185.23',
            'XRPUSDT': '0.6215',
            'ADAUSDT': '0.5320',
            'DOGEUSDT': '0.1823',
            'DOTUSDT': '8.56',
            'MATICUSDT': '0.8935',
            'AVAXUSDT': '41.28',
            'LINKUSDT': '17.89',
            'UNIUSDT': '12.35',
            'SHIBUSDT': '0.00002654',
            'LTCUSDT': '93.21',
            'ATOMUSDT': '11.23',
            'NEARUSDT': '7.15',
            'BCHUSDT': '523.75',
            'FILUSDT': '8.93',
            'TRXUSDT': '0.1426',
            'XLMUSDT': '0.1392'
        }
        
        # Initialize last simulated prices if not set
        if not self._last_simulated_prices:
            self._last_simulated_prices = dict(base_prices)
        
        # Generate new prices with slight variations
        import random
        import math
        
        minute_of_day = math.floor(time.time() / 60) % 1440
        market_trend = math.sin(minute_of_day / 240 * 3.14159) * 0.02
        
        results = []
        for symbol, base_price in base_prices.items():
            last_price = self._last_simulated_prices.get(symbol, base_price)
            base_price_value = float(base_price)
            last_price_value = float(last_price)
            
            # Random factor with market trend
            random_factor = 0.995 + random.random() * 0.01 + market_trend
            
            # More volatility for certain coins
            volatility = 1.5 if symbol in ['SOLUSDT', 'DOGEUSDT', 'SHIBUSDT'] else 0.8 if symbol in ['BTCUSDT', 'ETHUSDT'] else 1.0
            
            # Calculate new price
            new_price = last_price_value * (1 + (random_factor - 1) * volatility)
            
            # Periodically revert towards base price to prevent drift
            revert_factor = 0.1 if minute_of_day % 30 == 0 else 0.0
            final_price = new_price * (1 - revert_factor) + base_price_value * revert_factor
            
            # Format based on price magnitude
            if symbol == 'SHIBUSDT':
                precision = 8
            elif final_price < 0.1:
                precision = 4
            elif final_price < 10:
                precision = 2
            else:
                precision = 2
                
            adjusted_price = f"{final_price:.{precision}f}"
            
            # Store for next time
            self._last_simulated_prices[symbol] = adjusted_price
            
            # Add to results
            results.append(BinanceTickerPrice(symbol, adjusted_price).to_dict())
        
        return results
    
    def _get_simulated_24hr_stats(self, symbol: str) -> Dict[str, Any]:
        """
        Generate simulated 24hr statistics for a symbol
        
        Args:
            symbol: The trading pair symbol
            
        Returns:
            Simulated 24hr statistics
        """
        import random
        import time
        from datetime import datetime
        
        # Format symbol
        symbol = symbol.replace('-', '').upper()
        
        # Get current simulated price
        simulated_prices = self._get_simulated_ticker_prices()
        ticker_price = next((p for p in simulated_prices if p['symbol'] == symbol), None)
        price = float(ticker_price['price']) if ticker_price else 1000.0
        
        # Generate simulated 24hr data
        now = int(time.time() * 1000)
        
        # Create a somewhat realistic price change (-5% to +5%)
        price_change_pct = (random.random() * 10) - 5
        price_change = price * (price_change_pct / 100)
        
        # Previous price based on the change
        prev_price = price - price_change
        
        # High and low prices within reasonable range
        high_price = price * (1 + (random.random() * 0.03))
        low_price = prev_price * (1 - (random.random() * 0.03))
        
        # Ensure high >= price >= low
        high_price = max(high_price, price)
        low_price = min(low_price, prev_price)
        
        # Generate volume based on price
        base_volume = price * 1000  # Base volume increases with price
        volume = base_volume * (0.5 + random.random())
        
        # Create 24hr ticker
        ticker_data = {
            'symbol': symbol,
            'priceChange': str(price_change),
            'priceChangePercent': str(price_change_pct),
            'weightedAvgPrice': str((high_price + low_price + price) / 3),
            'prevClosePrice': str(prev_price),
            'lastPrice': str(price),
            'lastQty': str(random.randint(1, 100) / 10),
            'bidPrice': str(price * 0.999),
            'bidQty': str(random.randint(1, 50) / 10),
            'askPrice': str(price * 1.001),
            'askQty': str(random.randint(1, 50) / 10),
            'openPrice': str(prev_price),
            'highPrice': str(high_price),
            'lowPrice': str(low_price),
            'volume': str(volume / price),  # Base currency volume
            'quoteVolume': str(volume),     # Quote currency volume
            'openTime': now - 86400000,     # 24 hours ago
            'closeTime': now,
            'firstId': 1000000,
            'lastId': 1000000 + random.randint(5000, 15000),
            'count': random.randint(5000, 15000)
        }
        
        return ticker_data

# Singleton instance of the service
binance_market_service = BinanceMarketPriceService(False)

# CLI interface for testing
if __name__ == "__main__":
    import sys
    import argparse
    
    parser = argparse.ArgumentParser(description='Binance Market Price Service')
    parser.add_argument('--action', type=str, required=True, 
                        choices=['all-prices', 'symbol-price', '24hr-stats', 'simulated-prices'],
                        help='Action to perform')
    parser.add_argument('--symbol', type=str, help='Symbol for symbol-specific actions')
    
    args = parser.parse_args()
    
    try:
        if args.action == 'all-prices':
            result = binance_market_service.get_all_prices()
            print(json.dumps(result, indent=2))
        
        elif args.action == 'symbol-price':
            if not args.symbol:
                print("Error: --symbol is required for this action")
                sys.exit(1)
            
            result = binance_market_service.get_symbol_price(args.symbol)
            print(json.dumps(result, indent=2))
        
        elif args.action == '24hr-stats':
            result = binance_market_service.get_24hr_stats(args.symbol)
            print(json.dumps(result, indent=2))
            
        elif args.action == 'simulated-prices':
            result = binance_market_service.get_simulated_prices()
            print(json.dumps(result, indent=2))
    
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)