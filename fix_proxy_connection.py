#!/usr/bin/env python3
"""
Proxy Connection Fix for Binance API

This script attempts to fix proxy authentication issues with the Binance API
by trying different URL encoding methods for the proxy credentials.

It:
1. Loads proxy settings from .env
2. Tests different URL encoding methods
3. Updates .env with the best working configuration
4. Verifies the connection after the fix
"""

import os
import sys
import time
import logging
import urllib.parse
import requests
import dotenv
import random
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('proxy_fix')

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

def load_env_variables():
    """Load environment variables from .env file"""
    dotenv.load_dotenv()
    
    proxy_ip = os.getenv('PROXY_IP')
    proxy_port = os.getenv('PROXY_PORT')
    proxy_username = os.getenv('PROXY_USERNAME')
    proxy_password = os.getenv('PROXY_PASSWORD')
    use_proxy = os.getenv('USE_PROXY', 'true').lower() == 'true'
    
    return {
        'proxy_ip': proxy_ip,
        'proxy_port': proxy_port,
        'proxy_username': proxy_username,
        'proxy_password': proxy_password,
        'use_proxy': use_proxy
    }

def update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password, 
                   encoding_method='quote_plus', fallback_to_direct=True):
    """
    Update proxy settings in .env file
    
    Args:
        proxy_ip: Proxy IP address
        proxy_port: Proxy port
        proxy_username: Proxy username
        proxy_password: Proxy password
        encoding_method: URL encoding method ('none', 'quote', 'quote_plus')
        fallback_to_direct: Whether to fallback to direct connection if proxy fails
    """
    # Load current env variables
    dotenv_file = dotenv.find_dotenv()
    dotenv.load_dotenv(dotenv_file)
    
    # Update values
    os.environ['PROXY_IP'] = proxy_ip
    os.environ['PROXY_PORT'] = str(proxy_port)
    os.environ['PROXY_USERNAME'] = proxy_username
    os.environ['PROXY_PASSWORD'] = proxy_password
    os.environ['PROXY_ENCODING_METHOD'] = encoding_method
    os.environ['USE_PROXY'] = 'true' if not fallback_to_direct else 'false'
    
    # Write changes to .env file
    dotenv.set_key(dotenv_file, 'PROXY_IP', proxy_ip)
    dotenv.set_key(dotenv_file, 'PROXY_PORT', str(proxy_port))
    dotenv.set_key(dotenv_file, 'PROXY_USERNAME', proxy_username)
    dotenv.set_key(dotenv_file, 'PROXY_PASSWORD', proxy_password)
    dotenv.set_key(dotenv_file, 'PROXY_ENCODING_METHOD', encoding_method)
    dotenv.set_key(dotenv_file, 'USE_PROXY', 'true' if not fallback_to_direct else 'false')
    
    logger.info(f"Updated .env file with proxy settings (encoding: {encoding_method})")
    if fallback_to_direct:
        logger.info("Direct connection is enabled as fallback")

def test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password, encoding_method='quote_plus'):
    """
    Test connection to Binance API using the provided proxy and encoding method
    
    Args:
        proxy_ip: Proxy IP address
        proxy_port: Proxy port
        proxy_username: Proxy username
        proxy_password: Proxy password
        encoding_method: URL encoding method ('none', 'quote', 'quote_plus')
        
    Returns:
        bool: Whether the connection was successful
    """
    # Encode username and password based on the method
    if encoding_method == 'none':
        encoded_username = proxy_username
        encoded_password = proxy_password
    elif encoding_method == 'quote':
        encoded_username = urllib.parse.quote(proxy_username)
        encoded_password = urllib.parse.quote(proxy_password)
    elif encoding_method == 'quote_plus':
        encoded_username = urllib.parse.quote_plus(proxy_username)
        encoded_password = urllib.parse.quote_plus(proxy_password)
    else:
        logger.error(f"Unknown encoding method: {encoding_method}")
        return False
    
    # Build proxy URL
    proxy_url = f"http://{encoded_username}:{encoded_password}@{proxy_ip}:{proxy_port}"
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    try:
        logger.info(f"Testing proxy connection with {encoding_method} encoding...")
        
        # Try to connect to Binance API
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
        
        # Test simple requests
        response = requests.get('https://api.binance.com/api/v3/ping', 
                               proxies=proxies, 
                               headers=headers,
                               timeout=10)
        
        if response.status_code == 200:
            logger.info(f"✅ REST API test passed (with {encoding_method} encoding)")
            
            # Test Binance SDK with proxy
            client = Spot(proxies=proxies)
            time_result = client.time()
            server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
            logger.info(f"✅ Binance SDK test passed - Server time: {server_time}")
            
            # Test symbol price
            price_result = client.ticker_price(symbol="BTCUSDT")
            btc_price = float(price_result['price'])
            logger.info(f"✅ Price API test passed - BTCUSDT: ${btc_price:,.2f}")
            
            return True
        else:
            logger.error(f"❌ REST API test failed - Status code: {response.status_code}")
            return False
    
    except Exception as e:
        logger.error(f"❌ Connection test failed: {str(e)}")
        return False

