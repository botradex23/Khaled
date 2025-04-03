"""
Test All Proxies for Binance API Connection

This script tests all proxies listed in the Webshare file
and finds the one with the best connection to Binance API.
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv
from urllib.parse import quote, quote_plus

def load_proxies_from_file(file_path='attached_assets/Webshare 3 proxies 3.txt'):
    """
    Load proxies from the provided file
    
    Args:
        file_path: Path to the proxy file
        
    Returns:
        list: List of dictionaries with IP, port, username, and password
    """
    proxies = []
    try:
        with open(file_path, 'r') as f:
            lines = f.readlines()
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                parts = line.split(':')
                if len(parts) == 4:
                    proxies.append({
                        'ip': parts[0],
                        'port': parts[1],
                        'username': parts[2],
                        'password': parts[3]
                    })
    except Exception as e:
        print(f"Error loading proxies from file: {e}")
    
    return proxies

def test_proxy_connection(proxy, encoding_method='quote_plus', timeout=10):
    """
    Test a proxy connection to Binance API
    
    Args:
        proxy: Dictionary with IP, port, username, and password
        encoding_method: URL encoding method (none, quote, quote_plus)
        timeout: Connection timeout in seconds
        
    Returns:
        tuple: (success, response_time, status_code, error_message)
    """
    ip = proxy['ip']
    port = proxy['port']
    username = proxy['username']
    password = proxy['password']
    
    # Apply URL encoding based on the specified method
    if encoding_method == 'quote':
        encoded_username = quote(username)
        encoded_password = quote(password)
    elif encoding_method == 'quote_plus':
        encoded_username = quote_plus(username)
        encoded_password = quote_plus(password)
    else:  # 'none'
        encoded_username = username
        encoded_password = password
    
    # Create proxy URL
    proxy_url = f"http://{encoded_username}:{encoded_password}@{ip}:{port}"
    
    # Set up proxies for requests
    proxies = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    url = "https://api.binance.com/api/v3/ping"
    
    start_time = time.time()
    try:
        response = requests.get(url, proxies=proxies, timeout=timeout)
        response_time = time.time() - start_time
        
        return (True, response_time, response.status_code, None)
    except Exception as e:
        response_time = time.time() - start_time
        return (False, response_time, None, str(e))

def test_all_proxies_with_encodings(proxies):
    """
    Test all proxies with different encoding methods
    
    Args:
        proxies: List of proxy dictionaries
        
    Returns:
        list: List of successful proxy configurations with performance metrics
    """
    successful_configs = []
    encoding_methods = ['none', 'quote', 'quote_plus']
    
    print(f"Testing {len(proxies)} proxies with {len(encoding_methods)} encoding methods...")
    
    for proxy in proxies:
        print(f"\nTesting proxy: {proxy['ip']}:{proxy['port']}")
        
        for method in encoding_methods:
            print(f"  Testing with encoding method: {method}")
            success, response_time, status_code, error = test_proxy_connection(proxy, method)
            
            if success:
                print(f"  ✅ Success! Response time: {response_time:.3f}s, Status: {status_code}")
                successful_configs.append({
                    'proxy': proxy,
                    'encoding_method': method,
                    'response_time': response_time,
                    'status_code': status_code
                })
            else:
                print(f"  ❌ Failed: {error}")
    
    # Sort by response time (faster first)
    successful_configs.sort(key=lambda x: x['response_time'])
    return successful_configs

def update_env_with_best_proxy(config):
    """
    Update .env file with the best proxy configuration
    
    Args:
        config: Dictionary with proxy configuration
    """
    if not config:
        print("No successful proxy configuration found")
        return
    
    proxy = config['proxy']
    encoding_method = config['encoding_method']
    
    # Read current .env file
    env_file = '.env'
    env_lines = []
    
    try:
        with open(env_file, 'r') as f:
            env_lines = f.readlines()
    except Exception as e:
        print(f"Error reading .env file: {e}")
        return
    
    # Update or add proxy settings
    settings_map = {
        'PROXY_IP': proxy['ip'],
        'PROXY_PORT': proxy['port'],
        'PROXY_USERNAME': proxy['username'],
        'PROXY_PASSWORD': proxy['password'],
        'PROXY_ENCODING_METHOD': encoding_method,
        'USE_PROXY': 'true',
        'PROXY_PROTOCOL': 'http'
    }
    
    updated_lines = []
    settings_found = {key: False for key in settings_map}
    
    # Update existing settings
    for line in env_lines:
        line = line.rstrip()
        updated = False
        
        for key, value in settings_map.items():
            if line.startswith(f"{key}="):
                updated_lines.append(f"{key}={value}")
                settings_found[key] = True
                updated = True
                break
        
        if not updated:
            updated_lines.append(line)
    
    # Add missing settings
    for key, value in settings_map.items():
        if not settings_found[key]:
            updated_lines.append(f"{key}={value}")
    
    # Write updated .env file
    try:
        with open(env_file, 'w') as f:
            for line in updated_lines:
                f.write(f"{line}\n")
        print("✅ .env file updated with best proxy configuration")
    except Exception as e:
        print(f"Error updating .env file: {e}")

def main():
    """Main function"""
    load_dotenv()
    
    # Test direct connection first
    print("Testing direct connection to Binance API...")
    try:
        start_time = time.time()
        response = requests.get("https://api.binance.com/api/v3/ping", timeout=10)
        direct_time = time.time() - start_time
        
        print(f"Direct connection successful! Response time: {direct_time:.3f}s, Status: {response.status_code}")
        
        use_direct = input("Direct connection works. Would you like to disable proxy and use direct connection? (y/n): ")
        if use_direct.lower() == 'y':
            print("Updating .env to use direct connection...")
            
            # Read current .env file
            env_file = '.env'
            env_lines = []
            
            with open(env_file, 'r') as f:
                env_lines = f.readlines()
            
            # Update USE_PROXY setting
            updated_lines = []
            found_use_proxy = False
            
            for line in env_lines:
                line = line.rstrip()
                if line.startswith("USE_PROXY="):
                    updated_lines.append("USE_PROXY=false")
                    found_use_proxy = True
                else:
                    updated_lines.append(line)
            
            if not found_use_proxy:
                updated_lines.append("USE_PROXY=false")
            
            # Write updated .env file
            with open(env_file, 'w') as f:
                for line in updated_lines:
                    f.write(f"{line}\n")
            
            print("✅ .env file updated to use direct connection")
            return
    
    except Exception as e:
        print(f"❌ Direct connection failed: {e}")
    
    # Load proxies from file
    proxies = load_proxies_from_file()
    
    if not proxies:
        print("No proxies found in the file")
        return
    
    print(f"Loaded {len(proxies)} proxies")
    
    # Test all proxies with different encoding methods
    successful_configs = test_all_proxies_with_encodings(proxies)
    
    if successful_configs:
        best_config = successful_configs[0]
        proxy = best_config['proxy']
        
        print("\nBest proxy configuration:")
        print(f"IP: {proxy['ip']}")
        print(f"Port: {proxy['port']}")
        print(f"Username: {proxy['username']}")
        print(f"Password: {proxy['password']}")
        print(f"Encoding method: {best_config['encoding_method']}")
        print(f"Response time: {best_config['response_time']:.3f}s")
        
        update = input("Update .env with this configuration? (y/n): ")
        if update.lower() == 'y':
            update_env_with_best_proxy(best_config)
    else:
        print("\nNo successful proxy configuration found")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        sys.exit(0)