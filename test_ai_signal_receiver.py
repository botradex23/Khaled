#!/usr/bin/env python3
"""
Test script for the AI Signal Receiver Service

This script sends test AI trading signals to the receiver endpoint and displays the results.
"""

import requests
import json
import time
import sys
import logging
import os
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ai_signal_test')

# Constants
API_HOST = "http://localhost:5001"  # Flask server port
ENDPOINT = f"{API_HOST}/api/ai-signal"

def send_test_signal(signal_data):
    """
    Send a test signal to the API
    
    Args:
        signal_data: Dictionary with signal data
        
    Returns:
        API response
    """
    logger.info(f"Sending test signal: {json.dumps(signal_data)}")
    
    try:
        response = requests.post(ENDPOINT, json=signal_data, timeout=10)
        
        logger.info(f"Response status: {response.status_code}")
        logger.info(f"Response body: {response.text}")
        
        return response
    except requests.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        return None

def generate_valid_signal():
    """
    Generate a valid test signal
    
    Returns:
        Dictionary with valid signal data
    """
    return {
        "symbol": "BTCUSDT",
        "action": "BUY",
        "confidence": 0.75,
        "timestamp": datetime.utcnow().isoformat(),
        "source": "test_script",
        "metadata": {
            "test_run": True,
            "run_id": f"test_{int(time.time())}"
        }
    }

def generate_invalid_signal():
    """
    Generate an invalid test signal
    
    Returns:
        Dictionary with invalid signal data
    """
    return {
        "symbol": "BTCUSDT",
        "action": "INVALID_ACTION",  # Invalid action
        "confidence": 2.5,  # Invalid confidence (outside 0-1 range)
        "timestamp": "not-a-timestamp"  # Invalid timestamp format
    }

def list_received_signals():
    """
    List signals that have been received
    
    Returns:
        API response
    """
    list_endpoint = f"{API_HOST}/api/ai-signals"
    
    try:
        response = requests.get(list_endpoint, timeout=10)
        
        logger.info(f"List response status: {response.status_code}")
        logger.info(f"Received signals: {response.text}")
        
        return response
    except requests.RequestException as e:
        logger.error(f"List request failed: {str(e)}")
        return None

def main():
    """Main function"""
    logger.info("=== AI Signal Receiver Test ===")
    
    # Test 1: Send a valid signal
    logger.info("\n--- Test 1: Send a valid signal ---")
    valid_signal = generate_valid_signal()
    response1 = send_test_signal(valid_signal)
    
    test1_passed = response1 and response1.status_code == 201
    if test1_passed:
        logger.info("✅ Valid signal test passed!")
    else:
        logger.error("❌ Valid signal test failed")
    
    # Pause to allow signal processing
    time.sleep(1)
    
    # Test 2: Send an invalid signal - we expect it to be rejected with 400 status
    logger.info("\n--- Test 2: Send an invalid signal ---")
    invalid_signal = generate_invalid_signal()
    response2 = send_test_signal(invalid_signal)
    
    # For this test, 400 status is actually SUCCESS (we want the server to reject it)
    test2_passed = response2 is not None and response2.status_code == 400
    if test2_passed:
        logger.info("✅ Invalid signal test passed! (Correctly rejected with 400 status code)")
    else:
        status = "no response" if response2 is None else f"{response2.status_code}"
        logger.error(f"❌ Invalid signal test failed (Expected 400 status code, got {status})")
        # Debug the response that we got
        if response2 is not None:
            logger.debug(f"Response content: {response2.text}")
    
    # Pause to allow signal processing
    time.sleep(1)
    
    # Test 3: List received signals
    logger.info("\n--- Test 3: List received signals ---")
    list_response = list_received_signals()
    
    test3_passed = False
    if list_response and list_response.status_code == 200:
        try:
            data = list_response.json()
            test3_passed = data.get('success', False) and 'signals' in data
            if test3_passed:
                logger.info(f"✅ List signals test passed! Found {len(data['signals'])} signals")
            else:
                logger.error("❌ List signals test failed (unexpected response format)")
        except json.JSONDecodeError:
            logger.error("❌ List signals test failed (invalid JSON response)")
    else:
        logger.error("❌ List signals test failed (request error)")
    
    # Print summary
    logger.info("\n=== Test Summary ===")
    
    # Test variables are already defined in the respective test sections
    
    if test1_passed and test2_passed and test3_passed:
        logger.info("🎉 All tests passed!")
        return 0
    else:
        failed_tests = []
        if not test1_passed: failed_tests.append("Valid signal test")
        if not test2_passed: failed_tests.append("Invalid signal test")
        if not test3_passed: failed_tests.append("List signals test")
        
        logger.error(f"❌ Some tests failed: {', '.join(failed_tests)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())