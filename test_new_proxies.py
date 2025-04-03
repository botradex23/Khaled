#!/usr/bin/env python3
"""
Test New Proxies for Binance API

This script tests all the proxies from the new file and selects the working one.
"""

import os
import sys
import time
import logging
import requests
from typing import Dict, List, Optional, Tuple
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('test_new_proxies')

def load_proxies_from_file(file_path: str = 'attached_assets/Webshare 5 proxies.txt') -> List[Dict[str, str]]:
    """
    Load proxies from a file with format:
    ip:port:username:password
    
    Args:
        file_path: Path to proxy file
        
    Returns:
        List of proxy dictionaries
    """
    proxies = []
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line:
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
                else:
                    logger.warning(f"Invalid proxy format in line: {line}")
        
        logger.info(f"Loaded {len(proxies)} proxies from file {file_path}")
        return proxies
    except Exception as e:
        logger.error(f"Error loading proxies from file {file_path}: {e}")
        return []

def test_proxy_connection(proxy: Dict[str, str]) -> Tuple[bool, Optional[str], Optional[float]]:
    """
    Test connection to Binance API using the provided proxy
    
    Args:
        proxy: Proxy dictionary with ip, port, username, and password
        
    Returns:
        Tuple of (success, error_message, response_time)
    """
    ip = proxy['ip']
    port = proxy['port']
    username = proxy['username']
    password = proxy['password']
    
    # Format the proxy URL
    proxy_url = f"http://{username}:{password}@{ip}:{port}"
    
    proxies = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    logger.info(f"Testing proxy: {ip}:{port}")
    
    try:
        start_time = time.time()
        response = requests.get(
            'https://api.binance.com/api/v3/ping', 
            proxies=proxies,
            timeout=10
        )
        end_time = time.time()
        
        response_time = end_time - start_time
        
        if response.status_code == 200:
            logger.info(f"Proxy {ip}:{port} is working! Response time: {response_time:.2f}s")
            return True, None, response_time
        else:
            error_msg = f"HTTP status code {response.status_code}: {response.text}"
            logger.warning(f"Proxy {ip}:{port} failed: {error_msg}")
            return False, error_msg, response_time
    except requests.exceptions.ProxyError as e:
        if "402 Payment Required" in str(e):
            logger.error(f"Proxy {ip}:{port} payment required error: {e}")
            return False, "Proxy payment required", None
        else:
            logger.error(f"Proxy {ip}:{port} error: {e}")
            return False, str(e), None
    except Exception as e:
        logger.error(f"Error testing proxy {ip}:{port}: {e}")
        return False, str(e), None

def test_proxies() -> Dict[str, str]:
    """
    Test all proxies and return the best one
    
    Returns:
        Dictionary with the best proxy info
    """
    proxies = load_proxies_from_file()
    
    if not proxies:
        logger.error("No proxies loaded")
        return None
    
    working_proxies = []
    
    for proxy in proxies:
        success, error, response_time = test_proxy_connection(proxy)
        if success:
            proxy['response_time'] = response_time
            working_proxies.append(proxy)
    
    if working_proxies:
        # Sort by response time
        working_proxies.sort(key=lambda x: x.get('response_time', float('inf')))
        best_proxy = working_proxies[0]
        logger.info(f"Best proxy is {best_proxy['ip']}:{best_proxy['port']} with response time {best_proxy['response_time']:.2f}s")
        return best_proxy
    else:
        logger.error("No working proxies found")
        return None

def update_env_with_proxy(proxy: Dict[str, str]) -> bool:
    """
    Update .env file with the best proxy
    
    Args:
        proxy: Proxy dictionary with ip, port, username, and password
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Read current .env file
        with open('.env', 'r') as f:
            env_lines = f.readlines()
        
        # Update or add proxy settings
        new_env_lines = []
        proxy_keys = {
            'NEW_PROXY_IP': proxy['ip'],
            'NEW_PROXY_PORT': proxy['port'],
            'NEW_PROXY_USERNAME': proxy['username'],
            'NEW_PROXY_PASSWORD': proxy['password']
        }
        
        # Keep track of which keys we've updated
        updated_keys = set()
        
        for line in env_lines:
            line = line.strip()
            if not line or line.startswith('#'):
                new_env_lines.append(line)
                continue
            
            key_value = line.split('=', 1)
            if len(key_value) != 2:
                new_env_lines.append(line)
                continue
            
            key, value = key_value
            
            if key in proxy_keys:
                new_line = f"{key}={proxy_keys[key]}"
                new_env_lines.append(new_line)
                updated_keys.add(key)
            else:
                new_env_lines.append(line)
        
        # Add any keys that weren't updated
        for key, value in proxy_keys.items():
            if key not in updated_keys:
                new_env_lines.append(f"{key}={value}")
        
        # Write the updated .env file
        with open('.env', 'w') as f:
            for line in new_env_lines:
                f.write(f"{line}\n")
        
        logger.info("Updated .env file with new proxy settings")
        return True
    except Exception as e:
        logger.error(f"Error updating .env file: {e}")
        return False

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    logger.info("Testing proxies...")
    best_proxy = test_proxies()
    
    if best_proxy:
        logger.info(f"Found working proxy: {best_proxy['ip']}:{best_proxy['port']}")
        
        # Update .env file with best proxy
        if update_env_with_proxy(best_proxy):
            logger.info("Successfully updated .env file with new proxy settings")
            logger.info(f"Using proxy: {best_proxy['ip']}:{best_proxy['port']}")
        else:
            logger.error("Failed to update .env file")
    else:
        logger.error("No working proxies found. Cannot update .env file.")

if __name__ == '__main__':
    main()