def test_all_encoding_methods(proxy_ip, proxy_port, proxy_username, proxy_password):
    """
    Test all URL encoding methods for proxy credentials
    
    Args:
        proxy_ip: Proxy IP address
        proxy_port: Proxy port
        proxy_username: Proxy username
        proxy_password: Proxy password
        
    Returns:
        str: The best encoding method ('none', 'quote', 'quote_plus')
    """
    encoding_methods = ['quote_plus', 'quote', 'none']
    
    for method in encoding_methods:
        if test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password, method):
            logger.info(f"Found working encoding method: {method}")
            return method
    
    logger.error("❌ All encoding methods failed")
    return None

def verify_connection_after_fix():
    """
    Verify that the connection works after applying the fix
    
    Returns:
        bool: Whether the connection is working
    """
    try:
        client = Spot()
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"✅ Connection verified - Server time: {server_time}")
        return True
    except Exception as e:
        logger.error(f"❌ Connection verification failed: {str(e)}")
        return False

def load_proxies_from_file(file_path='attached_assets/Webshare 3 proxies 3.txt'):
    """
    Load proxies from a file
    
    Args:
        file_path: Path to the proxy file
        
    Returns:
        list: List of proxy dictionaries with IP, port, username, and password
    """
    proxies = []
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                # Skip empty lines
                if line.strip() == '':
                    continue
                    
                # Parse proxy line (expected format: ip:port:username:password)
                parts = line.strip().split(':')
                if len(parts) >= 4:
                    proxy = {
                        'ip': parts[0],
                        'port': parts[1],
                        'username': parts[2],
                        'password': ':'.join(parts[3:])  # Handle passwords that might contain colons
                    }
                    proxies.append(proxy)
    except Exception as e:
        logger.error(f"Error loading proxies from file: {str(e)}")
        
    logger.info(f"Loaded {len(proxies)} proxies from file")
    return proxies

def fix_proxy_environment():
    """
    Fix the proxy environment variables in .env by trying multiple proxies
    """
    logger.info("Starting proxy environment fix process...")
    
    # Load proxies from the file
    proxies = load_proxies_from_file()
    
    if not proxies:
        logger.error("No proxies found in the file")
        return False
        
    # Shuffle proxies to randomize testing
    random.shuffle(proxies)
    
    # Try each proxy with different encoding methods
    for proxy in proxies:
        logger.info(f"Testing proxy: {proxy['ip']}:{proxy['port']}")
        
        best_encoding = test_all_encoding_methods(
            proxy['ip'], 
            proxy['port'], 
            proxy['username'], 
            proxy['password']
        )
        
        if best_encoding:
            # Update .env with the working proxy and encoding method
            update_env_file(
                proxy['ip'],
                proxy['port'],
                proxy['username'],
                proxy['password'],
                best_encoding,
                fallback_to_direct=False
            )
            
            logger.info(f"✅ Successfully fixed proxy environment with {proxy['ip']}:{proxy['port']}")
            return True
            
    logger.error("❌ Could not find a working proxy configuration")
    
    # If all proxies failed, try direct connection
    logger.info("Testing direct connection without proxy...")
    from direct_connection_test import try_direct_connection
    
    if try_direct_connection():
        logger.info("✅ Direct connection works! Updating environment to use direct connection.")
        # Update .env to use direct connection
        update_env_file(
            proxies[0]['ip'],  # Keep the proxy info but disable its use
            proxies[0]['port'],
            proxies[0]['username'],
            proxies[0]['password'],
            'quote_plus',
            fallback_to_direct=True
        )
        return True
    
    return False

