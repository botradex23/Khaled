#!/usr/bin/env python3
"""
Telegram Bot Check

This script checks if the Telegram bot token is valid by making a getMe API call.
"""

import os
import sys
import logging
import requests
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_telegram_bot():
    """Check if the Telegram bot token is valid"""
    # Load environment variables
    load_dotenv()
    
    # Get the bot token from environment
    token = os.getenv('TELEGRAM_BOT_TOKEN')
    
    if not token:
        logger.error("❌ TELEGRAM_BOT_TOKEN not found in environment variables")
        return False
    
    # Make a request to the Telegram Bot API
    url = f"https://api.telegram.org/bot{token}/getMe"
    
    try:
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if response.status_code == 200 and data.get('ok'):
            bot_info = data.get('result', {})
            bot_name = bot_info.get('username')
            logger.info(f"✅ Telegram bot token is valid for bot: @{bot_name}")
            return True
        else:
            error = data.get('description', 'Unknown error')
            logger.error(f"❌ Telegram bot token is invalid: {error}")
            return False
    except Exception as e:
        logger.error(f"❌ Error checking Telegram bot token: {e}")
        return False

def main():
    """Main function"""
    result = check_telegram_bot()
    return 0 if result else 1

if __name__ == "__main__":
    sys.exit(main())