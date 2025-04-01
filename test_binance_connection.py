"""
Test Binance Connection

This script tests the connection to Binance API using the official binance-connector-python SDK.
"""

import os
import sys
import logging
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

# Try to import Binance Spot
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    from binance.lib.utils import config_logging
    logger.info("Successfully imported Binance SDK")
except ImportError as e:
    logger.error(f"Failed to import Binance SDK: {e}")
    logger.info("Make sure binance-connector-python is installed by running: pip install binance-connector")
    sys.exit(1)

def test_binance_connection():
    """Test connection to Binance API using the official SDK"""
    
    # Get Binance API credentials from environment variables
    api_key = os.environ.get('BINANCE_API_KEY', '')
    api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
    
    # Log whether we're using API keys
    if api_key and api_secret:
        logger.info("Using Binance API with credentials")
    else:
        logger.info("Using Binance API without credentials (public access only)")
    
    # Set up proxy if needed
    use_proxy = os.environ.get('USE_PROXY', 'True').lower() in ('true', '1', 't')
    proxy_username = os.environ.get('PROXY_USERNAME', 'ahjqspco')
    proxy_password = os.environ.get('PROXY_PASSWORD', 'dzx3r1prpz9k')
    proxy_ip = os.environ.get('PROXY_IP', '185.199.228.220')
    proxy_port = os.environ.get('PROXY_PORT', '7300')
    
    proxies = None
    if use_proxy:
        proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_ip}:{proxy_port}"
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        logger.info(f"Using proxy connection to Binance API via {proxy_ip}:{proxy_port}")
    
    # Create Binance client
    try:
        # Initialize the Binance client with proxy settings
        if proxies:
            spot_client = Spot(
                api_key=api_key,
                api_secret=api_secret,
                proxies=proxies
            )
        else:
            spot_client = Spot(
                api_key=api_key,
                api_secret=api_secret
            )
            
        # Basic ping test
        ping_result = spot_client.ping()
        logger.info(f"Ping test succeeded: {ping_result}")
        
        # Get server time
        server_time = spot_client.time()
        logger.info(f"Server time: {server_time}")
        
        # Get ticker price for BTC
        btc_price = spot_client.ticker_price("BTCUSDT")
        logger.info(f"BTC price: {btc_price}")
        
        # Get all prices (limited to avoid too much output)
        all_prices = spot_client.ticker_price()
        logger.info(f"Got {len(all_prices)} prices from Binance")
        logger.info(f"First few prices: {all_prices[:3]}")
        
        # Get 24hr stats for BTC
        btc_24hr = spot_client.ticker_24hr("BTCUSDT")
        logger.info(f"BTC 24hr stats: {btc_24hr}")
        
        return True
        
    except ClientError as e:
        logger.error(f"Binance Client Error: {e}")
        return False
    except ServerError as e:
        logger.error(f"Binance Server Error: {e}")
        return False
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return False

if __name__ == "__main__":
    success = test_binance_connection()
    if success:
        logger.info("Binance connection test completed successfully.")
        sys.exit(0)
    else:
        logger.error("Binance connection test failed.")
        sys.exit(1)