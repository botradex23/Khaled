#!/usr/bin/env python3
"""
Binance Market Data Test Script

This script demonstrates how to retrieve market data from Binance API using the properly
configured proxy with URL-encoded credentials.

It retrieves the following data types from Binance:
1. Current prices for major cryptocurrencies
2. 24-hour ticker statistics
3. Exchange information for symbols

The script uses the official Binance SDK with our proxy configuration.
"""

import os
import sys
import json
import urllib.parse
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('binance_data_test')

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

def load_env_variables():
    """Load environment variables from .env file"""
    env_vars = {}
    try:
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
        return env_vars
    except Exception as e:
        logger.error(f"Error loading .env file: {e}")
        return {}

def create_client_with_proxy():
    """Create a Binance client with proxy configuration"""
    env_vars = load_env_variables()
    
    # Check if proxy is enabled
    use_proxy = env_vars.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    
    if not use_proxy:
        logger.info("Proxy is disabled. Using direct connection.")
        return Spot()
    
    # Get proxy settings
    proxy_ip = env_vars.get('PROXY_IP', '')
    proxy_port = env_vars.get('PROXY_PORT', '')
    proxy_username = env_vars.get('PROXY_USERNAME', '')
    proxy_password = env_vars.get('PROXY_PASSWORD', '')
    
    # Check if proxy settings are complete
    if not (proxy_ip and proxy_port):
        logger.warning("Proxy is enabled but settings are incomplete. Using direct connection.")
        return Spot()
    
    # Create proxy URL with URL-encoded credentials
    if proxy_username and proxy_password:
        username = urllib.parse.quote_plus(proxy_username)
        password = urllib.parse.quote_plus(proxy_password)
        proxy_url = f"http://{username}:{password}@{proxy_ip}:{proxy_port}"
        logger.info(f"Using proxy: {proxy_ip}:{proxy_port} with authentication")
    else:
        proxy_url = f"http://{proxy_ip}:{proxy_port}"
        logger.info(f"Using proxy: {proxy_ip}:{proxy_port} without authentication")
    
    # Create proxies dictionary
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    # Create Binance client with proxy
    return Spot(proxies=proxies, timeout=30)

def get_current_prices(client, symbols=None):
    """Get current prices for specified symbols or top cryptocurrencies"""
    if not symbols:
        symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 
                  'DOGEUSDT', 'MATICUSDT', 'SOLUSDT', 'DOTUSDT', 'LTCUSDT']
    
    logger.info(f"Fetching current prices for {len(symbols)} symbols...")
    
    prices = {}
    for symbol in symbols:
        try:
            price_data = client.ticker_price(symbol=symbol)
            if 'price' in price_data:
                prices[symbol] = float(price_data['price'])
        except Exception as e:
            logger.error(f"Error fetching price for {symbol}: {e}")
    
    return prices

def get_24hr_stats(client, symbols=None):
    """Get 24-hour statistics for specified symbols"""
    if not symbols:
        symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT']
    
    logger.info(f"Fetching 24-hour statistics for {len(symbols)} symbols...")
    
    stats = {}
    for symbol in symbols:
        try:
            ticker_data = client.ticker_24hr(symbol=symbol)
            stats[symbol] = {
                'price': float(ticker_data['lastPrice']),
                'change_percent': float(ticker_data['priceChangePercent']),
                'high': float(ticker_data['highPrice']),
                'low': float(ticker_data['lowPrice']),
                'volume': float(ticker_data['volume'])
            }
        except Exception as e:
            logger.error(f"Error fetching 24hr stats for {symbol}: {e}")
    
    return stats

def get_exchange_info(client, symbols=None):
    """Get exchange information for specified symbols"""
    logger.info("Fetching exchange information...")
    
    try:
        if symbols:
            # Format for multiple symbols
            params = {'symbols': json.dumps(symbols)}
            exchange_info = client.exchange_info(**params)
        else:
            # Get all symbols
            exchange_info = client.exchange_info()
        
        # Count trading pairs
        trading_pairs = [symbol for symbol in exchange_info['symbols'] 
                         if symbol['status'] == 'TRADING']
        
        logger.info(f"Found {len(trading_pairs)} active trading pairs")
        
        # Return a sample of symbols
        sample_size = min(5, len(trading_pairs))
        sample_symbols = trading_pairs[:sample_size]
        
        return {
            'total_symbols': len(trading_pairs),
            'sample_symbols': [symbol['symbol'] for symbol in sample_symbols]
        }
        
    except Exception as e:
        logger.error(f"Error fetching exchange info: {e}")
        return None

def main():
    """Main function"""
    logger.info("=== Binance Market Data Test ===")
    
    try:
        # Create client with proxy
        client = create_client_with_proxy()
        
        # Test connection with ping
        logger.info("Testing connection with ping...")
        ping_result = client.ping()
        logger.info("Ping successful!")
        
        # Get server time
        logger.info("Fetching server time...")
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"Server time: {server_time}")
        
        # Get current prices
        prices = get_current_prices(client)
        logger.info("\n=== Current Prices ===")
        for symbol, price in prices.items():
            logger.info(f"{symbol}: ${price:,.2f}")
        
        # Get 24-hour stats
        stats = get_24hr_stats(client)
        logger.info("\n=== 24-Hour Statistics ===")
        for symbol, data in stats.items():
            logger.info(f"{symbol}: ${data['price']:,.2f} ({data['change_percent']:+.2f}%) Volume: {data['volume']:,.1f}")
        
        # Get exchange info
        exchange_info = get_exchange_info(client)
        if exchange_info:
            logger.info("\n=== Exchange Information ===")
            logger.info(f"Total active trading pairs: {exchange_info['total_symbols']}")
            logger.info(f"Sample symbols: {', '.join(exchange_info['sample_symbols'])}")
        
        logger.info("\n=== Test Completed Successfully ===")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error("Test failed")

if __name__ == "__main__":
    main()