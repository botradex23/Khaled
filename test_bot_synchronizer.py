#!/usr/bin/env python3
"""
Test Bot Synchronizer

This script tests the Bot Synchronizer functionality by simulating multiple bots
attempting to execute trades on the same symbol simultaneously.
"""

import os
import sys
import time
import logging
import threading
import json
import uuid
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'bot_sync_test.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('bot_sync_test')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import services
try:
    from python_app.services.coordination import bot_synchronizer, LockType
    from python_app.services.queue.queue_bot_integration import is_integrated
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    sys.exit(1)

def generate_bot_id():
    """Generate a unique bot ID"""
    return f"bot-{uuid.uuid4().hex[:8]}"

def test_register_bots():
    """Test registering multiple bots with the synchronizer"""
    logger.info("=== Testing Bot Registration ===")
    
    # Register 3 different types of bots
    bot_ids = []
    
    # 1. Grid Bot
    grid_bot_id = generate_bot_id()
    bot_synchronizer.register_bot(
        bot_id=grid_bot_id,
        bot_type="GRID",
        config={
            "symbols": ["BTCUSDT", "ETHUSDT"],
            "grid_levels": 5,
            "total_investment": 1000.0
        }
    )
    bot_ids.append(grid_bot_id)
    
    # 2. DCA Bot
    dca_bot_id = generate_bot_id()
    bot_synchronizer.register_bot(
        bot_id=dca_bot_id,
        bot_type="DCA",
        config={
            "symbol": "BTCUSDT",
            "initial_investment": 500.0,
            "dca_interval_hours": 24
        }
    )
    bot_ids.append(dca_bot_id)
    
    # 3. MACD Bot
    macd_bot_id = generate_bot_id()
    bot_synchronizer.register_bot(
        bot_id=macd_bot_id,
        bot_type="MACD",
        config={
            "symbols": ["ETHUSDT", "ADAUSDT"],
            "fast_length": 12,
            "slow_length": 26,
            "signal_smoothing": 9
        }
    )
    bot_ids.append(macd_bot_id)
    
    # Verify bot registration
    with bot_synchronizer.bot_states_lock:
        logger.info(f"Registered {len(bot_synchronizer.bot_states)} bots")
        for bot_id, bot_state in bot_synchronizer.bot_states.items():
            logger.info(f"Bot {bot_id} ({bot_state['type']}): {bot_state['status']}")
            logger.info(f"  Trading pairs: {bot_state['trading_pairs']}")
    
    return bot_ids

def test_update_bot_status(bot_ids):
    """Test updating bot status"""
    logger.info("=== Testing Bot Status Updates ===")
    
    # Update status for each bot
    for i, bot_id in enumerate(bot_ids):
        if i == 0:
            # Start first bot
            bot_synchronizer.update_bot_status(
                bot_id=bot_id,
                status="running",
                details={
                    "last_trade_time": datetime.now().isoformat(),
                    "trades_executed": 5,
                    "profit_percentage": 2.3
                }
            )
        elif i == 1:
            # Pause second bot
            bot_synchronizer.update_bot_status(
                bot_id=bot_id,
                status="paused",
                details={
                    "pause_reason": "market volatility",
                    "pause_time": datetime.now().isoformat()
                }
            )
        else:
            # Error on third bot
            bot_synchronizer.update_bot_status(
                bot_id=bot_id,
                status="error",
                details={
                    "error_message": "API connection failed",
                    "error_time": datetime.now().isoformat()
                }
            )
    
    # Verify status updates
    with bot_synchronizer.bot_states_lock:
        for bot_id in bot_ids:
            logger.info(f"Bot {bot_id} status: {bot_synchronizer.bot_states[bot_id]['status']}")

