#!/usr/bin/env python3
"""
Proxy Tester for Binance API

This script tests a list of proxies to identify which ones work best for accessing Binance API.
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

# List of proxies to test (format: IP:PORT:USERNAME:PASSWORD)
PROXY_LIST = [
    "86.38.234.176:6630:ahjqspco:dzx3r1prpz9k",
    "154.36.110.199:6853:ahjqspco:dzx3r1prpz9k",
    "45.151.162.198:6600:ahjqspco:dzx3r1prpz9k"
]

def get_binance_api_credentials():
    """Get Binance API credentials from environment variables"""
    api_key = os.environ.get('BINANCE_API_KEY', '')
    api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
    return api_key, api_secret

def test_proxy(proxy_details, use_auth=True):
    """
    Test a specific proxy with Binance API
    
    Args:
        proxy_details: String in format "IP:PORT:USERNAME:PASSWORD"
        use_auth: Whether to use API credentials for the test
        
    Returns:
        dict: Test results with success status and details
    """
    parts = proxy_details.split(':')
    if len(parts) < 2:
        logger.error(f"Invalid proxy format: {proxy_details}")
        return {"success": False, "error": "Invalid proxy format"}
    
    # Parse proxy details
    proxy_ip = parts[0]
    proxy_port = parts[1]
    proxy_username = parts[2] if len(parts) > 2 else None
    proxy_password = parts[3] if len(parts) > 3 else None
    
    # URL-encode username and password if present
    if proxy_username and proxy_password:
        proxy_username = urllib.parse.quote_plus(proxy_username)
        proxy_password = urllib.parse.quote_plus(proxy_password)
        proxy_url = f"http://{proxy_username}:{proxy_password}@{proxy_ip}:{proxy_port}"
        auth_status = "with authentication"
    else:
        proxy_url = f"http://{proxy_ip}:{proxy_port}"
        auth_status = "without authentication"
    
    logger.info(f"Testing proxy: {proxy_ip}:{proxy_port} {auth_status}")
    
    # Setup proxies
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    # Get API credentials
    api_key, api_secret = get_binance_api_credentials()
    use_credentials = use_auth and api_key and api_secret
    
    # Create kwargs for Binance client
    kwargs = {
        "timeout": 10,
        "proxies": proxies
    }
    
    # Create Binance client
    try:
        if use_credentials:
            client = Spot(
                api_key=api_key,
                api_secret=api_secret,
                **kwargs
            )
            logger.info("Created client with API credentials")
        else:
            client = Spot(**kwargs)
            logger.info("Created client without API credentials")
        
        # Test 1: Simple ping
        logger.info("Testing API connectivity (ping)...")
        ping_response = client.ping()
        logger.info("✓ Ping successful")
        
        # Test 2: Get server time
        logger.info("Testing server time endpoint...")
        time_response = client.time()
        if 'serverTime' in time_response:
            server_time = datetime.fromtimestamp(time_response['serverTime'] / 1000)
            logger.info(f"✓ Server time: {server_time}")
        else:
            logger.warning("✗ Server time endpoint response format unexpected")
        
        # Test 3: Get BTCUSDT price
        logger.info("Testing ticker price endpoint (BTCUSDT)...")
        price_response = client.ticker_price(symbol="BTCUSDT")
        if 'price' in price_response:
            logger.info(f"✓ BTCUSDT price: ${float(price_response['price']):,.2f}")
        else:
            logger.warning("✗ Ticker price endpoint response format unexpected")
        
        # Additional test if using credentials
        auth_test_result = None
        if use_credentials:
            logger.info("Testing authenticated endpoint...")
            try:
                permissions = client.api_key_permissions()
                logger.info(f"✓ API key permissions retrieved successfully")
                auth_test_result = True
            except Exception as e:
                logger.error(f"✗ Authentication test failed: {e}")
                auth_test_result = False
        
        return {
            "success": True,
            "proxy": f"{proxy_ip}:{proxy_port}",
            "username": proxy_username,
            "password": proxy_password if proxy_password else None,
            "auth_test": auth_test_result,
            "original_string": proxy_details
        }
        
    except Exception as e:
        logger.error(f"✗ Proxy test failed: {e}")
        return {
            "success": False,
            "proxy": f"{proxy_ip}:{proxy_port}",
            "error": str(e),
            "original_string": proxy_details
        }

def update_env_file(proxy_details):
    """Update .env file with successful proxy details"""
    parts = proxy_details.split(':')
    proxy_ip = parts[0]
    proxy_port = parts[1]
    proxy_username = parts[2] if len(parts) > 2 else ""
    proxy_password = parts[3] if len(parts) > 3 else ""
    
    env_lines = []
    updated = {
        'USE_PROXY': False,
        'PROXY_IP': False,
        'PROXY_PORT': False,
        'PROXY_USERNAME': False,
        'PROXY_PASSWORD': False,
        'PROXY_PROTOCOL': False,
        'FALLBACK_TO_DIRECT': False,
    }
    
    # Read existing .env file
    try:
        with open('.env', 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    env_lines.append(line)
                    continue
                
                if '=' in line:
                    key, value = line.split('=', 1)
                    key = key.strip()
                    
                    if key == 'USE_PROXY':
                        env_lines.append(f"USE_PROXY=true")
                        updated['USE_PROXY'] = True
                    elif key == 'PROXY_IP':
                        env_lines.append(f"PROXY_IP={proxy_ip}")
                        updated['PROXY_IP'] = True
                    elif key == 'PROXY_PORT':
                        env_lines.append(f"PROXY_PORT={proxy_port}")
                        updated['PROXY_PORT'] = True
                    elif key == 'PROXY_USERNAME':
                        env_lines.append(f"PROXY_USERNAME={proxy_username}")
                        updated['PROXY_USERNAME'] = True
                    elif key == 'PROXY_PASSWORD':
                        env_lines.append(f"PROXY_PASSWORD={proxy_password}")
                        updated['PROXY_PASSWORD'] = True
                    elif key == 'PROXY_PROTOCOL':
                        env_lines.append(f"PROXY_PROTOCOL=http")
                        updated['PROXY_PROTOCOL'] = True
                    elif key == 'FALLBACK_TO_DIRECT':
                        env_lines.append(f"FALLBACK_TO_DIRECT=true")
                        updated['FALLBACK_TO_DIRECT'] = True
                    else:
                        env_lines.append(line)
                else:
                    env_lines.append(line)
    except FileNotFoundError:
        logger.warning(".env file not found, creating a new one")
    
    # Add any missing config options
    if not updated['USE_PROXY']:
        env_lines.append(f"USE_PROXY=true")
    if not updated['PROXY_IP']:
        env_lines.append(f"PROXY_IP={proxy_ip}")
    if not updated['PROXY_PORT']:
        env_lines.append(f"PROXY_PORT={proxy_port}")
    if not updated['PROXY_USERNAME'] and proxy_username:
        env_lines.append(f"PROXY_USERNAME={proxy_username}")
    if not updated['PROXY_PASSWORD'] and proxy_password:
        env_lines.append(f"PROXY_PASSWORD={proxy_password}")
    if not updated['PROXY_PROTOCOL']:
        env_lines.append(f"PROXY_PROTOCOL=http")
    if not updated['FALLBACK_TO_DIRECT']:
        env_lines.append(f"FALLBACK_TO_DIRECT=true")
    
    # Write updated .env file
    with open('.env', 'w') as f:
        for line in env_lines:
            f.write(f"{line}\n")
    
    logger.info(f"Updated .env file with proxy configuration: {proxy_ip}:{proxy_port}")

def main():
    """Run proxy tests"""
    logger.info("=== Binance API Proxy Tester ===")
    
    successful_proxies = []
    
    # Test each proxy
    for i, proxy in enumerate(PROXY_LIST):
        logger.info(f"\n[{i+1}/{len(PROXY_LIST)}] Testing proxy: {proxy.split(':')[0]}:{proxy.split(':')[1]}")
        result = test_proxy(proxy)
        
        if result['success']:
            logger.info(f"✅ Proxy test successful: {result['proxy']}")
            successful_proxies.append(result)
        else:
            logger.info(f"❌ Proxy test failed: {result['proxy']} - {result.get('error', 'Unknown error')}")
    
    # Summary
    logger.info("\n=== Test Results Summary ===")
    logger.info(f"Total proxies tested: {len(PROXY_LIST)}")
    logger.info(f"Successful proxies: {len(successful_proxies)}")
    
    if successful_proxies:
        # Sort by the order they were in the original list (assuming the first ones might be preferred)
        first_success = successful_proxies[0]
        logger.info(f"\n✅ Using the first successful proxy: {first_success['proxy']}")
        
        # Update .env file with the selected proxy
        update_env_file(first_success['original_string'])
        
        # Print full details for all successful proxies
        logger.info("\nAll successful proxies:")
        for i, proxy in enumerate(successful_proxies):
            logger.info(f"{i+1}. {proxy['proxy']}" + 
                        f" (Auth test: {'✓ Passed' if proxy['auth_test'] else '✗ Failed' if proxy['auth_test'] is not None else '⚠ Not tested'})")
    else:
        logger.info("\n❌ No working proxies found. Please provide different proxy servers.")

if __name__ == "__main__":
    main()