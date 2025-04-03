#!/usr/bin/env python3
"""
Test Binance API Connection

This script tests the connection to Binance API with the configured proxies.
"""

import os
import sys
import json
import logging
import requests
from dotenv import load_dotenv
from urllib.parse import quote_plus

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
    logger.info(f"Loaded {len(proxies)} proxies")
    
    working_proxies = []
    
    for i, proxy in enumerate(proxies):
        logger.info(f"Testing proxy #{i+1}/{len(proxies)}: {proxy['ip']}:{proxy['port']}")
        
        proxy_url = format_proxy_url(proxy)
        proxies_dict = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        try:
            # Test with Binance API
            response = requests.get('https://api.binance.com/api/v3/ping', 
                                   proxies=proxies_dict,
                                   timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✅ Successfully connected to Binance API with proxy #{i+1}")
                working_proxies.append(proxy)
            else:
                logger.warning(f"❌ Failed to connect to Binance API with proxy #{i+1} - Status code: {response.status_code}")
        except Exception as e:
            logger.error(f"❌ Error connecting to Binance API with proxy #{i+1}: {e}")
    
    logger.info(f"Found {len(working_proxies)} working proxies out of {len(proxies)}")
    return working_proxies

def test_direct_binance():
    """Test direct connection to Binance API"""
    logger.info("Testing direct connection to Binance API...")
    
    try:
        response = requests.get('https://api.binance.com/api/v3/ping', timeout=5)
        logger.info(f"Direct connection status code: {response.status_code}")
        logger.info(f"Direct connection works: {response.status_code == 200}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error with direct connection: {e}")
        return False

def test_ticker_with_proxy(proxy):
    """Test getting ticker data with proxy"""
    proxy_url = format_proxy_url(proxy)
    proxies_dict = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    try:
        response = requests.get('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
                               proxies=proxies_dict,
                               timeout=10)
        
        logger.info(f"Ticker response status code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"BTCUSDT price: {data.get('price', 'N/A')}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error getting ticker data: {e}")
        return False

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Test direct connection
    direct_works = test_direct_binance()
    
    if direct_works:
        logger.info("Direct connection to Binance API works! No need for proxies.")
        return
    
    # Test proxies
    working_proxies = test_proxies()
    
    if not working_proxies:
        logger.error("No working proxies found. Unable to connect to Binance API.")
        return
    
    # Test getting ticker data with the first working proxy
    logger.info(f"Testing ticker data with proxy: {working_proxies[0]['ip']}:{working_proxies[0]['port']}")
    ticker_works = test_ticker_with_proxy(working_proxies[0])
    
    if ticker_works:
        logger.info("Successfully retrieved ticker data using proxy!")
    else:
        logger.error("Failed to retrieve ticker data using proxy.")

if __name__ == '__main__':
    main()