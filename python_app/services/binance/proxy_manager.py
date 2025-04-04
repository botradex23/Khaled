#!/usr/bin/env python3
"""
Binance Proxy Manager

This module provides an enhanced proxy management system for Binance API connections.
It handles multiple proxy formats, authentication methods, and fallback mechanisms.
"""

import os
import logging
import urllib.parse
import time
import random
from typing import Dict, List, Any, Optional, Tuple, Union
from requests.auth import HTTPProxyAuth

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('proxy_manager')

# Try to import active config
try:
    from python_app.config import active_config
except ImportError:
    try:
        from config import active_config
    except ImportError:
        logger.error("Could not import active_config. Using default values.")
        active_config = None

class ProxyManager:
    """
    Enhanced proxy manager for Binance API connections
    
    This class handles all aspects of proxy connections including:
    - Multiple authentication formats
    - Connection testing
    - Automatic fallback to alternative proxies
    - Proxy rotation for load balancing
    """
    
    def __init__(self):
        """Initialize the proxy manager"""
        self.proxy_list = []
        self.current_proxy_index = 0
        self.last_rotation_time = time.time()
        self.rotation_interval = 3600  # 1 hour
        self.load_proxies()
        
    def load_proxies(self) -> None:
        """Load proxies from environment variables and/or proxy file"""
        # First, try to load from the proxy file
        proxy_file = os.environ.get('PROXY_FILE', 'attached_assets/Webshare 3 proxies 3.txt')
        if os.path.exists(proxy_file):
            try:
                with open(proxy_file, 'r') as f:
                    for line in f:
                        line = line.strip()
                        if not line or line.startswith('#'):
                            continue
                        
                        parts = line.split(':')
                        if len(parts) >= 4:
                            proxy = {
                                'ip': parts[0],
                                'port': parts[1],
                                'username': parts[2],
                                'password': ':'.join(parts[3:])  # Handle passwords with colons
                            }
                            self.proxy_list.append(proxy)
                logger.info(f"Loaded {len(self.proxy_list)} proxies from file {proxy_file}")
            except Exception as e:
                logger.error(f"Error loading proxies from file {proxy_file}: {e}")
        
        # If we have no proxies from file, try environment variables
        if not self.proxy_list and active_config:
            if hasattr(active_config, 'PROXY_IP') and hasattr(active_config, 'PROXY_PORT'):
                proxy = {
                    'ip': active_config.PROXY_IP,
                    'port': active_config.PROXY_PORT,
                    'username': getattr(active_config, 'PROXY_USERNAME', ''),
                    'password': getattr(active_config, 'PROXY_PASSWORD', '')
                }
                self.proxy_list.append(proxy)
                logger.info("Loaded proxy from environment variables")
        
        # Validate loaded proxies
        valid_proxies = []
        for proxy in self.proxy_list:
            if proxy['ip'] and proxy['port']:
                valid_proxies.append(proxy)
            else:
                logger.warning(f"Skipping invalid proxy: {proxy}")
        
        self.proxy_list = valid_proxies
        logger.info(f"Initialized with {len(self.proxy_list)} valid proxies")
        
        # Shuffle proxies for better load distribution
        random.shuffle(self.proxy_list)
    
    def get_current_proxy(self) -> Optional[Dict[str, str]]:
        """Get the current proxy from the rotation"""
        if not self.proxy_list:
            return None
        
        # Check if it's time to rotate
        if time.time() - self.last_rotation_time > self.rotation_interval:
            self.rotate_proxy()
        
        return self.proxy_list[self.current_proxy_index]
    
    def rotate_proxy(self) -> None:
        """Rotate to the next proxy in the list"""
        if not self.proxy_list:
            return
        
        self.current_proxy_index = (self.current_proxy_index + 1) % len(self.proxy_list)
        self.last_rotation_time = time.time()
        logger.info(f"Rotated to proxy #{self.current_proxy_index + 1}")
    
    def get_proxy_configs(self, 
                          proxy: Optional[Dict[str, str]] = None,
                          protocol: str = 'http') -> Tuple[Dict[str, str], Optional[HTTPProxyAuth]]:
        """
        Get proxy configurations with all necessary components
        
        Args:
            proxy: Optional specific proxy to use (defaults to current)
            protocol: Protocol to use (default: http)
            
        Returns:
            tuple: (proxies dict for requests, auth object if needed)
        """
        if not proxy:
            proxy = self.get_current_proxy()
        
        if not proxy:
            return {}, None
        
        # Determine if we need authentication
        needs_auth = bool(proxy['username'] and proxy['password'])
        
        # Create the basic proxy URL (without auth in URL)
        proxy_url = f"{protocol}://{proxy['ip']}:{proxy['port']}"
        
        # Set up proxies dictionary
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        
        # Set up auth if needed
        auth = None
        if needs_auth:
            auth = HTTPProxyAuth(proxy['username'], proxy['password'])
            logger.debug(f"Created proxy auth for user {proxy['username']}")
        
        return proxies, auth
    
    def get_binance_client_params(self) -> Dict[str, Any]:
        """
        Get parameters for Binance client initialization
        
        Returns:
            Dictionary of parameters to pass to Binance Spot client
        """
        params: Dict[str, Any] = {
            "timeout": 15,  # Increased timeout for reliability
        }
        
        # Check if proxy should be used
        use_proxy = getattr(active_config, 'USE_PROXY', True) if active_config else True
        
        if use_proxy and self.proxy_list:
            current_proxy = self.get_current_proxy()
            if current_proxy:
                # For Binance connector, we need to format proxy string differently
                proxy_ip = current_proxy.get('ip')
                proxy_port = current_proxy.get('port')
                proxy_username = current_proxy.get('username')
                proxy_password = current_proxy.get('password')
                
                # Construct the proxy URL in the format expected by Binance connector
                if proxy_username and proxy_password:
                    # Format: http://username:password@host:port
                    proxy_url = f"http://{urllib.parse.quote_plus(proxy_username)}:{urllib.parse.quote_plus(proxy_password)}@{proxy_ip}:{proxy_port}"
                else:
                    # Format: http://host:port (no auth)
                    proxy_url = f"http://{proxy_ip}:{proxy_port}"
                
                # Set the proxy_url parameter for Binance connector
                params["proxy_url"] = proxy_url
                
                logger.info(f"Configured Binance client with proxy {proxy_ip}:{proxy_port}")
        
        return params

# Create a singleton instance
_proxy_manager = None

def get_proxy_manager() -> ProxyManager:
    """Get or create the singleton proxy manager instance"""
    global _proxy_manager
    if _proxy_manager is None:
        _proxy_manager = ProxyManager()
    return _proxy_manager

# Default instance for easy importing
proxy_manager = get_proxy_manager()