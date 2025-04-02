#!/usr/bin/env python3
"""
Simple Binance API connection test with proxy
"""

import os
import sys
import json
import logging
import urllib.parse
from datetime import datetime

try:
    from binance.spot import Spot
    from binance.error import ClientError
except ImportError:
    print("Binance-connector package not found. Please install it with:")
    print("pip install binance-connector")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger()

def load_env_vars():
    """Load environment variables from .env file"""
    env_vars = {}
    try:
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip().strip('"\'')
        return env_vars
    except Exception as e:
        logger.error(f"Error loading .env file: {e}")
        return {}

def create_client(use_proxy=True, use_auth=True):
    """Create a Binance API client"""
    # Get environment variables
    env_vars = load_env_vars()
    
    # Check if proxy is enabled
    proxy_enabled = env_vars.get('USE_PROXY', 'true').lower() in ('true', '1', 'yes')
    if not use_proxy:
        proxy_enabled = False
    
    # API credentials
    api_key = env_vars.get('BINANCE_API_KEY', '')
    api_secret = env_vars.get('BINANCE_SECRET_KEY', '')
    
    # Determine whether to use credentials
    use_credentials = use_auth and api_key and api_secret
    
    # Base URL
    base_url = 'https://api.binance.com'
    
    # Setup proxy configuration if enabled
    proxies = None
    if proxy_enabled:
        proxy_ip = env_vars.get('PROXY_IP', '')
        proxy_port = env_vars.get('PROXY_PORT', '')
        proxy_username = env_vars.get('PROXY_USERNAME', '')
        proxy_password = env_vars.get('PROXY_PASSWORD', '')
        proxy_protocol = env_vars.get('PROXY_PROTOCOL', 'http').lower()
        
        # Validate protocol
        if proxy_protocol not in ('http', 'https', 'socks4', 'socks5'):
            logger.warning(f"Invalid proxy protocol '{proxy_protocol}', defaulting to 'http'")
            proxy_protocol = 'http'
        
        # Create proxy URL with or without authentication
        if proxy_username and proxy_password:
            # URL-encode username and password to handle special characters
            username = urllib.parse.quote_plus(proxy_username)
            password = urllib.parse.quote_plus(proxy_password)
            proxy_url = f"{proxy_protocol}://{username}:{password}@{proxy_ip}:{proxy_port}"
            auth_status = "with authentication"
        else:
            proxy_url = f"{proxy_protocol}://{proxy_ip}:{proxy_port}"
            auth_status = "without authentication"
        
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        logger.info(f"Using {proxy_protocol} proxy connection: {proxy_ip}:{proxy_port} {auth_status}")
    else:
        logger.info("Using direct connection (no proxy)")
    
    # Create params dictionary
    kwargs = {
        "timeout": 30,  # seconds
        "proxies": proxies
    }
    
    # Create client based on auth requirements
    if use_credentials:
        client = Spot(
            base_url=base_url,
            api_key=api_key,
            api_secret=api_secret,
            **kwargs
        )
        logger.info("Created client with API credentials")
    else:
        client = Spot(
            base_url=base_url,
            **kwargs
        )
        logger.info("Created client without API credentials")
    
    return client

def test_ping(client):
    """Test API connectivity with ping"""
    try:
        response = client.ping()
        logger.info("Ping successful: API is reachable")
        return True
    except Exception as e:
        logger.error(f"Ping failed: {e}")
        return False

def test_get_server_time(client):
    """Test getting server time"""
    try:
        response = client.time()
        if response and 'serverTime' in response:
            server_time = datetime.fromtimestamp(response['serverTime']/1000)
            logger.info(f"Server time: {server_time}")
            return True
        else:
            logger.error("Failed to get server time")
            return False
    except Exception as e:
        logger.error(f"Server time request failed: {e}")
        return False

def test_get_price(client, symbol="BTCUSDT"):
    """Test getting asset price"""
    try:
        response = client.ticker_price(symbol=symbol)
        if response and 'price' in response:
            logger.info(f"{symbol} price: {response['price']}")
            return True
        else:
            logger.error(f"Failed to get {symbol} price")
            return False
    except Exception as e:
        logger.error(f"Price request failed: {e}")
        return False

