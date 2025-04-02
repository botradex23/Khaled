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
from urllib.parse import quote, quote_plus
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
        return env_vars
    except Exception as e:
        logger.error(f"Error loading .env file: {e}")
        return {}

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
    env_vars = load_env_variables()
    
    # Update or add proxy settings
    proxy_settings = {
        'USE_PROXY': 'true',
        'PROXY_IP': proxy_ip,
        'PROXY_PORT': proxy_port,
        'PROXY_USERNAME': proxy_username,
        'PROXY_PASSWORD': proxy_password,
        'FALLBACK_TO_DIRECT': 'true' if fallback_to_direct else 'false',
        'PROXY_PROTOCOL': 'http',
        'PROXY_ENCODING_METHOD': encoding_method
    }
    
    # Read current .env file
    lines = []
    with open('.env', 'r') as f:
        lines = f.readlines()
    
    # Check which settings are already in the file
    existing_settings = {}
    for line in lines:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, _ = line.split('=', 1)
            existing_settings[key.strip()] = line
    
    # Update .env file
    with open('.env', 'w') as f:
        # Write a special comment to indicate the proxy settings section
        has_proxy_section = False
        for line in lines:
            line_strip = line.strip()
            if line_strip == '# Proxy Settings':
                has_proxy_section = True
                f.write(line)
                continue
                
            if not line_strip or line_strip.startswith('#'):
                if line_strip != '# Proxy Settings':  # Skip duplicate proxy section headers
                    f.write(line)
                continue
                
            if '=' in line_strip:
                key, _ = line_strip.split('=', 1)
                key = key.strip()
                
                # Replace if it's a proxy setting
                if key in proxy_settings:
                    f.write(f"{key}={proxy_settings[key]}\n")
                    del proxy_settings[key]  # Remove from dict to track what's been written
                else:
                    f.write(line)
        
        # Add proxy section if it doesn't exist
        if not has_proxy_section:
            f.write('\n# Proxy Settings\n')
        
        # Add any settings that weren't in the file
        for key, value in proxy_settings.items():
            if key not in existing_settings:
                f.write(f"{key}={value}\n")
    
    logger.info(f"Updated .env file with proxy settings (encoding: {encoding_method})")

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
    # Encode credentials based on the encoding method
    if encoding_method == 'none':
        username = proxy_username
        password = proxy_password
        logger.info("Using no URL encoding for proxy credentials")
    elif encoding_method == 'quote':
        username = quote(proxy_username)
        password = quote(proxy_password)
        logger.info("Using urllib.parse.quote for proxy credentials")
    else:  # Default to quote_plus
        username = quote_plus(proxy_username)
        password = quote_plus(proxy_password)
        logger.info("Using urllib.parse.quote_plus for proxy credentials")
    
    # Create proxy URL
    proxy_url = f"http://{username}:{password}@{proxy_ip}:{proxy_port}"
    
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
        
        logger.info(f"Proxy connection with {encoding_method} encoding test successful!")
        return True
        
    except Exception as e:
        logger.error(f"Proxy connection with {encoding_method} encoding test failed: {e}")
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
        logger.info(f"Testing proxy connection with {method} encoding method...")
        if test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password, method):
            logger.info(f"Found working encoding method: {method}")
            return method
    
    logger.error("All encoding methods failed")
    return None

def verify_connection_after_fix():
    """
    Verify that the connection works after applying the fix
    
    Returns:
        bool: Whether the connection is working
    """
    env_vars = load_env_variables()
    
    use_proxy = env_vars.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    if not use_proxy:
        logger.warning("Proxy is disabled. Skipping verification.")
        return False
    
    proxy_ip = env_vars.get('PROXY_IP', '')
    proxy_port = env_vars.get('PROXY_PORT', '')
    proxy_username = env_vars.get('PROXY_USERNAME', '')
    proxy_password = env_vars.get('PROXY_PASSWORD', '')
    encoding_method = env_vars.get('PROXY_ENCODING_METHOD', 'quote_plus')
    
    if not (proxy_ip and proxy_port and proxy_username and proxy_password):
        logger.warning("Proxy settings are incomplete. Skipping verification.")
        return False
    
    logger.info("Verifying connection after fix...")
    return test_proxy_connection(proxy_ip, proxy_port, proxy_username, proxy_password, encoding_method)

