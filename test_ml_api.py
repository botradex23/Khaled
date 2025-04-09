#!/usr/bin/env python3
"""
Test script for ML API connection
"""

import requests
import time
import sys

def test_ml_api_connection():
    """Test connection to ML API"""
    print("Testing connection to ML API...")
    
    # Wait a few seconds for the API to start
    time.sleep(5)
    
    # Try to connect to the API
    try:
        response = requests.get("http://localhost:5001/api/status", timeout=5)
        
        if response.status_code == 200:
            print("Successfully connected to ML API!")
            print("Response:", response.json())
            return True
        else:
            print(f"Error connecting to ML API: Status code {response.status_code}")
            print("Response:", response.text)
            return False
    except requests.exceptions.RequestException as e:
        print(f"Error connecting to ML API: {e}")
        return False

if __name__ == "__main__":
    # Test connection
    success = test_ml_api_connection()
    sys.exit(0 if success else 1)
