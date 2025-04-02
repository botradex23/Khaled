#!/usr/bin/env python3
"""
Direct Binance API Test

This script tests direct API connectivity to Binance using the updated proxy settings.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dotenv import load_dotenv
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('direct_api_test')

# Try to import Binance SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    BINANCE_SDK_AVAILABLE = True
    logger.info("Binance SDK imported successfully")
except ImportError:
    logger.error("Binance SDK not found. Install with: pip install binance-connector")
    BINANCE_SDK_AVAILABLE = False

def load_environment():
    """Load environment variables from .env file"""
    load_dotenv()
    env_vars = {}

    # Proxy settings
    env_vars['PROXY_IP'] = os.getenv('PROXY_IP', '')
    env_vars['PROXY_PORT'] = os.getenv('PROXY_PORT', '')
    env_vars['PROXY_USERNAME'] = os.getenv('PROXY_USERNAME', '')
    env_vars['PROXY_PASSWORD'] = os.getenv('PROXY_PASSWORD', '')
    env_vars['USE_PROXY'] = os.getenv('USE_PROXY', 'false').lower() == 'true'
    env_vars['PROXY_PROTOCOL'] = os.getenv('PROXY_PROTOCOL', 'http')
    env_vars['PROXY_ENCODING_METHOD'] = os.getenv('PROXY_ENCODING_METHOD', 'quote_plus')
    
    # API keys
    env_vars['BINANCE_API_KEY'] = os.getenv('BINANCE_API_KEY', '')
    env_vars['BINANCE_SECRET_KEY'] = os.getenv('BINANCE_SECRET_KEY', '')
    env_vars['USE_TESTNET'] = os.getenv('USE_TESTNET', 'true').lower() == 'true'

    return env_vars

def create_proxy_url(env_vars):
    """Create proxy URL from environment variables"""
    if not env_vars['USE_PROXY']:
        return None
    
    # Get proxy settings
    proxy_ip = env_vars['PROXY_IP']
    proxy_port = env_vars['PROXY_PORT']
    proxy_username = env_vars['PROXY_USERNAME']
    proxy_password = env_vars['PROXY_PASSWORD']
    protocol = env_vars['PROXY_PROTOCOL']
    encoding_method = env_vars['PROXY_ENCODING_METHOD']
    
    # Encode username and password based on method
    if encoding_method == 'none':
        username = proxy_username
        password = proxy_password
    elif encoding_method == 'quote':
        username = urllib.parse.quote(proxy_username)
        password = urllib.parse.quote(proxy_password)
    elif encoding_method == 'quote_plus':
        username = urllib.parse.quote_plus(proxy_username)
        password = urllib.parse.quote_plus(proxy_password)
    else:
        username = proxy_username
        password = proxy_password
    
    # Create proxy URL
    proxy_url = f"{protocol}://{username}:{password}@{proxy_ip}:{proxy_port}"
    logger.info(f"Using proxy: {protocol}://{username}:****@{proxy_ip}:{proxy_port}")
    
    return {
        "http": proxy_url,
        "https": proxy_url
    }

def test_binance_server_time(client):
    """Test Binance server time API endpoint"""
    logger.info("Testing Binance server time...")
    try:
        start_time = time.time()
        response = client.time()
        elapsed = time.time() - start_time
        logger.info(f"Server time: {response['serverTime']}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error getting server time: {e}")
        return False

def test_binance_ping(client):
    """Test Binance ping API endpoint"""
    logger.info("Testing Binance ping...")
    try:
        start_time = time.time()
        response = client.ping()
        elapsed = time.time() - start_time
        logger.info(f"Ping response: {response}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error pinging Binance: {e}")
        return False

def test_binance_ticker(client, symbol="BTCUSDT"):
    """Test Binance ticker API endpoint"""
    logger.info(f"Testing Binance ticker for {symbol}...")
    try:
        start_time = time.time()
        response = client.ticker_price(symbol=symbol)
        elapsed = time.time() - start_time
        logger.info(f"Ticker price: {response}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error getting ticker: {e}")
        return False

def test_binance_klines(client, symbol="BTCUSDT", interval="1h", limit=10):
    """Test Binance klines API endpoint"""
    logger.info(f"Testing Binance klines for {symbol} ({interval})...")
    try:
        start_time = time.time()
        response = client.klines(symbol=symbol, interval=interval, limit=limit)
        elapsed = time.time() - start_time
        logger.info(f"Retrieved {len(response)} klines")
        # Print the first kline for verification
        if response:
            first_kline = response[0]
            logger.info(f"First kline: Open time: {datetime.fromtimestamp(first_kline[0]/1000)}, "
                      f"Open: {first_kline[1]}, High: {first_kline[2]}, Low: {first_kline[3]}, "
                      f"Close: {first_kline[4]}, Volume: {first_kline[5]}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error getting klines: {e}")
        return False

def test_binance_exchange_info(client):
    """Test Binance exchange info API endpoint"""
    logger.info("Testing Binance exchange info...")
    try:
        start_time = time.time()
        response = client.exchange_info()
        elapsed = time.time() - start_time
        logger.info(f"Exchange info contains {len(response['symbols'])} symbols")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except Exception as e:
        logger.error(f"Error getting exchange info: {e}")
        return False

def test_binance_account_info(client):
    """Test Binance account info API endpoint (requires API key with permissions)"""
    logger.info("Testing Binance account info...")
    try:
        start_time = time.time()
        response = client.account()
        elapsed = time.time() - start_time
        logger.info(f"Account contains {len(response['balances'])} balances")
        # Print a few balances for verification
        non_zero_balances = [b for b in response['balances'] if float(b['free']) > 0 or float(b['locked']) > 0]
        if non_zero_balances:
            logger.info("Non-zero balances:")
            for balance in non_zero_balances[:5]:  # Show up to 5 non-zero balances
                logger.info(f"  {balance['asset']}: Free: {balance['free']}, Locked: {balance['locked']}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except ClientError as e:
        error_code = getattr(e, 'error_code', None)
        if error_code == -2015:  # Invalid API-key, IP, or permissions for action
            logger.warning("Account info failed due to API key permissions or IP restrictions")
        else:
            logger.error(f"Client error getting account info: {e}")
        return False
    except Exception as e:
        logger.error(f"Error getting account info: {e}")
        return False

def test_binance_open_orders(client):
    """Test Binance open orders API endpoint (requires API key with permissions)"""
    logger.info("Testing Binance open orders...")
    try:
        start_time = time.time()
        response = client.get_open_orders()
        elapsed = time.time() - start_time
        logger.info(f"Found {len(response)} open orders")
        if response:
            logger.info("Open orders:")
            for order in response[:5]:  # Show up to 5 open orders
                logger.info(f"  Symbol: {order['symbol']}, Side: {order['side']}, "
                          f"Type: {order['type']}, Quantity: {order['origQty']}")
        logger.info(f"Response received in {elapsed:.3f} seconds")
        return True
    except ClientError as e:
        error_code = getattr(e, 'error_code', None)
        if error_code == -2015:  # Invalid API-key, IP, or permissions for action
            logger.warning("Open orders failed due to API key permissions or IP restrictions")
        else:
            logger.error(f"Client error getting open orders: {e}")
        return False
    except Exception as e:
        logger.error(f"Error getting open orders: {e}")
        return False

def main():
    """Main function to test Binance API connectivity"""
    if not BINANCE_SDK_AVAILABLE:
        logger.error("Binance SDK not available. Exiting...")
        return 1
    
    # Load environment variables
    env_vars = load_environment()
    
    # Get API key and secret
    api_key = env_vars['BINANCE_API_KEY']
    api_secret = env_vars['BINANCE_SECRET_KEY']
    use_testnet = env_vars['USE_TESTNET']
    
    # Determine base URL
    base_url = "https://testnet.binance.vision" if use_testnet else "https://api.binance.com"
    logger.info(f"Using {'testnet' if use_testnet else 'production'} Binance API: {base_url}")
    
    # Test without proxy first
    logger.info("=== TESTING DIRECT CONNECTION (NO PROXY) ===")
    
    # Create Binance client without proxy
    try:
        client = Spot(
            base_url=base_url,
            api_key=api_key,
            api_secret=api_secret,
            timeout=10
        )
        logger.info("Created Binance client without proxy")
    except Exception as e:
        logger.error(f"Error creating Binance client: {e}")
        return 1
    
    # Run tests
    tests = [
        ("Ping", test_binance_ping),
        ("Server Time", test_binance_server_time),
        ("Ticker", test_binance_ticker),
        ("Klines", test_binance_klines),
        ("Exchange Info", test_binance_exchange_info)
    ]
    
    # Add tests that require API key with permissions if available
    if api_key and api_secret:
        tests.extend([
            ("Account Info", test_binance_account_info),
            ("Open Orders", test_binance_open_orders)
        ])
    
    # Run tests
    results = {}
    success_count = 0
    
    for test_name, test_func in tests:
        logger.info(f"\n{'=' * 50}\nRunning test: {test_name}\n{'=' * 50}")
        success = test_func(client)
        results[test_name] = "Success" if success else "Failure"
        if success:
            success_count += 1
    
    # Print summary
    logger.info("\n\n" + "=" * 60)
    logger.info(f"TEST SUMMARY: {success_count}/{len(tests)} tests passed")
    logger.info("=" * 60)
    
    for test_name, result in results.items():
        logger.info(f"{test_name}: {result}")
    
    logger.info("=" * 60)
    
    # Return success or failure
    return 0 if success_count == len(tests) else 1

if __name__ == "__main__":
    sys.exit(main())