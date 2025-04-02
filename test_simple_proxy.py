#!/usr/bin/env python3
"""
Simple Proxy Tester for Binance API
"""

import os
import sys
import logging
import urllib.parse
from datetime import datetime

try:
    from binance.spot import Spot
except ImportError:
    print("Binance-connector package not found.")
    sys.exit(1)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger()

def test_proxy(proxy_string):
    """Test a proxy with Binance API"""
    parts = proxy_string.split(':')
    
    # Extract proxy details
    if len(parts) < 2:
        logger.error(f"Invalid proxy format: {proxy_string}")
        return False
    
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
    
    # Configure proxy
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    # Test connection
    try:
        client = Spot(proxies=proxies, timeout=10)
        
        # Test ping
        logger.info("Testing ping...")
        client.ping()
        logger.info("Ping successful!")
        
        # Test ticker price
        logger.info("Testing price retrieval...")
        price_data = client.ticker_price(symbol="BTCUSDT")
        
        if 'price' in price_data:
            btc_price = float(price_data['price'])
            logger.info(f"BTCUSDT price: ${btc_price:,.2f}")
        
        logger.info(f"Proxy test SUCCESSFUL: {proxy_ip}:{proxy_port}")
        
        return {
            "proxy": proxy_string,
            "ip": proxy_ip,
            "port": proxy_port,
            "username": proxy_username,
            "password": proxy_password,
            "success": True
        }
    
    except Exception as e:
        logger.error(f"Proxy test FAILED: {proxy_ip}:{proxy_port}")
        logger.error(f"Error: {e}")
        
        return {
            "proxy": proxy_string,
            "ip": proxy_ip,
            "port": proxy_port,
            "username": proxy_username,
            "password": proxy_password,
            "success": False,
            "error": str(e)
        }

def update_env_file(proxy_data):
    """Update the .env file with the successful proxy"""
    logger.info(f"Updating .env file with proxy: {proxy_data['ip']}:{proxy_data['port']}")
    
    # Read current .env file
    env_content = []
    try:
        with open('.env', 'r') as f:
            env_content = f.readlines()
    except FileNotFoundError:
        logger.warning("No .env file found, creating a new one.")
    
    # Process the lines
    new_env_content = []
    updated = {
        'USE_PROXY': False,
        'PROXY_IP': False,
        'PROXY_PORT': False,
        'PROXY_USERNAME': False,
        'PROXY_PASSWORD': False,
        'PROXY_PROTOCOL': False,
        'FALLBACK_TO_DIRECT': False
    }
    
    for line in env_content:
        line = line.strip()
        if not line or line.startswith('#'):
            new_env_content.append(line)
            continue
        
        if '=' in line:
            key, value = line.split('=', 1)
            key = key.strip()
            
            if key == 'USE_PROXY':
                new_env_content.append("USE_PROXY=true")
                updated['USE_PROXY'] = True
            elif key == 'PROXY_IP':
                new_env_content.append(f"PROXY_IP={proxy_data['ip']}")
                updated['PROXY_IP'] = True
            elif key == 'PROXY_PORT':
                new_env_content.append(f"PROXY_PORT={proxy_data['port']}")
                updated['PROXY_PORT'] = True
            elif key == 'PROXY_USERNAME' and proxy_data['username']:
                new_env_content.append(f"PROXY_USERNAME={proxy_data['username']}")
                updated['PROXY_USERNAME'] = True
            elif key == 'PROXY_PASSWORD' and proxy_data['password']:
                new_env_content.append(f"PROXY_PASSWORD={proxy_data['password']}")
                updated['PROXY_PASSWORD'] = True
            elif key == 'PROXY_PROTOCOL':
                new_env_content.append("PROXY_PROTOCOL=http")
                updated['PROXY_PROTOCOL'] = True
            elif key == 'FALLBACK_TO_DIRECT':
                new_env_content.append("FALLBACK_TO_DIRECT=true")
                updated['FALLBACK_TO_DIRECT'] = True
            else:
                new_env_content.append(line)
        else:
            new_env_content.append(line)
    
    # Add any missing values
    if not updated['USE_PROXY']:
        new_env_content.append("USE_PROXY=true")
    if not updated['PROXY_IP']:
        new_env_content.append(f"PROXY_IP={proxy_data['ip']}")
    if not updated['PROXY_PORT']:
        new_env_content.append(f"PROXY_PORT={proxy_data['port']}")
    if not updated['PROXY_USERNAME'] and proxy_data['username']:
        new_env_content.append(f"PROXY_USERNAME={proxy_data['username']}")
    if not updated['PROXY_PASSWORD'] and proxy_data['password']:
        new_env_content.append(f"PROXY_PASSWORD={proxy_data['password']}")
    if not updated['PROXY_PROTOCOL']:
        new_env_content.append("PROXY_PROTOCOL=http")
    if not updated['FALLBACK_TO_DIRECT']:
        new_env_content.append("FALLBACK_TO_DIRECT=true")
    
    # Write the updated content
    with open('.env', 'w') as f:
        for line in new_env_content:
            f.write(f"{line}\n")
    
    logger.info("Updated .env file successfully!")

def main():
    # List of proxies to test
    proxy_list = [
        "86.38.234.176:6630:ahjqspco:dzx3r1prpz9k",
        "154.36.110.199:6853:ahjqspco:dzx3r1prpz9k",
        "45.151.162.198:6600:ahjqspco:dzx3r1prpz9k"
    ]
    
    successful_proxies = []
    
    for i, proxy in enumerate(proxy_list):
        logger.info(f"\n[{i+1}/{len(proxy_list)}] Testing proxy...")
        result = test_proxy(proxy)
        
        if result['success']:
            successful_proxies.append(result)
            
    logger.info("\n=== Test Results ===")
    logger.info(f"Total proxies tested: {len(proxy_list)}")
    logger.info(f"Successful proxies: {len(successful_proxies)}")
    
    if successful_proxies:
        # Use the first successful proxy
        best_proxy = successful_proxies[0]
        logger.info(f"\nSelected proxy: {best_proxy['ip']}:{best_proxy['port']}")
        update_env_file(best_proxy)
    else:
        logger.error("No working proxies found!")

if __name__ == "__main__":
    main()