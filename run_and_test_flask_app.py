#!/usr/bin/env python3
"""
Run and Test Flask Application

This script starts the Flask application in the background and then runs tests.
"""

import os
import sys
import time
import logging
import threading
import subprocess
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('run_and_test_flask_app')

def start_flask_app():
    """Start the Flask application in a subprocess"""
    flask_process = subprocess.Popen(
        [sys.executable, 'run_flask_app.py'],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        universal_newlines=True
    )
    
    logger.info("Flask application started, PID: %s", flask_process.pid)
    return flask_process

def wait_for_server(max_retries=10):
    """Wait for the server to start up"""
    for i in range(max_retries):
        try:
            response = requests.get('http://localhost:5001/api/status')
            if response.status_code == 200:
                logger.info("Flask server is up and running!")
                return True
        except requests.exceptions.ConnectionError:
            logger.info(f"Waiting for server to start... (Attempt {i+1}/{max_retries})")
            time.sleep(3)
    
    logger.error(f"Server did not start in {max_retries * 3} seconds")
    return False

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
    
    # Test ML prediction
    logger.info("\n=== Testing ML Prediction ===")
    ml_success = test_ml_prediction()
    
    # Print summary
    logger.info("\n=== Test Summary ===")
    logger.info(f"Basic Ping: {'✅ Success' if ping_success else '❌ Failed'}")
    logger.info(f"API Status: {'✅ Success' if status_success else '❌ Failed'}")
    logger.info(f"Ticker Price: {'✅ Success' if ticker_success else '❌ Failed'}")
    logger.info(f"ML Prediction: {'✅ Success' if ml_success else '❌ Failed'}")
    
    all_success = all([ping_success, status_success, ticker_success, ml_success])
    logger.info(f"\nOverall result: {'✅ All tests passed!' if all_success else '❌ Some tests failed'}")
    
    return all_success

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Start the Flask application
    flask_process = start_flask_app()
    
    # Wait for the server to start
    if not wait_for_server():
        logger.error("Flask server did not start properly")
        flask_process.terminate()
        return False
    
    # Run tests
    success = run_tests()
    
    # Continue running the server for a while so user can test manually
    logger.info("\nFlask server is running and will stay alive for 10 minutes...")
    logger.info("You can access the API at http://localhost:5001/api/")
    logger.info("Press Ctrl+C to stop the server")
    
    try:
        # Keep running for 10 minutes
        time.sleep(600)
    except KeyboardInterrupt:
        logger.info("Received keyboard interrupt. Shutting down...")
    finally:
        # Terminate Flask process
        flask_process.terminate()
        logger.info("Flask server has been stopped")
    
    return success

if __name__ == '__main__':
    main()