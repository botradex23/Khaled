#!/usr/bin/env python3
"""
Direct Connection Test for Binance API

This script tests direct connection (without proxy) to Binance API
as a fallback option when proxies aren't working.
"""

import os
import sys
import logging
import requests
import dotenv
import json
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('direct_connection')

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

def try_direct_connection():
    """
    Try direct connection without proxy
    
    Returns:
        bool: Whether direct connection works
    """
    try:
        logger.info("Testing direct connection to Binance API...")
        
        # Create a client with no proxy
        client = Spot()
        
        # Try to ping the API
        logger.info("Testing API ping...")
        client.ping()
        logger.info("✅ Ping successful")
        
        # Get server time
        logger.info("Testing server time...")
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"✅ Server time: {server_time}")
        
        # Get ticker price
        logger.info("Testing market data...")
        price_result = client.ticker_price(symbol="BTCUSDT")
        btc_price = float(price_result['price'])
        logger.info(f"✅ BTCUSDT price: ${btc_price:,.2f}")
        
        # Test exchange info
        logger.info("Testing exchange information...")
        info = client.exchange_info()
        symbols_count = len(info['symbols'])
        logger.info(f"✅ Exchange info: {symbols_count} symbols available")
        
        logger.info("✅ All direct connection tests passed!")
        return True
        
    except Exception as e:
        logger.error(f"❌ Direct connection test failed: {str(e)}")
        return False

def check_ip_geolocation():
    """Check IP geolocation to see if we're in a region that might be restricted"""
    try:
        logger.info("Checking IP geolocation...")
        response = requests.get('https://ipinfo.io/json', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            country = data.get('country', 'Unknown')
            region = data.get('region', 'Unknown')
            city = data.get('city', 'Unknown')
            
            logger.info(f"IP Location: {city}, {region}, {country}")
            
            # List of countries where Binance might be restricted
            restricted_countries = ['US', 'CA', 'GB', 'JP']
            
            if country in restricted_countries:
                logger.warning(f"⚠️ Your location ({country}) may have restrictions for Binance API access")
                return True, country
            else:
                logger.info(f"✅ Your location ({country}) should have no restrictions for Binance API")
                return False, country
        else:
            logger.error(f"❌ Failed to check IP geolocation: {response.status_code}")
            return None, None
            
    except Exception as e:
        logger.error(f"❌ Error checking IP geolocation: {str(e)}")
        return None, None

def update_env_disable_proxy():
    """Update .env file to disable proxy and use direct connection"""
    try:
        logger.info("Updating .env file to disable proxy...")
        
        # Load current env file
        dotenv_file = dotenv.find_dotenv()
        dotenv.load_dotenv(dotenv_file)
        
        # Update USE_PROXY to false
        os.environ['USE_PROXY'] = 'false'
        dotenv.set_key(dotenv_file, 'USE_PROXY', 'false')
        
        logger.info("✅ Updated .env file - proxy disabled")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error updating .env file: {str(e)}")
        return False

def main():
    """Main function"""
    logger.info("Starting Direct Connection Test for Binance API...")
    
    # Check IP geolocation
    is_restricted, country = check_ip_geolocation()
    
    # Try direct connection
    if try_direct_connection():
        logger.info("✅ Direct connection to Binance API is working!")
        
        # Update .env to disable proxy
        if update_env_disable_proxy():
            logger.info("✅ Updated configuration to use direct connection")
            logger.info("✅ You can now restart your application to use direct connection")
            
            # Provide extra guidance if in a potentially restricted region
            if is_restricted:
                logger.warning(
                    f"⚠️ Note: While direct connection works now from {country}, "
                    "Binance may have restrictions in your region. "
                    "Consider using a reliable proxy service if issues occur later."
                )
            
            return True
        else:
            logger.error("❌ Failed to update configuration")
            return False
    else:
        logger.error("❌ Direct connection to Binance API failed")
        
        if is_restricted:
            logger.warning(
                f"⚠️ Your location ({country}) may have restrictions for Binance API. "
                "Consider using a reliable proxy service."
            )
        
        return False

if __name__ == "__main__":
    main()