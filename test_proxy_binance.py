#!/usr/bin/env python3
"""
Test Binance Proxy Connection with Updated Settings

This script tests the Binance connection using all three proxies
from the WebShare proxy list to find which one works best.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('proxy_test')

# Try to import Binance SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    BINANCE_SDK_AVAILABLE = True
except ImportError:
    logger.error("Binance SDK not found. Install with: pip install binance-connector")
    BINANCE_SDK_AVAILABLE = False
    class Spot:
        def __init__(self, *args, **kwargs):
            pass
        
        def ping(self):
            return {}
    
    class ClientError(Exception):
        pass
    
    class ServerError(Exception):
        pass

# Load environment variables from .env
def load_env():
    """Load environment variables from .env file"""
    env_vars = {}
    try:
        with open(".env", "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                key, value = line.split("=", 1)
                env_vars[key] = value
        return env_vars
    except Exception as e:
        logger.error(f"Error loading .env: {e}")
        return {}

# Load proxies from file
def load_proxies(file_path="attached_assets/Webshare 3 proxies 3.txt"):
    """Load proxies from the WebShare file"""
    proxies = []
    try:
        with open(file_path, "r") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(":")
                if len(parts) == 4:
                    proxy = {
                        "ip": parts[0],
                        "port": parts[1],
                        "username": parts[2],
                        "password": parts[3]
                    }
                    proxies.append(proxy)
        return proxies
    except Exception as e:
        logger.error(f"Error loading proxies: {e}")
        return []

# Test Binance connection with a specific proxy
def test_binance_with_proxy(proxy, env_vars, encoding_method="quote", protocol="https"):
    """
    Test Binance connection with a specific proxy configuration
    
    Args:
        proxy: Proxy configuration dict with ip, port, username, password
        env_vars: Environment variables dict
        encoding_method: URL encoding method ('none', 'quote', 'quote_plus')
        protocol: Proxy protocol ('http' or 'https')
        
    Returns:
        dict: Test result with success, latency, and error message if any
    """
    if not BINANCE_SDK_AVAILABLE:
        return {"success": False, "error": "Binance SDK not available"}
    
    # Apply URL encoding based on method
    if encoding_method == "none":
        username = proxy["username"]
        password = proxy["password"]
    elif encoding_method == "quote":
        username = urllib.parse.quote(proxy["username"])
        password = urllib.parse.quote(proxy["password"])
    elif encoding_method == "quote_plus":
        username = urllib.parse.quote_plus(proxy["username"])
        password = urllib.parse.quote_plus(proxy["password"])
    else:
        username = proxy["username"]
        password = proxy["password"]
    
    # Create proxy URL
    proxy_url = f"{protocol}://{username}:{password}@{proxy['ip']}:{proxy['port']}"
    proxies = {
        "http": proxy_url,
        "https": proxy_url
    }
    
    # Get API key and secret from environment variables
    api_key = env_vars.get("BINANCE_API_KEY", "")
    api_secret = env_vars.get("BINANCE_SECRET_KEY", "")
    use_testnet = env_vars.get("USE_TESTNET", "true").lower() == "true"
    
    # Set base URL based on testnet setting
    base_url = "https://testnet.binance.vision" if use_testnet else "https://api.binance.com"
    
    try:
        # Create Binance client with proxy
        start_time = time.time()
        client = Spot(
            base_url=base_url,
            api_key=api_key,
            api_secret=api_secret,
            proxies=proxies,
            timeout=10
        )
        
        # Test connection with ping
        client.ping()
        
        # Try a simple API call
        ticker = client.ticker_price(symbol="BTCUSDT")
        latency = time.time() - start_time
        
        return {
            "success": True,
            "latency": latency,
            "ticker": ticker,
            "proxy": f"{proxy['ip']}:{proxy['port']}",
            "encoding": encoding_method,
            "protocol": protocol
        }
    except ClientError as e:
        return {
            "success": False,
            "error": f"Client error: {e}",
            "proxy": f"{proxy['ip']}:{proxy['port']}",
            "encoding": encoding_method,
            "protocol": protocol
        }
    except ServerError as e:
        return {
            "success": False,
            "error": f"Server error: {e}",
            "proxy": f"{proxy['ip']}:{proxy['port']}",
            "encoding": encoding_method,
            "protocol": protocol
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {e}",
            "proxy": f"{proxy['ip']}:{proxy['port']}",
            "encoding": encoding_method,
            "protocol": protocol
        }

# Test direct connection without proxy
def test_direct_connection(env_vars):
    """
    Test direct connection to Binance without proxy
    
    Args:
        env_vars: Environment variables dict
        
    Returns:
        dict: Test result with success, latency, and error message if any
    """
    if not BINANCE_SDK_AVAILABLE:
        return {"success": False, "error": "Binance SDK not available"}
    
    # Get API key and secret from environment variables
    api_key = env_vars.get("BINANCE_API_KEY", "")
    api_secret = env_vars.get("BINANCE_SECRET_KEY", "")
    use_testnet = env_vars.get("USE_TESTNET", "true").lower() == "true"
    
    # Set base URL based on testnet setting
    base_url = "https://testnet.binance.vision" if use_testnet else "https://api.binance.com"
    
    try:
        # Create Binance client without proxy
        start_time = time.time()
        client = Spot(
            base_url=base_url,
            api_key=api_key,
            api_secret=api_secret,
            timeout=10
        )
        
        # Test connection with ping
        client.ping()
        
        # Try a simple API call
        ticker = client.ticker_price(symbol="BTCUSDT")
        latency = time.time() - start_time
        
        return {
            "success": True,
            "latency": latency,
            "ticker": ticker,
            "method": "direct"
        }
    except ClientError as e:
        return {
            "success": False,
            "error": f"Client error: {e}",
            "method": "direct"
        }
    except ServerError as e:
        return {
            "success": False,
            "error": f"Server error: {e}",
            "method": "direct"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Unexpected error: {e}",
            "method": "direct"
        }

# Run tests for all proxy combinations
def test_all_combinations():
    """Test all proxy combinations and return the best one"""
    env_vars = load_env()
    proxies = load_proxies()
    
    if not proxies:
        logger.error("No proxies found in the file")
        return None
    
    # Test combinations of encoding methods and protocols
    encoding_methods = ["quote", "quote_plus", "none"]
    protocols = ["https", "http"]
    
    results = []
    
    # Test direct connection first
    logger.info("Testing direct connection...")
    direct_result = test_direct_connection(env_vars)
    if direct_result["success"]:
        logger.info(f"Direct connection successful! Latency: {direct_result['latency']:.3f}s")
        direct_result["source"] = "direct"
        results.append(direct_result)
    else:
        logger.warning(f"Direct connection failed: {direct_result['error']}")
    
    # Test each proxy with different combinations
    for proxy in proxies:
        logger.info(f"Testing proxy {proxy['ip']}:{proxy['port']}...")
        
        for protocol in protocols:
            for encoding_method in encoding_methods:
                logger.info(f"Testing with {protocol} protocol and {encoding_method} encoding...")
                result = test_binance_with_proxy(
                    proxy, 
                    env_vars,
                    encoding_method=encoding_method,
                    protocol=protocol
                )
                
                if result["success"]:
                    logger.info(f"Success! Latency: {result['latency']:.3f}s")
                    result["source"] = "proxy"
                    results.append(result)
                else:
                    logger.warning(f"Failed: {result['error']}")
    
    # Find the best result (lowest latency)
    successful_results = [r for r in results if r["success"]]
    if successful_results:
        best_result = min(successful_results, key=lambda x: x["latency"])
        logger.info("\n===== BEST CONNECTION =====")
        if best_result["source"] == "direct":
            logger.info("Direct connection is best")
            logger.info(f"Latency: {best_result['latency']:.3f}s")
        else:
            logger.info(f"Proxy: {best_result['proxy']}")
            logger.info(f"Protocol: {best_result['protocol']}")
            logger.info(f"Encoding: {best_result['encoding']}")
            logger.info(f"Latency: {best_result['latency']:.3f}s")
        
        # Update .env file with best settings
        if best_result["source"] == "proxy":
            logger.info("\nUpdating .env file with best settings...")
            update_env_with_best_settings(
                env_vars,
                best_result["proxy"].split(":")[0],
                best_result["proxy"].split(":")[1],
                proxy["username"],
                proxy["password"],
                best_result["protocol"],
                best_result["encoding"]
            )
        
        return best_result
    else:
        logger.error("All connection attempts failed")
        return None

# Update .env file with best settings
def update_env_with_best_settings(env_vars, ip, port, username, password, protocol, encoding):
    """Update .env file with the best proxy settings"""
    try:
        # Read current .env file
        with open(".env", "r") as f:
            lines = f.readlines()
        
        # Update settings
        updated_lines = []
        settings_updated = {
            "PROXY_IP": False,
            "PROXY_PORT": False,
            "PROXY_USERNAME": False,
            "PROXY_PASSWORD": False,
            "USE_PROXY": False,
            "PROXY_PROTOCOL": False,
            "PROXY_ENCODING_METHOD": False
        }
        
        for line in lines:
            stripped = line.strip()
            if not stripped or stripped.startswith("#"):
                updated_lines.append(line)
                continue
            
            try:
                key, value = stripped.split("=", 1)
                key = key.strip()
                
                if key == "PROXY_IP":
                    updated_lines.append(f"PROXY_IP={ip}\n")
                    settings_updated["PROXY_IP"] = True
                elif key == "PROXY_PORT":
                    updated_lines.append(f"PROXY_PORT={port}\n")
                    settings_updated["PROXY_PORT"] = True
                elif key == "PROXY_USERNAME":
                    updated_lines.append(f"PROXY_USERNAME={username}\n")
                    settings_updated["PROXY_USERNAME"] = True
                elif key == "PROXY_PASSWORD":
                    updated_lines.append(f"PROXY_PASSWORD={password}\n")
                    settings_updated["PROXY_PASSWORD"] = True
                elif key == "USE_PROXY":
                    updated_lines.append(f"USE_PROXY=true\n")
                    settings_updated["USE_PROXY"] = True
                elif key == "PROXY_PROTOCOL":
                    updated_lines.append(f"PROXY_PROTOCOL={protocol}\n")
                    settings_updated["PROXY_PROTOCOL"] = True
                elif key == "PROXY_ENCODING_METHOD":
                    updated_lines.append(f"PROXY_ENCODING_METHOD={encoding}\n")
                    settings_updated["PROXY_ENCODING_METHOD"] = True
                else:
                    updated_lines.append(line)
            except ValueError:
                updated_lines.append(line)
        
        # Add any missing settings at the end
        for key, updated in settings_updated.items():
            if not updated:
                if key == "PROXY_IP":
                    updated_lines.append(f"PROXY_IP={ip}\n")
                elif key == "PROXY_PORT":
                    updated_lines.append(f"PROXY_PORT={port}\n")
                elif key == "PROXY_USERNAME":
                    updated_lines.append(f"PROXY_USERNAME={username}\n")
                elif key == "PROXY_PASSWORD":
                    updated_lines.append(f"PROXY_PASSWORD={password}\n")
                elif key == "USE_PROXY":
                    updated_lines.append(f"USE_PROXY=true\n")
                elif key == "PROXY_PROTOCOL":
                    updated_lines.append(f"PROXY_PROTOCOL={protocol}\n")
                elif key == "PROXY_ENCODING_METHOD":
                    updated_lines.append(f"PROXY_ENCODING_METHOD={encoding}\n")
        
        # Write updated .env file
        with open(".env", "w") as f:
            f.writelines(updated_lines)
        
        logger.info("Updated .env file successfully")
    except Exception as e:
        logger.error(f"Error updating .env file: {e}")

def main():
    """Main function"""
    logger.info("Testing Binance proxy connections...")
    result = test_all_combinations()
    
    if result:
        logger.info("\nTest completed successfully")
        return 0
    else:
        logger.error("\nTest failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())