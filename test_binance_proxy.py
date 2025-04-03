#!/usr/bin/env python3
"""
Simplified test for Binance proxy system
"""
import os
import sys
import logging
import time

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('proxy_test')

# Add path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the proxy manager
try:
    from python_app.services.binance.proxy_manager import get_proxy_manager
    logger.info("Imported proxy_manager from python_app.services.binance.proxy_manager")
except ImportError:
    try:
        from src.proxy_manager import get_proxy_manager
        logger.info("Imported proxy_manager from src.proxy_manager")
    except ImportError:
        try:
            from proxy_manager import get_proxy_manager
            logger.info("Imported proxy_manager directly")
        except ImportError:
            logger.error("Failed to import proxy_manager")
            sys.exit(1)

def test_proxy_access():
    """Test proxy access to Binance"""
    # Get the proxy manager
    proxy_manager = get_proxy_manager()
    logger.info(f"Loaded {len(proxy_manager.proxy_list)} proxies")
    
    # Try all proxies
    for i in range(len(proxy_manager.proxy_list)):
        try:
            # Get current proxy
            current_proxy = proxy_manager.get_current_proxy()
            if not current_proxy:
                logger.warning("No proxy available")
                continue
                
            # Format proxy URL
            proxy_ip = current_proxy.get('ip')
            proxy_port = current_proxy.get('port')
            proxy_username = current_proxy.get('username')
            proxy_password = current_proxy.get('password')
            
            # Build proxy string
            proxy_str = f"{proxy_ip}:{proxy_port}"
            
            logger.info(f"Testing proxy #{i+1}: {proxy_str}")
            
            # Set up proxy environment variables
            if proxy_username and proxy_password:
                import urllib.parse
                encoded_auth = f"{urllib.parse.quote(proxy_username)}:{urllib.parse.quote(proxy_password)}"
                os.environ['HTTP_PROXY'] = f"http://{encoded_auth}@{proxy_str}"
                os.environ['HTTPS_PROXY'] = f"http://{encoded_auth}@{proxy_str}"
            else:
                os.environ['HTTP_PROXY'] = f"http://{proxy_str}"
                os.environ['HTTPS_PROXY'] = f"http://{proxy_str}"
            
            # Test connection to Binance
            import requests
            response = requests.get('https://api.binance.com/api/v3/ping', timeout=10)
            
            # Check response
            if response.status_code == 200:
                logger.info(f"✅ Proxy #{i+1} successfully connected to Binance API")
                return True
            else:
                logger.warning(f"Proxy #{i+1} failed with status code {response.status_code}")
                
        except Exception as e:
            logger.warning(f"Proxy #{i+1} failed: {e}")
            
        finally:
            # Clear proxy environment variables
            if 'HTTP_PROXY' in os.environ:
                del os.environ['HTTP_PROXY']
            if 'HTTPS_PROXY' in os.environ:
                del os.environ['HTTPS_PROXY']
            
        # Rotate to next proxy
        proxy_manager.rotate_proxy()
        
    # If we get here, all proxies failed
    logger.error("All proxies failed to connect to Binance API")
    
    # Try direct connection
    try:
        logger.info("Trying direct connection to Binance API...")
        response = requests.get('https://api.binance.com/api/v3/ping', timeout=10)
        
        if response.status_code == 200:
            logger.info("✅ Direct connection to Binance API successful")
            return True
        else:
            logger.warning(f"Direct connection failed with status code {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Direct connection failed: {e}")
        return False

if __name__ == "__main__":
    success = test_proxy_access()
    if success:
        print("\n✅ Successfully connected to Binance API")
    else:
        print("\n❌ Failed to connect to Binance API with any method")