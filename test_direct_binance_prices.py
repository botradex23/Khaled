#!/usr/bin/env python3
"""
Test Script for Direct Binance Prices API

This script tests the direct Binance price API which uses the official Binance SDK
without fallbacks or simulations.
"""

import os
import sys
import json
import requests
import time
from typing import Dict, List, Any, Optional

# Configure colors for terminal output
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(message: str) -> None:
    """Print a header message"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD} {message} {Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'=' * 80}{Colors.ENDC}\n")

def print_success(message: str) -> None:
    """Print a success message"""
    print(f"{Colors.GREEN}✓ {message}{Colors.ENDC}")

def print_warning(message: str) -> None:
    """Print a warning message"""
    print(f"{Colors.WARNING}⚠ {message}{Colors.ENDC}")

def print_error(message: str) -> None:
    """Print an error message"""
    print(f"{Colors.FAIL}✗ {message}{Colors.ENDC}")

def print_info(message: str) -> None:
    """Print an info message"""
    print(f"{Colors.CYAN}ℹ {message}{Colors.ENDC}")

def test_direct_binance_prices() -> None:
    """Test the direct Binance prices API"""
    BASE_URL = "http://localhost:5001"  # Flask server runs on port 5001
    
    # Test endpoints
    endpoints = [
        # Basic connectivity test
        {
            "name": "Ping API",
            "url": f"{BASE_URL}/api/direct-binance/ping",
            "method": "GET",
            "test_function": lambda r: r.get("success") == True
        },
        # Test getting all prices
        {
            "name": "Get All Prices",
            "url": f"{BASE_URL}/api/direct-binance/prices",
            "method": "GET",
            "test_function": lambda r: r.get("success") == True and len(r.get("prices", [])) > 0
        },
        # Test getting price for BTC
        {
            "name": "Get BTC Price",
            "url": f"{BASE_URL}/api/direct-binance/price/BTCUSDT",
            "method": "GET",
            "test_function": lambda r: r.get("success") == True and r.get("price", {}).get("symbol") == "BTCUSDT"
        },
        # Test getting 24hr ticker
        {
            "name": "Get 24hr Ticker",
            "url": f"{BASE_URL}/api/direct-binance/ticker/24hr?symbol=BTCUSDT",
            "method": "GET",
            "test_function": lambda r: r.get("success") == True and r.get("data", {}).get("symbol") == "BTCUSDT"
        },
        # Test raw prices endpoint (minimal processing)
        {
            "name": "Get Raw Prices",
            "url": f"{BASE_URL}/api/direct-binance/raw/prices",
            "method": "GET",
            "test_function": lambda r: isinstance(r, list) and len(r) > 0
        }
    ]
    
    print_header("TESTING DIRECT BINANCE PRICES API")
    print_info(f"Testing against base URL: {BASE_URL}")
    print_info("Running tests using direct Binance SDK (no fallbacks, no simulations)")
    
    # Run each test
    results = []
    for endpoint in endpoints:
        test_name = endpoint["name"]
        url = endpoint["url"]
        method = endpoint["method"]
        test_function = endpoint["test_function"]
        
        print(f"\n{Colors.BLUE}{Colors.BOLD}Testing: {test_name}{Colors.ENDC}")
        print(f"  URL: {url}")
        print(f"  Method: {method}")
        
        try:
            # Make the request
            start_time = time.time()
            response = requests.request(method, url)
            end_time = time.time()
            duration = end_time - start_time
            
            # Check HTTP status
            if response.status_code >= 200 and response.status_code < 300:
                print_success(f"HTTP {response.status_code} - Response received in {duration:.2f}s")
                
                # Parse response
                try:
                    if response.text:
                        response_data = response.json()
                        # Test the response data
                        if test_function(response_data):
                            print_success("Test passed - Response data meets expectations")
                            # Print a sample of the data
                            print_info("Response data sample:")
                            if isinstance(response_data, list):
                                sample = response_data[:2] if len(response_data) > 2 else response_data
                                print(json.dumps(sample, indent=2))
                            elif isinstance(response_data, dict):
                                if "prices" in response_data and isinstance(response_data["prices"], list):
                                    response_data["prices"] = response_data["prices"][:2] if len(response_data["prices"]) > 2 else response_data["prices"]
                                print(json.dumps(response_data, indent=2))
                            results.append({"name": test_name, "success": True})
                        else:
                            print_error("Test failed - Response data does not meet expectations")
                            print_info("Actual response:")
                            print(json.dumps(response_data, indent=2))
                            results.append({"name": test_name, "success": False})
                    else:
                        print_warning("Empty response received")
                        results.append({"name": test_name, "success": False})
                except json.JSONDecodeError:
                    print_error("Failed to parse JSON response")
                    print_info("Raw response:")
                    print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
                    results.append({"name": test_name, "success": False})
            else:
                print_error(f"HTTP {response.status_code} - Request failed")
                print_info("Response:")
                print(response.text[:500] + "..." if len(response.text) > 500 else response.text)
                results.append({"name": test_name, "success": False})
        except requests.RequestException as e:
            print_error(f"Request error: {e}")
            results.append({"name": test_name, "success": False})
    
    # Print summary
    print_header("TEST RESULTS SUMMARY")
    successful_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)
    print(f"{Colors.BOLD}Tests passed: {successful_tests}/{total_tests} ({successful_tests/total_tests*100:.1f}%){Colors.ENDC}")
    
    if successful_tests == total_tests:
        print_success("All tests passed! The Direct Binance Prices API is working correctly.")
    else:
        print_warning("Some tests failed. Please check the errors above.")
        for result in results:
            if not result["success"]:
                print_error(f"Failed test: {result['name']}")

if __name__ == "__main__":
    test_direct_binance_prices()