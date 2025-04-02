#!/usr/bin/env python3
"""
Multiple Proxy Tester for Binance API

This script tries connecting to Binance API using multiple proxies
from the Webshare proxy list to find a working proxy configuration.

It:
1. Loads proxy settings from the WebShare file or from .env
2. Tests each proxy with different URL encoding methods
3. Updates .env with the best working configuration
4. Verifies the connection after the fix
"""

import os
import sys
import time
import logging
import dotenv
from fix_proxy_connection import (
    load_proxies_from_file,
    test_all_encoding_methods,
    update_env_file,
    verify_connection_after_fix,
    add_encoding_method_to_config,
    update_binance_service_files
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger('multiple-proxy-tester')

def main():
    """Main function"""
    logger.info("=== Multiple Proxy Tester ===")
    
    # Try to load proxies from the WebShare file
    proxy_file = 'attached_assets/Webshare 3 proxies 3.txt'
    proxy_list = load_proxies_from_file(proxy_file)
    
    if not proxy_list:
        logger.error(f"No proxies found in {proxy_file}. Please check the file.")
        return False
    
    logger.info(f"Testing {len(proxy_list)} proxies from {proxy_file}")
    
    success = False
    best_proxy = None
    best_method = None
    
    # Try each proxy in the list
    for i, proxy in enumerate(proxy_list):
        proxy_ip = proxy['ip']
        proxy_port = proxy['port']
        proxy_username = proxy['username']
        proxy_password = proxy['password']
        
        logger.info(f"Testing proxy {i+1}/{len(proxy_list)}: {proxy_ip}:{proxy_port}")
        
        # Test all encoding methods for this proxy
        encoding_method = test_all_encoding_methods(proxy_ip, proxy_port, proxy_username, proxy_password)
        
        if encoding_method:
            logger.info(f"Found working proxy: {proxy_ip}:{proxy_port} with encoding method: {encoding_method}")
            
            # Update .env file with the working proxy and encoding method
            update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password, encoding_method)
            
            # Verify connection after fix
            time.sleep(1)  # Give time for the changes to take effect
            if verify_connection_after_fix():
                logger.info("Proxy connection verified successfully!")
                best_proxy = proxy
                best_method = encoding_method
                success = True
                break
            else:
                logger.warning("Proxy connection verification failed. Trying next proxy.")
        else:
            logger.warning(f"Proxy {proxy_ip}:{proxy_port} did not work with any encoding method. Trying next proxy.")
    
    if success:
        # Add encoding method to config
        add_encoding_method_to_config()
        
        # Update service files
        update_binance_service_files()
        
        logger.info(f"Successfully configured proxy {best_proxy['ip']}:{best_proxy['port']} with encoding method {best_method}")
        
        # Enable the proxy in .env
        dotenv.load_dotenv()
        with open('.env', 'r') as f:
            env_content = f.read()
        
        if 'USE_PROXY=false' in env_content:
            env_content = env_content.replace('USE_PROXY=false', 'USE_PROXY=true')
            with open('.env', 'w') as f:
                f.write(env_content)
            logger.info("Enabled proxy in .env file")
        
        return True
    else:
        logger.error("Failed to find a working proxy configuration. All proxies were tested without success.")
        return False

if __name__ == "__main__":
    main()