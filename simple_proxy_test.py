#!/usr/bin/env python3
"""
Very simple test for proxies
"""
import os
import sys
import time
import urllib.parse
import logging
import requests
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('simple_proxy_test')

class SimpleProxyManager:
    """A simplified proxy manager for testing"""
    
    def __init__(self, proxy_file='attached_assets/Webshare 3 proxies 3.txt'):
        """Initialize with proxy file path"""
        self.proxy_list = self.load_proxies_from_file(proxy_file)
        self.current_index = 0
        logger.info(f"Initialized with {len(self.proxy_list)} proxies")
        
    def load_proxies_from_file(self, file_path: str) -> List[Dict[str, str]]:
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
            # Check if file exists
            if not os.path.exists(file_path):
                logger.error(f"Proxy file not found: {file_path}")
                return []
                
            # Read file
            with open(file_path, 'r') as f:
                lines = f.readlines()
                
            # Parse each line
            for line in lines:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                    
                # Split by colon
                parts = line.split(':')
                if len(parts) >= 4:  # ip:port:username:password format
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
            
    def get_current_proxy(self) -> Optional[Dict[str, str]]:
        """Get the current proxy from the rotation"""
        if not self.proxy_list:
            return None
            
        return self.proxy_list[self.current_index]
        
    def rotate_proxy(self) -> None:
        """Rotate to the next proxy in the list"""
        if not self.proxy_list:
            return
            
        self.current_index = (self.current_index + 1) % len(self.proxy_list)
        logger.info(f"Rotated to proxy #{self.current_index + 1}")

def test_binance_with_proxies():
    """Test Binance connection with all available proxies"""
    proxy_manager = SimpleProxyManager()
    
    if not proxy_manager.proxy_list:
        logger.error("No proxies available")
        return False
        
    # Try all proxies
    for i in range(len(proxy_manager.proxy_list)):
        try:
            # Get current proxy
            proxy = proxy_manager.get_current_proxy()
            proxy_str = f"{proxy['ip']}:{proxy['port']}"
            
            # Set up env vars for proxy
            encoded_auth = f"{urllib.parse.quote(proxy['username'])}:{urllib.parse.quote(proxy['password'])}"
            proxy_url = f"http://{encoded_auth}@{proxy_str}"
            
            # Create session with proxy
            session = requests.Session()
            session.proxies = {
                'http': proxy_url,
                'https': proxy_url
            }
            
            # Test connection
            logger.info(f"Testing proxy #{i+1}: {proxy['ip']}:{proxy['port']}")
            response = session.get('https://api.binance.com/api/v3/ping', timeout=10)
            
            if response.status_code == 200:
                logger.info(f"✅ SUCCESS: Proxy {i+1} connected to Binance API")
                return True
            else:
                logger.warning(f"Proxy {i+1} failed with status code: {response.status_code}")
                
        except requests.exceptions.ProxyError as e:
            logger.warning(f"❌ Proxy error with #{i+1}: {e}")
        except requests.exceptions.RequestException as e:
            logger.warning(f"❌ Request error with #{i+1}: {e}")
        except Exception as e:
            logger.warning(f"❌ Unexpected error with #{i+1}: {e}")
            
        # Try next proxy
        proxy_manager.rotate_proxy()
        time.sleep(1)
    
    logger.error("All proxies failed")
    
    # Try direct connection
    try:
        logger.info("Trying direct connection to Binance API...")
        response = requests.get('https://api.binance.com/api/v3/ping', timeout=10)
        
        if response.status_code == 200:
            logger.info("✅ SUCCESS: Direct connection to Binance API successful")
            return True
        else:
            logger.warning(f"Direct connection failed with status code: {response.status_code}")
            
    except Exception as e:
        logger.error(f"Direct connection failed: {e}")
        
    return False

if __name__ == "__main__":
    success = test_binance_with_proxies()
    if success:
        print("\n✅ Successfully connected to Binance API")
    else:
        print("\n❌ Failed to connect to Binance API with any method")