#!/usr/bin/env python3
"""
Direct Telegram API Test

This script tests the Telegram API directly using requests,
without relying on the python-telegram-bot library.
"""

import os
import sys
import json
import requests
from datetime import datetime

# Get Telegram credentials from environment
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_ADMIN_CHAT_ID = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')

def send_telegram_message():
    """Send a test message directly via Telegram API"""
    print("\n=== Direct Telegram API Test ===\n")
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
        print("❌ ERROR: Telegram credentials not found in environment variables")
        print(f"Bot token configured: {bool(TELEGRAM_BOT_TOKEN)}")
        print(f"Admin chat ID configured: {bool(TELEGRAM_ADMIN_CHAT_ID)}")
        return False
    
    print(f"✓ Bot token found: {TELEGRAM_BOT_TOKEN[:5]}...{TELEGRAM_BOT_TOKEN[-5:]}")
    print(f"✓ Admin chat ID found: {TELEGRAM_ADMIN_CHAT_ID}")
    
    # Telegram API URL
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    
    # Format a test message
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message = f"""
🔔 *TELEGRAM NOTIFICATION TEST*

✅ *Test Status*: Direct API Test
⏰ *Time*: {now}

This is a direct API test message to verify the Telegram notification system.
    """
    
    # Request data
    data = {
        "chat_id": TELEGRAM_ADMIN_CHAT_ID,
        "text": message,
        "parse_mode": "Markdown"
    }
    
    try:
        # Send the request
        print("Sending test message to Telegram API...")
        response = requests.post(url, json=data)
        
        # Check response
        if response.status_code == 200:
            print("✅ SUCCESS: Test message sent successfully")
            result = response.json()
            print(f"Response: {json.dumps(result, indent=2)}")
            return True
        else:
            print(f"❌ ERROR: Failed to send message, status code: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    
    except Exception as e:
        print(f"❌ ERROR: Exception occurred: {e}")
        return False

if __name__ == "__main__":
    result = send_telegram_message()
    print("\n=== Direct Telegram API Test Complete ===")
    print(f"Overall result: {'SUCCESS' if result else 'FAILED'}")