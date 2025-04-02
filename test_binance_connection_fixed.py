#!/usr/bin/env python3
"""
Binance Connection Test with Improved Proxy Authentication
"""

import os
import sys
import logging
import urllib.parse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

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

def test_binance_connection():
    """Test connection to Binance API"""
    # Load environment variables
    env_vars = load_env_variables()
    
    # API keys
    api_key = env_vars.get('BINANCE_API_KEY', os.environ.get('BINANCE_API_KEY', ''))
    api_secret = env_vars.get('BINANCE_SECRET_KEY', os.environ.get('BINANCE_SECRET_KEY', ''))
    
    if api_key and api_secret:
        logger.info("Using Binance API with credentials")
    else:
        logger.info("Using Binance API without credentials (public endpoints only)")
    
    # Proxy settings
    use_proxy = env_vars.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    proxy_ip = env_vars.get('PROXY_IP', '')
    proxy_port = env_vars.get('PROXY_PORT', '')
    proxy_username = env_vars.get('PROXY_USERNAME', '')
    proxy_password = env_vars.get('PROXY_PASSWORD', '')
    
    proxies = None
    if use_proxy and proxy_ip and proxy_port:
        # Ensure proper URL encoding for proxy authentication
        if proxy_username and proxy_password:
            # Try with URL encoding
            username = urllib.parse.quote_plus(proxy_username)
            password = urllib.parse.quote_plus(proxy_password)
            proxy_url = f"http://{username}:{password}@{proxy_ip}:{proxy_port}"
            logger.info(f"Using proxy connection to Binance API via {proxy_ip}:{proxy_port} with authentication (URL-encoded)")
        else:
            proxy_url = f"http://{proxy_ip}:{proxy_port}"
            logger.info(f"Using proxy connection to Binance API via {proxy_ip}:{proxy_port} without authentication")
        
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
    else:
        logger.info("Using direct connection to Binance API (no proxy)")
    
    # Create params dictionary
    kwargs = {
        "timeout": 10,  # seconds
    }
    
    if proxies:
        kwargs["proxies"] = proxies
    
    # Create client
    try:
        # Test with credentials if available
        if api_key and api_secret:
            client = Spot(api_key=api_key, api_secret=api_secret, **kwargs)
        else:
            client = Spot(**kwargs)
        
        # Basic ping test
        logger.info("Testing API connectivity (ping)...")
        result = client.ping()
        logger.info("Ping successful!")
        
        # Get server time
        logger.info("Testing server time endpoint...")
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"Server time: {server_time}")
        
        # Get BTC price
        logger.info("Testing ticker price endpoint...")
        price_result = client.ticker_price(symbol="BTCUSDT")
        btc_price = float(price_result['price'])
        logger.info(f"BTCUSDT price: ${btc_price:,.2f}")
        
        # Test authenticated endpoint if credentials are available
        if api_key and api_secret:
            try:
                logger.info("Testing authenticated endpoint (API permissions)...")
                permissions = client.api_key_permissions()
                logger.info("Successfully retrieved API key permissions")
                for key in ['enableSpotAndMarginTrading', 'enableWithdrawals', 'enableInternalTransfer']:
                    if key in permissions:
                        logger.info(f"Permission {key}: {permissions[key]}")
            except Exception as e:
                logger.error(f"Authentication test failed: {e}")
        
        logger.info("Binance connection test completed successfully!")
        
    except ClientError as e:
        logger.error(f"Binance client error: {e}")
        logger.error("Binance connection test failed.")
        
    except ServerError as e:
        logger.error(f"Binance server error: {e}")
        logger.error("Binance connection test failed.")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        logger.error("Binance connection test failed.")

if __name__ == "__main__":
    test_binance_connection()