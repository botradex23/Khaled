#!/usr/bin/env python3
"""
Test Binance API connectivity with proxy configuration

This script tests connecting to the Binance API using the configured proxy
and verifies that it can retrieve basic market data.
"""

import os
import json
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('binance_proxy_test')

# Add the project root to the path
import sys
sys.path.append('.')

# Import config and services
try:
    from python_app.config import active_config
    from python_app.services.binance.market_service import BinanceMarketService, get_binance_market_service
    from python_app.services.binance.trading_service import BinanceTradingService, get_binance_trading_service
    logger.info("Successfully imported configuration and services")
except Exception as e:
    logger.error(f"Error importing modules: {e}")
    raise

def display_config():
    """Display the current configuration"""
    proxy_status = "ENABLED" if active_config.USE_PROXY else "DISABLED"
    testnet_status = "TESTNET" if active_config.USE_TESTNET else "PRODUCTION"
    
    logger.info(f"API Mode: {testnet_status}")
    logger.info(f"Proxy: {proxy_status}")
    
    if active_config.USE_PROXY:
        proxy_config = f"{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
        logger.info(f"Proxy Details: {proxy_config}")
    
    has_credentials = bool(active_config.BINANCE_API_KEY and active_config.BINANCE_SECRET_KEY)
    logger.info(f"API Keys Configured: {has_credentials}")

def test_market_connection():
    """Test retrieving market data from Binance"""
    logger.info("Testing market data service...")
    
    try:
        # Get market service
        market_service = get_binance_market_service()
        
        # Test retrieving ticker price
        symbol = "BTCUSDT"
        logger.info(f"Attempting to get price for {symbol}...")
        price_data = market_service.get_symbol_price(symbol)
        
        if price_data and 'price' in price_data:
            logger.info(f"SUCCESS: {symbol} price is {price_data['price']}")
            return True
        else:
            logger.error(f"Failed to get price data: {price_data}")
            return False
    
    except Exception as e:
        logger.error(f"Error in market test: {e}")
        return False

def test_trading_connection():
    """Test connection to Binance trading API"""
    logger.info("Testing trading service connection...")
    
    try:
        # Get trading service (paper mode = True for safety)
        trading_service = get_binance_trading_service(paper_mode=True)
        
        # Test API ping (doesn't require authentication)
        try:
            logger.info("Testing API ping...")
            ping_result = trading_service.client.ping()
            
            logger.info("SUCCESS: Binance API ping successful")
            
            # Test account info (this requires API keys)
            has_credentials = bool(active_config.BINANCE_API_KEY and active_config.BINANCE_SECRET_KEY)
            
            if has_credentials:
                logger.info("Testing authenticated endpoint access...")
                try:
                    # Get API key permissions (lightweight authenticated call)
                    permissions = trading_service.client.api_key_permissions()
                    
                    if permissions:
                        logger.info("SUCCESS: API key permissions retrieved")
                        if 'ipRestrict' in permissions:
                            ip_status = "Restricted" if permissions['ipRestrict'] else "Unrestricted"
                            logger.info(f"API Key IP access: {ip_status}")
                        return True
                except Exception as e:
                    logger.error(f"Error accessing authenticated endpoint: {e}")
                    return False
            else:
                logger.warning("Skipping authentication test - no API credentials configured")
            
            # If we got this far, at least the ping worked
            return True
            
        except Exception as e:
            logger.error(f"Error pinging Binance API: {e}")
            return False
    
    except Exception as e:
        logger.error(f"Error in trading test: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("=== Binance API Proxy Connection Test ===")
    
    # Display configuration
    display_config()
    
    # Test market data
    logger.info("\n--- Testing Market Data API ---")
    market_test = test_market_connection()
    
    # Test trading API
    logger.info("\n--- Testing Trading API ---")
    trading_test = test_trading_connection()
    
    # Display results
    logger.info("\n=== Test Results ===")
    logger.info(f"Market API: {'SUCCESS' if market_test else 'FAILED'}")
    
    if trading_test is None:
        logger.info("Trading API: SKIPPED (no credentials)")
    else:
        logger.info(f"Trading API: {'SUCCESS' if trading_test else 'FAILED'}")
    
    if market_test:
        logger.info("\nProxy configuration is working correctly!")
    else:
        logger.info("\nProxy configuration needs adjustment.")
        logger.info("Please check your proxy settings in .env and python_app/config.py")

if __name__ == "__main__":
    main()