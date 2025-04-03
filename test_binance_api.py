#!/usr/bin/env python3
"""
Test Binance API Integration

This script tests the integration with Binance API using the configured proxies.
"""

import os
import sys
import time
import json
import logging
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('test_binance_api')

def test_ping():
    """Test the basic ping endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/binance/ping')
        logger.info(f"Ping response: {response.status_code} - {response.text}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error testing ping endpoint: {e}")
        return False

def test_status():
    """Test the status endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/binance/status')
        logger.info(f"Status response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Connected to Binance API: {data.get('connected', False)}")
            logger.info(f"API Key status: {data.get('hasApiKey', False)}")
            logger.info(f"Secret Key status: {data.get('hasSecretKey', False)}")
            logger.info(f"Using proxy: {data.get('usingProxy', False)}")
            logger.info(f"Proxy info: {data.get('proxyInfo', 'N/A')}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error testing status endpoint: {e}")
        return False

def test_ticker_price():
    """Test retrieving ticker price"""
    try:
        response = requests.get('http://localhost:5001/api/binance/ticker/BTCUSDT')
        logger.info(f"Ticker response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"BTCUSDT price: {data.get('price', 'N/A')}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error testing ticker endpoint: {e}")
        return False

def test_account_info():
    """Test retrieving account information"""
    try:
        response = requests.get('http://localhost:5001/api/binance/account')
        logger.info(f"Account info response: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"Account data received successfully")
            return True
        logger.warning(f"Account info error: {response.text}")
        return False
    except Exception as e:
        logger.error(f"Error testing account endpoint: {e}")
        return False

def test_ml_prediction():
    """Test ML prediction endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/ml/predict/BTCUSDT')
        logger.info(f"ML prediction response: {response.status_code} - {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            logger.info(f"BTCUSDT prediction: {data.get('prediction', 'N/A')}")
            logger.info(f"Confidence: {data.get('confidence', 'N/A')}")
            return True
        return False
    except Exception as e:
        logger.error(f"Error testing ML prediction endpoint: {e}")
        return False

def run_tests():
    """Run all tests"""
    logger.info("Testing Binance API integration...")
    
    # Test basic ping
    logger.info("\n=== Testing Basic Ping ===")
    ping_success = test_ping()
    
    # Test status
    logger.info("\n=== Testing API Status ===")
    status_success = test_status()
    
    # Test ticker price
    logger.info("\n=== Testing Ticker Price ===")
    ticker_success = test_ticker_price()
    
    # Test account info
    logger.info("\n=== Testing Account Info ===")
    account_success = test_account_info()
    
    # Test ML prediction
    logger.info("\n=== Testing ML Prediction ===")
    ml_success = test_ml_prediction()
    
    # Print summary
    logger.info("\n=== Test Summary ===")
    logger.info(f"Basic Ping: {'✅ Success' if ping_success else '❌ Failed'}")
    logger.info(f"API Status: {'✅ Success' if status_success else '❌ Failed'}")
    logger.info(f"Ticker Price: {'✅ Success' if ticker_success else '❌ Failed'}")
    logger.info(f"Account Info: {'✅ Success' if account_success else '❌ Failed'}")
    logger.info(f"ML Prediction: {'✅ Success' if ml_success else '❌ Failed'}")
    
    all_success = all([ping_success, status_success, ticker_success, account_success, ml_success])
    logger.info(f"\nOverall result: {'✅ All tests passed!' if all_success else '❌ Some tests failed'}")
    
    return all_success

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Wait for the Flask server to start
    logger.info("Waiting for Flask server to start...")
    time.sleep(5)
    
    # Run tests
    return run_tests()

if __name__ == '__main__':
    main()