def fix_proxy_environment():
    """
    Fix the proxy environment variables in .env
    """
    env_vars = load_env_variables()
    
    # Check if proxy is enabled
    use_proxy = env_vars.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    
    if not use_proxy:
        logger.warning("Proxy is disabled. No fix needed.")
        return
    
    # Get proxy settings
    proxy_ip = env_vars.get('PROXY_IP', '')
    proxy_port = env_vars.get('PROXY_PORT', '')
    proxy_username = env_vars.get('PROXY_USERNAME', '')
    proxy_password = env_vars.get('PROXY_PASSWORD', '')
    
    # Check if proxy settings are complete
    if not (proxy_ip and proxy_port and proxy_username and proxy_password):
        logger.warning("Proxy settings are incomplete. Cannot apply fix.")
        return
    
    # Test all encoding methods
    best_method = test_all_encoding_methods(proxy_ip, proxy_port, proxy_username, proxy_password)
    
    if best_method:
        # Update .env file with the best encoding method
        update_env_file(proxy_ip, proxy_port, proxy_username, proxy_password, best_method)
        
        # Verify connection after fix
        time.sleep(1)  # Give time for the changes to take effect
        if verify_connection_after_fix():
            logger.info("Proxy connection fix successfully applied and verified!")
        else:
            logger.warning("Proxy connection fix applied but verification failed.")
    else:
        logger.error("Failed to find a working encoding method for proxy credentials.")

def add_encoding_method_to_config():
    """Add the PROXY_ENCODING_METHOD to Python config.py if it doesn't exist"""
    
    try:
        config_path = 'python_app/config.py'
        
        if not os.path.exists(config_path):
            logger.warning(f"Config file {config_path} not found. Skipping update.")
            return
        
        with open(config_path, 'r') as f:
            config_lines = f.readlines()
        
        # Check if PROXY_ENCODING_METHOD is already in the file
        has_encoding_method = any('PROXY_ENCODING_METHOD' in line for line in config_lines)
        
        if has_encoding_method:
            logger.info("PROXY_ENCODING_METHOD already exists in config.py. No update needed.")
            return
        
        # Find the place to insert the new setting
        insert_index = None
        proxy_section_end = None
        
        for i, line in enumerate(config_lines):
            if 'PROXY_PASSWORD' in line:
                proxy_section_end = i + 1
            elif 'FALLBACK_TO_DIRECT' in line:
                proxy_section_end = i + 1
        
        if proxy_section_end is not None:
            # Insert the new setting after the proxy section
            config_lines.insert(
                proxy_section_end, 
                "    PROXY_ENCODING_METHOD = os.environ.get('PROXY_ENCODING_METHOD', 'quote_plus')  # URL encoding method for proxy auth\n"
            )
            
            # Write the updated file
            with open(config_path, 'w') as f:
                f.writelines(config_lines)
                
            logger.info("Added PROXY_ENCODING_METHOD to config.py")
        else:
            logger.warning("Could not find the proxy section in config.py. Skipping update.")
        
    except Exception as e:
        logger.error(f"Error updating config.py: {e}")