def test_api_key_permissions(client):
    """Test API key permissions (requires authentication)"""
    try:
        response = client.api_key_permissions()
        if response:
            logger.info("API key permissions retrieved successfully")
            # Avoid logging the full permissions data, but show a few items
            for key in ['ipRestrict', 'createTime', 'enableReading', 'enableSpotAndMarginTrading']:
                if key in response:
                    logger.info(f"{key}: {response[key]}")
            return True
        else:
            logger.error("Failed to get API key permissions")
            return False
    except Exception as e:
        logger.error(f"API key permissions request failed: {e}")
        return False

def display_config():
    """Display the current configuration"""
    env_vars = load_env_vars()
    
    # Get proxy settings
    proxy_enabled = env_vars.get('USE_PROXY', 'true').lower() in ('true', '1', 'yes')
    proxy_protocol = env_vars.get('PROXY_PROTOCOL', 'http')
    proxy_ip = env_vars.get('PROXY_IP', '')
    proxy_port = env_vars.get('PROXY_PORT', '')
    proxy_username = env_vars.get('PROXY_USERNAME', '')
    proxy_password = '*****' if env_vars.get('PROXY_PASSWORD', '') else ''
    fallback_to_direct = env_vars.get('FALLBACK_TO_DIRECT', 'false').lower() in ('true', '1', 'yes')
    
    # Get API settings
    api_key = env_vars.get('BINANCE_API_KEY', '')
    api_key_display = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else '(not set)'
    api_secret = env_vars.get('BINANCE_SECRET_KEY', '')
    api_secret_display = '(set)' if api_secret else '(not set)'
    
    # Display
    logger.info("=== Configuration ===")
    logger.info(f"Proxy enabled:      {proxy_enabled}")
    if proxy_enabled:
        logger.info(f"Proxy protocol:     {proxy_protocol}")
        logger.info(f"Proxy address:      {proxy_ip}:{proxy_port}")
        logger.info(f"Proxy auth:         {'Enabled' if proxy_username and proxy_password else 'Disabled'}")
        logger.info(f"Fallback to direct: {fallback_to_direct}")
    logger.info(f"API key:           {api_key_display}")
    logger.info(f"API secret:        {api_secret_display}")
    logger.info("")

def main():
    """Run all tests"""
    logger.info("=== Binance API Connection Test ===")
    
    # Display configuration
    display_config()
    
    # Test with proxy first
    logger.info("--- Testing with proxy ---")
    client_with_proxy = create_client(use_proxy=True, use_auth=False)
    
    ping_result = test_ping(client_with_proxy)
    if ping_result:
        get_time_result = test_get_server_time(client_with_proxy)
        get_price_result = test_get_price(client_with_proxy)
        proxy_success = ping_result and get_time_result and get_price_result
    else:
        proxy_success = False
    
    # Test without proxy for comparison
    logger.info("\n--- Testing without proxy ---")
    client_no_proxy = create_client(use_proxy=False, use_auth=False)
    
    direct_ping_result = test_ping(client_no_proxy)
    if direct_ping_result:
        direct_time_result = test_get_server_time(client_no_proxy)
        direct_price_result = test_get_price(client_no_proxy)
        direct_success = direct_ping_result and direct_time_result and direct_price_result
    else:
        direct_success = False
    
    # Test authenticated endpoint if API keys exist
    logger.info("\n--- Testing authenticated endpoint ---")
    client_auth = create_client(use_proxy=True, use_auth=True)
    
    # Check if API keys are configured
    env_vars = load_env_vars()
    api_key = env_vars.get('BINANCE_API_KEY', '')
    api_secret = env_vars.get('BINANCE_SECRET_KEY', '')
    
    if api_key and api_secret:
        auth_result = test_api_key_permissions(client_auth)
    else:
        logger.warning("Skipping authenticated test - no API credentials configured")
        auth_result = None
    
    # Display results
    logger.info("\n=== Test Results ===")
    logger.info(f"Proxy connection:  {'SUCCESS' if proxy_success else 'FAILED'}")
    logger.info(f"Direct connection: {'SUCCESS' if direct_success else 'FAILED'}")
    
    if auth_result is not None:
        logger.info(f"Authenticated API: {'SUCCESS' if auth_result else 'FAILED'}")
    else:
        logger.info("Authenticated API: SKIPPED (no credentials)")
    
    # Summary
    if proxy_success:
        logger.info("\nSUCCESS: Proxy configuration is working correctly!")
    elif direct_success:
        logger.info("\nMIXED RESULTS: Direct connection works but proxy does not.")
        logger.info("Please check your proxy settings in .env file.")
    else:
        logger.info("\nFAILED: Both proxy and direct connections failed.")
        logger.info("Please check your internet connection and Binance API status.")

if __name__ == "__main__":
    main()