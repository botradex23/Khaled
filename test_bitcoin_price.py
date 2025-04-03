#!/usr/bin/env python3
"""
Test Bitcoin Price

This script starts the Binance API server,
waits for it to be ready, and then queries
the Bitcoin price.
"""

import os
import sys
import time
import json
import subprocess
import requests
import signal

# Server process
server_process = None

def start_server():
    """Start the Binance API server"""
    global server_process
    
    print("Starting Binance API server...")
    server_process = subprocess.Popen(
        ["python", "binance_api_server.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for server to be ready
    wait_for_server()

def wait_for_server(max_wait=30, port=5001):
    """Wait for the server to be ready"""
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

def get_bitcoin_price():
    """Get Bitcoin price from the API"""
    try:
        response = requests.get("http://localhost:5001/api/binance/ticker/BTCUSDT", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        print(f"Bitcoin Price: ${float(data['price']):,.2f}")
        print(f"Symbol: {data['symbol']}")
        
        return data
    except Exception as e:
        print(f"Error getting Bitcoin price: {e}")
        return None

def get_ethereum_price():
    """Get Ethereum price from the API"""
    try:
        response = requests.get("http://localhost:5001/api/binance/ticker/ETHUSDT", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        print(f"Ethereum Price: ${float(data['price']):,.2f}")
        print(f"Symbol: {data['symbol']}")
        
        return data
    except Exception as e:
        print(f"Error getting Ethereum price: {e}")
        return None

def get_ml_prediction():
    """Get ML prediction for Bitcoin"""
    try:
        response = requests.get("http://localhost:5001/api/ml/predict/BTCUSDT", timeout=5)
        response.raise_for_status()
        data = response.json()
        
        print(f"Bitcoin Price Prediction:")
        print(f"Current Price: ${data['currentPrice']:,.2f}")
        print(f"Predicted Price: ${data['predictedPrice']:,.2f}")
        print(f"Predicted Change: {data['change']:.2f}%")
        print(f"Direction: {data['direction'].upper()}")
        print(f"Confidence: {data['confidence']*100:.1f}%")
        
        return data
    except Exception as e:
        print(f"Error getting ML prediction: {e}")
        return None

def cleanup():
    """Clean up resources"""
    global server_process
    
    if server_process:
        print("Stopping server...")
        server_process.terminate()
        server_process.wait(timeout=5)

def main():
    """Main function"""
    try:
        # Start the server
        start_server()
        
        # Get Bitcoin price
        print("\n=== Bitcoin Price ===")
        get_bitcoin_price()
        
        # Get Ethereum price
        print("\n=== Ethereum Price ===")
        get_ethereum_price()
        
        # Get ML prediction
        print("\n=== ML Prediction ===")
        get_ml_prediction()
        
    except KeyboardInterrupt:
        print("\nInterrupted by user")
    finally:
        cleanup()

if __name__ == "__main__":
    main()