def update_binance_service_files():
    """Update the Binance service files to use the encoding method from config"""
    
    try:
        # Update market_service.py
        market_service_path = 'python_app/services/binance/market_service.py'
        
        if os.path.exists(market_service_path):
            with open(market_service_path, 'r') as f:
                market_service_lines = f.readlines()
            
            # Find the proxy URL formation section
            for i, line in enumerate(market_service_lines):
                if 'import urllib.parse' in line:
                    # Already has the import, skip
                    break
            else:
                # Add the import if not found
                for i, line in enumerate(market_service_lines):
                    if 'import ' in line and i > 10:  # Skip past the module docstring
                        market_service_lines.insert(i, 'import urllib.parse\n')
                        break
            
            # Check for encoding method usage
            updated = False
            for i, line in enumerate(market_service_lines):
                if 'username = urllib.parse.quote_plus' in line:
                    # Update to use the encoding method from config
                    encoding_section = [
                        '                    # Get encoding method from config\n',
                        '                    encoding_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus") if active_config else "quote_plus"\n',
                        '                    # Apply URL encoding based on the method\n',
                        '                    if encoding_method == "none":\n',
                        '                        username = active_config.PROXY_USERNAME\n',
                        '                        password = active_config.PROXY_PASSWORD\n',
                        '                    elif encoding_method == "quote":\n',
                        '                        username = urllib.parse.quote(active_config.PROXY_USERNAME)\n',
                        '                        password = urllib.parse.quote(active_config.PROXY_PASSWORD)\n',
                        '                    else:  # Default to quote_plus\n',
                        '                        username = urllib.parse.quote_plus(active_config.PROXY_USERNAME)\n',
                        '                        password = urllib.parse.quote_plus(active_config.PROXY_PASSWORD)\n'
                    ]
                    
                    # Replace the existing encoding lines
                    if i > 0 and i+1 < len(market_service_lines):
                        if 'urllib.parse.quote_plus' in market_service_lines[i] and 'urllib.parse.quote_plus' in market_service_lines[i+1]:
                            market_service_lines[i:i+2] = encoding_section
                            updated = True
                            break
            
            if updated:
                # Write the updated file
                with open(market_service_path, 'w') as f:
                    f.writelines(market_service_lines)
                    
                logger.info("Updated market_service.py to use encoding method from config")
            else:
                logger.warning("Could not find the section to update in market_service.py")
        
        # Similarly update trading_service.py
        trading_service_path = 'python_app/services/binance/trading_service.py'
        
        if os.path.exists(trading_service_path):
            with open(trading_service_path, 'r') as f:
                trading_service_lines = f.readlines()
            
            # Find the proxy URL formation section
            for i, line in enumerate(trading_service_lines):
                if 'import urllib.parse' in line:
                    # Already has the import, skip
                    break
            else:
                # Add the import if not found
                for i, line in enumerate(trading_service_lines):
                    if 'import ' in line and i > 10:  # Skip past the module docstring
                        trading_service_lines.insert(i, 'import urllib.parse\n')
                        break
            
            # Check for encoding method usage
            updated = False
            for i, line in enumerate(trading_service_lines):
                if 'username = urllib.parse.quote_plus' in line:
                    # Update to use the encoding method from config
                    encoding_section = [
                        '                    # Get encoding method from config\n',
                        '                    encoding_method = getattr(active_config, "PROXY_ENCODING_METHOD", "quote_plus") if active_config else "quote_plus"\n',
                        '                    # Apply URL encoding based on the method\n',
                        '                    if encoding_method == "none":\n',
                        '                        username = active_config.PROXY_USERNAME\n',
                        '                        password = active_config.PROXY_PASSWORD\n',
                        '                    elif encoding_method == "quote":\n',
                        '                        username = urllib.parse.quote(active_config.PROXY_USERNAME)\n',
                        '                        password = urllib.parse.quote(active_config.PROXY_PASSWORD)\n',
                        '                    else:  # Default to quote_plus\n',
                        '                        username = urllib.parse.quote_plus(active_config.PROXY_USERNAME)\n',
                        '                        password = urllib.parse.quote_plus(active_config.PROXY_PASSWORD)\n'
                    ]
                    
                    # Replace the existing encoding lines
                    if i > 0 and i+1 < len(trading_service_lines):
                        if 'urllib.parse.quote_plus' in trading_service_lines[i] and 'urllib.parse.quote_plus' in trading_service_lines[i+1]:
                            trading_service_lines[i:i+2] = encoding_section
                            updated = True
                            break
            
            if updated:
                # Write the updated file
                with open(trading_service_path, 'w') as f:
                    f.writelines(trading_service_lines)
                    
                logger.info("Updated trading_service.py to use encoding method from config")
            else:
                logger.warning("Could not find the section to update in trading_service.py")
        
    except Exception as e:
        logger.error(f"Error updating service files: {e}")

def main():
    """Main function"""
    logger.info("=== Proxy Connection Fix ===")
    
    # Step 1: Try to fix the proxy environment variables in .env
    fix_proxy_environment()
    
    # Step 2: Add PROXY_ENCODING_METHOD to config.py
    add_encoding_method_to_config()
    
    # Step 3: Update the Binance service files to use the encoding method from config
    update_binance_service_files()
    
    logger.info("Proxy connection fix completed.")

if __name__ == "__main__":
    main()