def test_register_trades(bot_ids):
    """Test registering trades and detecting conflicts"""
    logger.info("=== Testing Trade Registration and Conflict Detection ===")
    
    # Prepare test trades
    test_trades = [
        # Trade 1 - Grid Bot BUY BTCUSDT
        {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.01,
            "price": 50000.0,
            "order_type": "LIMIT",
            "bot_id": bot_ids[0],
            "strategy_id": "grid_strategy",
            "trade_id": str(uuid.uuid4())
        },
        # Trade 2 - DCA Bot BUY BTCUSDT (should be allowed, same direction)
        {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.02,
            "price": 50100.0,
            "order_type": "MARKET",
            "bot_id": bot_ids[1],
            "strategy_id": "dca_strategy",
            "trade_id": str(uuid.uuid4())
        },
        # Trade 3 - MACD Bot SELL BTCUSDT (should be REJECTED, opposite direction)
        {
            "symbol": "BTCUSDT",
            "side": "SELL",
            "quantity": 0.015,
            "price": 50200.0,
            "order_type": "LIMIT",
            "bot_id": bot_ids[2],
            "strategy_id": "macd_strategy",
            "trade_id": str(uuid.uuid4())
        },
        # Trade 4 - Grid Bot SELL ETHUSDT (should be allowed, different symbol)
        {
            "symbol": "ETHUSDT",
            "side": "SELL",
            "quantity": 0.1,
            "price": 3000.0,
            "order_type": "LIMIT",
            "bot_id": bot_ids[0],
            "strategy_id": "grid_strategy",
            "trade_id": str(uuid.uuid4())
        },
        # Trade 5 - MACD Bot SELL ETHUSDT (should be allowed, same direction)
        {
            "symbol": "ETHUSDT",
            "side": "SELL",
            "quantity": 0.2,
            "price": 3010.0,
            "order_type": "MARKET",
            "bot_id": bot_ids[2],
            "strategy_id": "macd_strategy",
            "trade_id": str(uuid.uuid4())
        }
    ]
    
    # Register trades
    results = []
    for trade in test_trades:
        logger.info(f"Registering trade: {trade['symbol']} {trade['side']} from bot {trade['bot_id']}")
        result = bot_synchronizer.register_trade(trade)
        results.append(result)
        logger.info(f"  Result: {'✅ ACCEPTED' if result else '❌ REJECTED'}")
    
    # Verify collision history
    logger.info(f"Collision history has {len(bot_synchronizer.collision_history)} entries")
    for collision in bot_synchronizer.collision_history:
        logger.info(f"Collision: {collision['symbol']} - {collision['new_trade']['side']} vs {collision['existing_trade']['side']}")
    
    return results

def test_symbol_locking(bot_ids):
    """Test locking symbols for exclusive trading"""
    logger.info("=== Testing Symbol Locking ===")
    
    # Create threads to simulate concurrent access
    def try_lock_symbol(bot_id, symbol, expected_result):
        """Thread function to try locking a symbol"""
        logger.info(f"Bot {bot_id} attempting to lock {symbol}")
        result = bot_synchronizer.lock_symbol_for_trading(symbol, bot_id)
        logger.info(f"Bot {bot_id} lock attempt for {symbol}: {'✅ SUCCESS' if result else '❌ FAILED'}")
        assert result == expected_result, f"Expected {expected_result} but got {result}"
        
        if result:
            # Hold lock for a moment
            time.sleep(2)
            # Release lock
            bot_synchronizer.unlock_symbol(symbol, bot_id)
            logger.info(f"Bot {bot_id} released lock for {symbol}")
    
    # Test 1: Bot 0 locks BTCUSDT
    thread1 = threading.Thread(target=try_lock_symbol, args=(bot_ids[0], "BTCUSDT", True))
    
    # Test 2: Bot 1 tries to lock BTCUSDT while Bot 0 holds it
    thread2 = threading.Thread(target=try_lock_symbol, args=(bot_ids[1], "BTCUSDT", False))
    
    # Test 3: Bot 2 locks ETHUSDT (different symbol, should succeed)
    thread3 = threading.Thread(target=try_lock_symbol, args=(bot_ids[2], "ETHUSDT", True))
    
    # Start threads
    thread1.start()
    time.sleep(0.5)  # Give thread1 time to acquire lock
    thread2.start()
    thread3.start()
    
    # Wait for threads to complete
    thread1.join()
    thread2.join()
    thread3.join()
    
    logger.info("Symbol locking test completed")

def run_all_tests():
    """Run all tests"""
    logger.info("Starting Bot Synchronizer tests")
    
    # Test 1: Register bots
    bot_ids = test_register_bots()
    
    # Test 2: Update bot status
    test_update_bot_status(bot_ids)
    
    # Test 3: Register trades and detect conflicts
    trade_results = test_register_trades(bot_ids)
    
    # Test 4: Symbol locking
    test_symbol_locking(bot_ids)
    
    # Print summary
    logger.info("=== Test Summary ===")
    logger.info(f"Registered bots: {len(bot_ids)}")
    logger.info(f"Trade registration results: {trade_results.count(True)}/{len(trade_results)} accepted")
    logger.info(f"Collisions detected: {len(bot_synchronizer.collision_history)}")
    
    logger.info("All tests completed successfully")

if __name__ == "__main__":
    # Verify bot synchronizer is available
    if bot_synchronizer is None:
        logger.error("Bot Synchronizer is not available")
        sys.exit(1)
    
    # Verify queue integration
    if not is_integrated:
        logger.warning("Queue-Bot integration is not active")
    
    # Run tests
    run_all_tests()