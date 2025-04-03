#!/usr/bin/env python3
"""
Check if the Binance API server is running
"""

import sys
import requests
import time

def wait_for_server(max_wait=30, port=5001):
    """
    Wait for the server to come online
    
    Args:
        max_wait: Maximum wait time in seconds
        port: Port to check
    
    Returns:
        bool: Whether the server is online
    """
    print(f"Waiting for server on port {port}...")
    
    for i in range(max_wait):
        try:
            response = requests.get(f"http://localhost:{port}/api/status", timeout=1)
            if response.status_code == 200:
                print(f"Server is online! Response: {response.json()}")
                return True
        except Exception:
            pass
        
        sys.stdout.write(f"\rWaiting {i+1}/{max_wait} seconds...")
        sys.stdout.flush()
        time.sleep(1)
    
    print("\nServer did not come online within the timeout period.")
    return False

def main():
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    else:
        port = 5001
    
    wait_for_server(port=port)

if __name__ == "__main__":
    main()