def add_encoding_method_to_config():
    """Add the PROXY_ENCODING_METHOD to Python config.py if it doesn't exist"""
    dotenv_file = dotenv.find_dotenv()
    dotenv.load_dotenv(dotenv_file)
    
    # Get the current encoding method, or default to quote_plus
    encoding_method = os.getenv('PROXY_ENCODING_METHOD', 'quote_plus')
    
    # Update the env file if it doesn't exist
    if not os.getenv('PROXY_ENCODING_METHOD'):
        os.environ['PROXY_ENCODING_METHOD'] = encoding_method
        dotenv.set_key(dotenv_file, 'PROXY_ENCODING_METHOD', encoding_method)
        logger.info(f"Added PROXY_ENCODING_METHOD={encoding_method} to .env file")

def update_binance_service_files():
    """Update the Binance service files to use the encoding method from config"""
    # This function can be expanded to modify Python files that use the proxy settings
    # For example, updating the way binance service builds the proxy URL
    pass

def main():
    """Main function"""
    logger.info("Starting Binance Proxy Connection Fix...")
    
    # Ensure encoding method is in config
    add_encoding_method_to_config()
    
    # Load environment variables
    env_vars = load_env_variables()
    
    # Check if any proxy settings are missing
    if not all([env_vars['proxy_ip'], env_vars['proxy_port'], env_vars['proxy_username'], env_vars['proxy_password']]):
        logger.warning("One or more proxy settings are missing from .env")
        
        # Try to fix by loading and testing proxies from the file
        if fix_proxy_environment():
            logger.info("✅ Successfully fixed proxy environment")
        else:
            logger.error("❌ Failed to fix proxy environment. Please check your proxy settings and try again.")
            return False
    else:
        # Test the current proxy configuration
        logger.info(f"Testing current proxy configuration: {env_vars['proxy_ip']}:{env_vars['proxy_port']}")
        
        current_encoding = os.getenv('PROXY_ENCODING_METHOD', 'quote_plus')
        test_result = test_proxy_connection(
            env_vars['proxy_ip'],
            env_vars['proxy_port'],
            env_vars['proxy_username'],
            env_vars['proxy_password'],
            current_encoding
        )
        
        if test_result:
            logger.info(f"✅ Current proxy configuration is working with {current_encoding} encoding.")
            return True
        
        # Try different encoding methods
        logger.info("Current proxy is not working. Testing different encoding methods...")
        
        best_encoding = test_all_encoding_methods(
            env_vars['proxy_ip'],
            env_vars['proxy_port'],
            env_vars['proxy_username'],
            env_vars['proxy_password']
        )
        
        if best_encoding:
            # Update .env with the best working encoding method
            update_env_file(
                env_vars['proxy_ip'],
                env_vars['proxy_port'],
                env_vars['proxy_username'],
                env_vars['proxy_password'],
                best_encoding,
                fallback_to_direct=False
            )
            
            logger.info(f"✅ Successfully fixed proxy configuration with {best_encoding} encoding.")
            return True
        else:
            # Try to fix by loading and testing proxies from the file
            if fix_proxy_environment():
                logger.info("✅ Successfully fixed proxy environment")
            else:
                logger.error("❌ Failed to fix proxy environment. Please check your proxy settings and try again.")
                return False
    
    # Verify the connection after fixing
    if verify_connection_after_fix():
        logger.info("✅ Connection verified after fix.")
        return True
    else:
        logger.error("❌ Connection still not working after fix.")
        return False

if __name__ == "__main__":
    main()