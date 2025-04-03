#!/usr/bin/env python3
"""
Test Flask Application

This script starts the Flask application and tests its endpoints.
"""

import os
import sys
import time
import logging
import requests
import threading
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('test_python_flask')

def start_flask_app():
    """Start the Flask application in a separate thread"""
    import subprocess
    
    # Run the Flask application
    subprocess.Popen([sys.executable, 'run_flask_app.py'])
    
    # Wait for Flask to start
    logger.info("Waiting for Flask application to start...")
    time.sleep(5)
    logger.info("Flask application should be running now")

def test_status_endpoint():
    """Test the status endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/status')
        if response.status_code == 200:
            logger.info("Status endpoint response: %s", response.json())
            return True
        else:
            logger.error("Status endpoint returned status code %d: %s", 
                        response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Error testing status endpoint: %s", e)
        return False

def test_api_status_endpoint():
    """Test the API status endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/binance/status')
        if response.status_code == 200:
            logger.info("API status endpoint response: %s", response.json())
            return True
        else:
            logger.error("API status endpoint returned status code %d: %s", 
                        response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Error testing API status endpoint: %s", e)
        return False

def test_ticker_endpoint():
    """Test the ticker endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/binance/ticker/BTCUSDT')
        if response.status_code == 200:
            logger.info("Ticker endpoint response: %s", response.json())
            return True
        else:
            logger.error("Ticker endpoint returned status code %d: %s", 
                        response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Error testing ticker endpoint: %s", e)
        return False

def test_ml_prediction_endpoint():
    """Test the ML prediction endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/ml/predict/BTCUSDT')
        if response.status_code == 200:
            logger.info("ML prediction endpoint response: %s", response.json())
            return True
        else:
            logger.error("ML prediction endpoint returned status code %d: %s", 
                        response.status_code, response.text)
            return False
    except Exception as e:
        logger.error("Error testing ML prediction endpoint: %s", e)
        return False

def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Start the Flask application in a separate thread
    app_thread = threading.Thread(target=start_flask_app)
    app_thread.daemon = True
    app_thread.start()
    
    # Wait for the Flask application to start
    time.sleep(5)
    
    # Test the endpoints
    logger.info("Testing endpoints...")
    status_ok = test_status_endpoint()
    api_status_ok = test_api_status_endpoint()
    ticker_ok = test_ticker_endpoint()
    ml_prediction_ok = test_ml_prediction_endpoint()
    
    # Print results
    logger.info("Test results:")
    logger.info("Status endpoint: %s", "OK" if status_ok else "FAILED")
    logger.info("API status endpoint: %s", "OK" if api_status_ok else "FAILED")
    logger.info("Ticker endpoint: %s", "OK" if ticker_ok else "FAILED")
    logger.info("ML prediction endpoint: %s", "OK" if ml_prediction_ok else "FAILED")
    
    # Overall result
    if status_ok and api_status_ok and ticker_ok and ml_prediction_ok:
        logger.info("All tests passed!")
    else:
        logger.warning("Some tests failed")

if __name__ == '__main__':
    main()