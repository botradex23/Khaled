#!/usr/bin/env python3
"""
Update Proxy Settings Script

This script updates proxy settings in the .env file and 
tests the connection to Binance API with the new settings.

It ensures properly encoded proxy authentication credentials are used
for all Binance API connections.
"""

import os
import sys
import time
import logging
import urllib.parse
from urllib.parse import quote_plus
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('proxy_updater')

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

def update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password, use_proxy=True, fallback_to_direct=True):
    """
    Update proxy settings in .env file
    
    Args:
        proxy_ip: Proxy IP address
        proxy_port: Proxy port
        proxy_username: Proxy username
        proxy_password: Proxy password
        use_proxy: Whether to enable proxy
        fallback_to_direct: Whether to fallback to direct connection if proxy fails
    """
    # Read current .env file
    env_vars = {}
    with open('.env', 'r') as f:
        lines = f.readlines()
    
    # Update or add proxy settings
    proxy_settings = {
        'USE_PROXY': 'true' if use_proxy else 'false',
        'PROXY_IP': proxy_ip,
        'PROXY_PORT': proxy_port,
        'PROXY_USERNAME': proxy_username,
        'PROXY_PASSWORD': proxy_password,
        'FALLBACK_TO_DIRECT': 'true' if fallback_to_direct else 'false',
        'PROXY_PROTOCOL': 'http'
    }
    
    # Check which settings are already in the file
    existing_settings = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, value = line.split('=', 1)
            existing_settings[key.strip()] = line
    
    # Update .env file
    with open('.env', 'w') as f:
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                f.write(line + '\n')
                continue
                
            if '=' in line:
                key, _ = line.split('=', 1)
                key = key.strip()
                
                # Replace if it's a proxy setting
                if key in proxy_settings:
                    f.write(f"{key}={proxy_settings[key]}\n")
                    del proxy_settings[key]  # Remove from dict to track what's been written
                else:
                    f.write(line + '\n')
        
        # Add any settings that weren't in the file
        for key, value in proxy_settings.items():
            if key not in existing_settings:
                f.write(f"{key}={value}\n")
    
    logger.info("Updated .env file with proxy settings")

def test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password):
    """
    Test connection to Binance API using the provided proxy
    
    Args:
        proxy_ip: Proxy IP address
        proxy_port: Proxy port
        proxy_username: Proxy username
        proxy_password: Proxy password
        
    Returns:
        bool: Whether the connection was successful
    """
    # Encode credentials for URL safety
    encoded_username = quote_plus(proxy_username)
    encoded_password = quote_plus(proxy_password)
    
    # Create proxy URL
    proxy_url = f"http://{encoded_username}:{encoded_password}@{proxy_ip}:{proxy_port}"
    
    # Create proxies dictionary
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    # Test connection
    try:
        # Create Binance client with proxy
        client = Spot(proxies=proxies, timeout=10)
        
        # Test ping
        logger.info("Testing connection with ping...")
        ping_result = client.ping()
        logger.info("Ping successful!")
        
        # Test server time
        logger.info("Testing server time...")
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"Server time: {server_time}")
        
        # Test symbol price
        logger.info("Testing symbol price...")
        price_result = client.ticker_price(symbol="BTCUSDT")
        btc_price = float(price_result['price'])
        logger.info(f"BTCUSDT price: ${btc_price:,.2f}")
        
        logger.info("Proxy connection test successful!")
        return True
        
    except Exception as e:
        logger.error(f"Proxy connection test failed: {e}")
        return False

def test_all_proxies():
    """
    Test all proxies in the attached proxy list file
    
    Returns:
        list: List of successful proxy configurations
    """
    successful_proxies = []
    
    try:
        with open('attached_assets/Webshare 3 proxies 3.txt', 'r') as f:
            proxy_lines = f.readlines()
            
        # Parse proxy lines
        for i, line in enumerate(proxy_lines):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split(':')
            if len(parts) < 4:
                logger.warning(f"Invalid proxy line: {line}")
                continue
                
            proxy_ip = parts[0]
            proxy_port = parts[1]
            proxy_username = parts[2]
            proxy_password = parts[3]
            
            logger.info(f"Testing proxy {i+1}/{len(proxy_lines)}: {proxy_ip}:{proxy_port}")
            
            if test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password):
                successful_proxies.append({
                    'ip': proxy_ip,
                    'port': proxy_port,
                    'username': proxy_username,
                    'password': proxy_password
                })
                
    except Exception as e:
        logger.error(f"Error testing proxies: {e}")
    
    return successful_proxies

def main():
    """Main function"""
    
    logger.info("Starting proxy settings update...")
    
    # Load environment variables from .env file
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
    except Exception as e:
        logger.error(f"Error loading .env file: {e}")
    
    # First option: test existing proxy settings if available
    existing_proxy_complete = (
        'PROXY_IP' in env_vars and env_vars['PROXY_IP'] and
        'PROXY_PORT' in env_vars and env_vars['PROXY_PORT'] and
        'PROXY_USERNAME' in env_vars and env_vars['PROXY_USERNAME'] and
        'PROXY_PASSWORD' in env_vars and env_vars['PROXY_PASSWORD']
    )
    
    if existing_proxy_complete:
        logger.info("Testing existing proxy settings...")
        proxy_ip = env_vars.get('PROXY_IP', '')
        proxy_port = env_vars.get('PROXY_PORT', '')
        proxy_username = env_vars.get('PROXY_USERNAME', '')
        proxy_password = env_vars.get('PROXY_PASSWORD', '')
        
        # Test existing proxy
        if test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password):
            logger.info("Existing proxy settings are working correctly!")
            
            # Ensure URL encoding is used by updating the .env file (even if settings are the same)
            update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password)
            
            return
        else:
            logger.warning("Existing proxy settings are not working, trying alternative proxies...")
    
    # Second option: test individual proxies from the proxy list file
    logger.info("Testing proxies from list file...")
    successful_proxies = test_all_proxies()
    
    if successful_proxies:
        logger.info(f"Found {len(successful_proxies)} working proxies")
        
        # Use the first successful proxy
        best_proxy = successful_proxies[0]
        proxy_ip = best_proxy['ip']
        proxy_port = best_proxy['port']
        proxy_username = best_proxy['username']
        proxy_password = best_proxy['password']
        
        logger.info(f"Selected proxy: {proxy_ip}:{proxy_port}")
        
        # Update .env file with new proxy settings
        update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password)
        
    else:
        logger.warning("No working proxies found")
        
        # If no working proxies, but we have existing settings, keep them with fallback enabled
        if existing_proxy_complete:
            logger.info("Keeping existing proxy settings with fallback enabled")
            proxy_ip = env_vars.get('PROXY_IP', '')
            proxy_port = env_vars.get('PROXY_PORT', '')
            proxy_username = env_vars.get('PROXY_USERNAME', '')
            proxy_password = env_vars.get('PROXY_PASSWORD', '')
            
            update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password, fallback_to_direct=True)
        else:
            logger.error("No proxy settings available - direct connection will be used")

if __name__ == "__main__":
    main()