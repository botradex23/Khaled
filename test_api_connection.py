#!/usr/bin/env python3
"""
Test Binance API Connection

This script tests the connection to Binance API with the configured proxies.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional
import requests
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('test_api_connection')

def load_proxies_from_file(file_path='attached_assets/Webshare 5 proxies.txt'):
    """Load proxies from a file"""
    proxies = []
    try:
        with open(file_path, 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) == 4:
                    proxy = {
                        'ip': parts[0],
                        'port': parts[1],
                        'username': parts[2],
                        'password': parts[3]
                    }
                    proxies.append(proxy)
        logger.info(f"Loaded {len(proxies)} proxies from {file_path}")
    except Exception as e:
        logger.error(f"Failed to load proxies from file {file_path}: {e}")
    
    return proxies

def format_proxy_url(proxy):
    """Format proxy URL with proper authentication"""
    username = quote_plus(proxy['username'])
    password = quote_plus(proxy['password'])
    return f"http://{username}:{password}@{proxy['ip']}:{proxy['port']}"

def test_proxies():
    """Test all proxies"""
    proxies = load_proxies_from_file()
    
    logger.info(f"Testing {len(proxies)} proxies...")
    working_proxies = []
    
    for i, proxy in enumerate(proxies):
        logger.info(f"Testing proxy {i+1}/{len(proxies)}: {proxy['ip']}:{proxy['port']}")
        
        proxy_url = format_proxy_url(proxy)
        proxies_dict = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        try:
            # Test with Binance API
            start_time = time.time()
            response = requests.get('https://api.binance.com/api/v3/ping', 
                                  proxies=proxies_dict,
                                  timeout=10)
            elapsed = time.time() - start_time
            
            if response.status_code == 200:
                logger.info(f"✅ Proxy {proxy['ip']}:{proxy['port']} works! Response time: {elapsed:.2f}s")
                working_proxies.append(proxy)
                
                # Try a ticker request
                test_ticker_with_proxy(proxy)
            else:
                logger.error(f"❌ Proxy {proxy['ip']}:{proxy['port']} failed with status code {response.status_code}")
        except Exception as e:
            logger.error(f"❌ Proxy {proxy['ip']}:{proxy['port']} failed with error: {e}")
    
    logger.info(f"Found {len(working_proxies)} working proxies out of {len(proxies)}")
    return working_proxies

def test_direct_binance():
    """Test direct connection to Binance API"""
    logger.info("Testing direct connection to Binance API (without proxy)...")
    
    try:
        start_time = time.time()
        response = requests.get('https://api.binance.com/api/v3/ping', timeout=5)
        elapsed = time.time() - start_time
        
        if response.status_code == 200:
            logger.info(f"✅ Direct connection works! Response time: {elapsed:.2f}s")
            return True
        else:
            logger.error(f"❌ Direct connection failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Direct connection failed with error: {e}")
        return False

def test_ticker_with_proxy(proxy):
    """Test getting ticker data with proxy"""
    proxy_url = format_proxy_url(proxy)
    proxies_dict = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    try:
        # Test with Binance ticker API
        response = requests.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT', 
                              proxies=proxies_dict,
                              timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"✅ BTC Price: ${float(data['price']):.2f}")
            return True
        else:
            logger.error(f"❌ Ticker request failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"❌ Ticker request failed with error: {e}")
        return False

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Test direct connection
    direct_works = test_direct_binance()
    
    # Test proxies
    working_proxies = test_proxies()
    
    # Summary
    logger.info("=== Summary ===")
    logger.info(f"Direct connection: {'✅ Works' if direct_works else '❌ Failed'}")
    logger.info(f"Working proxies: {len(working_proxies)}/{len(load_proxies_from_file())}")
    
    if len(working_proxies) > 0:
        logger.info("You can use Binance API with the working proxies")
    elif direct_works:
        logger.info("You can use Binance API with direct connection")
    else:
        logger.info("⚠️ You cannot use Binance API directly or with the provided proxies")
        logger.info("Consider using a different proxy provider or a VPN")

if __name__ == '__main__':
    main()