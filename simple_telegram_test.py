#!/usr/bin/env python3
"""
Simple Telegram Notification Test

This script provides a minimal test for the Telegram notification system
without dependencies on other services.
"""

import os
import sys
import logging
import requests
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger("telegram_test")

# Get Telegram credentials from environment
TELEGRAM_BOT_TOKEN = os.environ.get('TELEGRAM_BOT_TOKEN')
TELEGRAM_ADMIN_CHAT_ID = os.environ.get('TELEGRAM_ADMIN_CHAT_ID')

def send_test_message():
    """Send a test message to admin via Telegram using direct API calls"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
        logger.error("Telegram credentials not found in environment variables")
        logger.info(f"Bot token configured: {bool(TELEGRAM_BOT_TOKEN)}")
        logger.info(f"Admin chat ID configured: {bool(TELEGRAM_ADMIN_CHAT_ID)}")
        return False
    
    try:
        # Get bot information first
        bot_info_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/getMe"
        logger.info(f"Getting bot info from Telegram API")
        bot_response = requests.get(bot_info_url)
        bot_response.raise_for_status()
        bot_data = bot_response.json()
        
        if not bot_data.get('ok'):
            logger.error(f"Failed to get bot info: {bot_data.get('description')}")
            return False
            
        bot_username = bot_data['result']['username']
        logger.info(f"Bot initialized: {bot_username}")
        
        # Format a test message
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        message = f"""
🔔 *TELEGRAM NOTIFICATION TEST*

✅ *Test Status*: Successful
⏰ *Time*: {now}
🤖 *Bot Username*: {bot_username}

This is a test message to verify that the Telegram notification system is working properly.
        """
        
        # Send the message using HTTP request
        send_message_url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
        logger.info(f"Sending test message to chat ID: {TELEGRAM_ADMIN_CHAT_ID}")
        
        payload = {
            "chat_id": TELEGRAM_ADMIN_CHAT_ID,
            "text": message,
            "parse_mode": "Markdown"
        }
        
        response = requests.post(send_message_url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        if not result.get('ok'):
            logger.error(f"Failed to send message: {result.get('description')}")
            return False
        logger.info("Test message sent successfully")
        return True
    
    except Exception as e:
        logger.error(f"Failed to send Telegram test message: {e}")
        return False

def main():
    """Main function"""
    print("\n=== Simple Telegram Notification Test ===\n")
    
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_ADMIN_CHAT_ID:
        print("❌ ERROR: Telegram credentials not found in environment variables")
        print(f"Bot token configured: {bool(TELEGRAM_BOT_TOKEN)}")
        print(f"Admin chat ID configured: {bool(TELEGRAM_ADMIN_CHAT_ID)}")
        return False
    
    print(f"✓ Bot token found: {TELEGRAM_BOT_TOKEN[:5]}...{TELEGRAM_BOT_TOKEN[-5:]}")
    print(f"✓ Admin chat ID found: {TELEGRAM_ADMIN_CHAT_ID}")
    
    # Run the test
    result = send_test_message()
    
    print("\n=== Test Results ===")
    if result:
        print("✅ SUCCESS: Telegram test message sent successfully")
    else:
        print("❌ FAILED: Could not send Telegram test message")
    
    print("\n=== Simple Telegram Notification Test Complete ===")
    return result

if __name__ == "__main__":
    main()