#!/usr/bin/env python3
"""
Test Binance connection with proxy handling
"""
import os
import sys
import time
import urllib.parse
import logging
import traceback
import requests
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('binance_connection_test')

def test_binance_direct():
    """Test direct connection to Binance API"""
    logger.info("Testing direct connection to Binance API...")
    try:
        response = requests.get('https://api.binance.com/api/v3/ping', timeout=10)
        if response.status_code == 200:
            logger.info("✅ Direct connection SUCCESS!")
            return True
        else:
            logger.warning(f"❌ Direct connection failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Direct connection error: {e}")
        return False

def test_binance_with_proxy(proxy_ip, proxy_port, proxy_username, proxy_password):
    """Test Binance connection with proxy"""
    logger.info(f"Testing proxy connection {proxy_ip}:{proxy_port} to Binance API...")
    
    # Format proxy URL with auth
    proxy_str = f"{proxy_ip}:{proxy_port}"
    auth_str = f"{urllib.parse.quote(proxy_username)}:{urllib.parse.quote(proxy_password)}"
    proxy_url = f"http://{auth_str}@{proxy_str}"
    
    proxies = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    try:
        response = requests.get('https://api.binance.com/api/v3/ping', 
                               proxies=proxies, 
                               timeout=10)
        
        if response.status_code == 200:
            logger.info(f"✅ Proxy connection SUCCESS!")
            return True
        else:
            logger.warning(f"❌ Proxy connection failed with status code {response.status_code}")
            return False
            
    except requests.exceptions.ProxyError as e:
        logger.error(f"❌ Proxy error: {e}")
        if "402 Payment Required" in str(e):
            logger.error("This proxy requires payment. Please upgrade your WebShare plan or use a different proxy.")
        return False
        
    except Exception as e:
        logger.error(f"❌ Connection error: {e}")
        traceback.print_exc()
        return False

def load_proxies_from_file(file_path='attached_assets/Webshare 3 proxies 3.txt'):
    """Load proxies from a file"""
    proxies = []
    
    try:
        if not os.path.exists(file_path):
            logger.error(f"Proxy file not found: {file_path}")
            return []
            
        with open(file_path, 'r') as f:
            lines = f.readlines()
            
        for line in lines:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
                
            parts = line.split(':')
            if len(parts) >= 4:
                proxy = {
                    'ip': parts[0],
                    'port': parts[1],
                    'username': parts[2],
                    'password': parts[3]
                }
                proxies.append(proxy)
                
        logger.info(f"Loaded {len(proxies)} proxies from {file_path}")
        return proxies
        
    except Exception as e:
        logger.error(f"Error loading proxies from file: {e}")
        return []

def main():
    """Main function"""
    # Check direct connection first
    direct_works = test_binance_direct()
    
    if direct_works:
        logger.info("Direct connection to Binance API works! No proxy needed.")
        return
    
    # Check for new proxy credentials
    new_proxy_ip = os.getenv('NEW_PROXY_IP')
    new_proxy_port = os.getenv('NEW_PROXY_PORT')
    new_proxy_username = os.getenv('NEW_PROXY_USERNAME')
    new_proxy_password = os.getenv('NEW_PROXY_PASSWORD')
    
    if new_proxy_ip and new_proxy_port and new_proxy_username and new_proxy_password:
        logger.info("Testing with NEW proxy credentials from environment variables...")
        proxy_success = test_binance_with_proxy(
            new_proxy_ip, new_proxy_port, new_proxy_username, new_proxy_password)
            
        if proxy_success:
            logger.info("✅ Connection to Binance API successful with NEW proxy!")
            return
        else:
            logger.error("❌ Failed to connect to Binance API with NEW proxy")
    
    # Load proxies from file
    proxies = load_proxies_from_file()
    
    if not proxies:
        # Try original environment variables
        proxy_ip = os.getenv('PROXY_IP')
        proxy_port = os.getenv('PROXY_PORT')
        proxy_username = os.getenv('PROXY_USERNAME')
        proxy_password = os.getenv('PROXY_PASSWORD')
        
        if proxy_ip and proxy_port and proxy_username and proxy_password:
            logger.info("Using original proxy from environment variables")
            proxy_success = test_binance_with_proxy(
                proxy_ip, proxy_port, proxy_username, proxy_password)
                
            if proxy_success:
                logger.info("✅ Connection to Binance API successful with original env proxy!")
                return
            else:
                logger.error("❌ Failed to connect to Binance API with original env proxy")
        else:
            logger.error("No proxies available")
            return
            
    # Try all proxies from file
    for i, proxy in enumerate(proxies):
        proxy_success = test_binance_with_proxy(
            proxy['ip'], proxy['port'], proxy['username'], proxy['password'])
            
        if proxy_success:
            logger.info(f"✅ Proxy #{i+1} successfully connected to Binance API")
            # Print the working proxy in a format suitable for environment variables
            logger.info(f"Working proxy: {proxy['ip']}:{proxy['port']}:{proxy['username']}:{proxy['password']}")
            return
    
    logger.error("❌ All proxies failed to connect to Binance API")

if __name__ == "__main__":
    main()