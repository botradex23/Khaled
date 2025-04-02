#!/usr/bin/env python3
"""
Test Bot Sync API

This script tests the Bot Synchronizer API endpoint directly without using HTTP.
Instead, it will access the bot_synchronizer instance to get information.
"""

import os
import sys
import json
import logging
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
)
logger = logging.getLogger('bot_sync_test')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Try to import bot_synchronizer directly
try:
    from python_app.services.coordination import bot_synchronizer
except ImportError as e:
    print(f"Failed to import bot_synchronizer: {e}")
    sys.exit(1)

def test_bot_sync_status():
    """Test the bot synchronization status directly"""
    print("Testing Bot Synchronizer Status...")
    
    if not bot_synchronizer:
        print("Bot Synchronizer is not available")
        return
    
    # Collect data directly from bot_synchronizer
    with bot_synchronizer.bot_states_lock:
        active_bots = len(bot_synchronizer.bot_states)
        bot_states = {bot_id: state.get('status') for bot_id, state in bot_synchronizer.bot_states.items()}
    
    with bot_synchronizer.active_trades_lock:
        active_trades = sum(len(trades) for trades in bot_synchronizer.active_trades.values())
        active_symbols = list(bot_synchronizer.active_trades.keys())
    
    collisions = len(bot_synchronizer.collision_history)
    
    # Print data
    print("\nBot Synchronizer Status:")
    print(f"Active Bots: {active_bots}")
    if active_bots > 0:
        print(f"Bot States: {bot_states}")
    
    print(f"Trade Collisions Prevented: {collisions}")
    print(f"Active Trades: {active_trades}")
    if active_trades > 0:
        print(f"Active Symbols: {active_symbols}")
    
    if collisions > 0:
        print("\nCollision Details:")
        for i, collision in enumerate(bot_synchronizer.collision_history):
            print(f"Collision {i+1}: {collision['symbol']} - {collision['new_trade']['side']} vs {collision['existing_trade']['side']}")

def register_test_bot():
    """Register a test bot with the synchronizer"""
    print("Registering test bot...")
    
    # Create a unique bot ID
    bot_id = f"test-bot-{uuid.uuid4().hex[:8]}"
    
    # Register the bot
    bot_synchronizer.register_bot(
        bot_id=bot_id,
        bot_type="TEST_BOT",
        config={
            "symbols": ["BTCUSDT", "ETHUSDT"],
            "test_param": 123.45,
            "is_test": True
        }
    )
    
    # Update the bot status
    bot_synchronizer.update_bot_status(
        bot_id=bot_id,
        status="running",
        details={
            "last_action": "test_registration",
            "test_timestamp": str(datetime.now())
        }
    )
    
    # Register a test trade
    test_trade = {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "quantity": 0.01,
        "price": 50000.0,
        "order_type": "LIMIT",
        "bot_id": bot_id,
        "strategy_id": "test_strategy",
        "trade_id": str(uuid.uuid4())
    }
    
    result = bot_synchronizer.register_trade(test_trade)
    print(f"Trade registration result: {'✅ Success' if result else '❌ Failed'}")
    
    return bot_id

if __name__ == "__main__":
    # Register a test bot
    bot_id = register_test_bot()
    
    # Run the test
    test_bot_sync_status()
    
    print(f"\nTest completed with bot ID: {bot_id}")