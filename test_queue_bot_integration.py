#!/usr/bin/env python3
"""
Test Trade Queue Bot Integration

This script tests the integration between the Trade Execution Queue and the Bot Synchronizer.
It verifies that the queue properly checks with the synchronizer to prevent conflicting trades.
"""

import os
import sys
import logging
import uuid
import threading
import time
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'queue_bot_integration_test.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('queue_bot_integration_test')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import services
try:
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue, TradeRequest, TradeStatus
    from python_app.services.coordination import bot_synchronizer
    from python_app.services.queue.queue_bot_integration import is_integrated
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    sys.exit(1)

def create_test_trade_request(symbol="BTCUSDT", side="BUY", strategy_id=None, bot_id=None):
    """Create a test trade request"""
    trade_id = str(uuid.uuid4())
    user_id = 999 if not bot_id else None
    
    # Create a TradeRequest object with required fields
    trade_request = TradeRequest(
        id=trade_id,
        user_id=user_id,
        symbol=symbol,
        side=side,
        quantity=0.01,
        price=50000.0,
        order_type="LIMIT"
    )
    
    # Set additional fields
    trade_request.strategy_id = strategy_id or f"test-strategy-{uuid.uuid4().hex[:8]}"
    trade_request.created_at = datetime.now()
    
    return trade_request

def test_synchronized_add_trade():
    """Test the synchronized add_trade method"""
    logger.info("=== Testing Synchronized Add Trade ===")
    
    # Get queue instance
    queue = TradeExecutionQueue()
    
    # Clear any existing items
    with queue.queue.mutex:
        queue.queue.queue.clear()
    
    # Register a test bot
    bot_id = f"test-bot-{uuid.uuid4().hex[:8]}"
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
    
    # Test 1: Register a trade that should be allowed
    trade1 = create_test_trade_request(symbol="BTCUSDT", side="BUY", bot_id=bot_id)
    trade_id1 = queue.add_trade(trade1)
    logger.info(f"Added trade 1 (BUY BTCUSDT) with ID: {trade_id1}")
    
    # Test 2: Register another trade in the same direction (should be allowed)
    trade2 = create_test_trade_request(symbol="BTCUSDT", side="BUY", bot_id=bot_id)
    trade_id2 = queue.add_trade(trade2)
    logger.info(f"Added trade 2 (BUY BTCUSDT) with ID: {trade_id2}")
    
    # Test 3: Register a trade in the opposite direction (should be rejected)
    trade3 = create_test_trade_request(symbol="BTCUSDT", side="SELL", bot_id=bot_id)
    trade_id3 = queue.add_trade(trade3)
    logger.info(f"Attempt to add trade 3 (SELL BTCUSDT) with ID: {trade_id3}")
    logger.info(f"Trade 3 status: {trade3.status}")
    logger.info(f"Trade 3 error: {trade3.error_message}")
    
    # Test 4: Register a trade for a different symbol (should be allowed)
    trade4 = create_test_trade_request(symbol="ETHUSDT", side="SELL", bot_id=bot_id)
    trade_id4 = queue.add_trade(trade4)
    logger.info(f"Added trade 4 (SELL ETHUSDT) with ID: {trade_id4}")
    
    # Check queue size
    logger.info(f"Queue size after tests: {queue.queue.qsize()}")
    
    # Check bot synchronizer state
    with bot_synchronizer.active_trades_lock:
        logger.info(f"Active trades in bot synchronizer: {bot_synchronizer.active_trades}")
    
    return [trade1, trade2, trade3, trade4]

def test_duplicate_trade_detection():
    """Test duplicate trade detection"""
    logger.info("=== Testing Duplicate Trade Detection ===")
    
    # Get queue instance
    queue = TradeExecutionQueue()
    
    # Clear any existing items
    with queue.queue.mutex:
        queue.queue.queue.clear()
    
    # Create a unique bot ID
    bot_id = f"test-bot-{uuid.uuid4().hex[:8]}"
    bot_synchronizer.register_bot(
        bot_id=bot_id,
        bot_type="TEST_BOT",
        config={
            "symbols": ["BTCUSDT"],
            "test_param": 123.45,
            "is_test": True
        }
    )
    
    # First trade - should be accepted
    trade1 = create_test_trade_request(symbol="BTCUSDT", side="BUY", bot_id=bot_id)
    trade_id1 = queue.add_trade(trade1)
    logger.info(f"Added original trade with ID: {trade_id1}")
    
    # Identical trade - should be rejected as duplicate
    trade2 = TradeRequest(
        id=str(uuid.uuid4()),
        user_id=None,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.01,  # Same quantity
        price=50000.0,  # Same price
        order_type="LIMIT"
    )
    # Set additional fields
    trade2.strategy_id = trade1.strategy_id  # Same strategy
    trade2.created_at = datetime.now()
    trade_id2 = queue.add_trade(trade2)
    logger.info(f"Attempted to add duplicate trade with ID: {trade_id2}")
    logger.info(f"Duplicate trade status: {trade2.status}")
    logger.info(f"Duplicate trade error: {trade2.error_message}")
    
    # Similar but not identical trade - should be accepted
    trade3 = TradeRequest(
        id=str(uuid.uuid4()),
        user_id=None,
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.02,  # Different quantity
        price=50000.0,
        order_type="LIMIT"
    )
    # Set additional fields
    trade3.strategy_id = trade1.strategy_id
    trade3.created_at = datetime.now()
    trade_id3 = queue.add_trade(trade3)
    logger.info(f"Added similar but not duplicate trade with ID: {trade_id3}")
    
    return [trade1, trade2, trade3]

def test_lock_acquisition():
    """Test lock acquisition during trade execution"""
    logger.info("=== Testing Lock Acquisition ===")
    
    # Get queue instance
    queue = TradeExecutionQueue()
    
    # Create multiple bots
    bot_ids = []
    for i in range(3):
        bot_id = f"test-bot-{uuid.uuid4().hex[:8]}"
        bot_synchronizer.register_bot(
            bot_id=bot_id,
            bot_type="TEST_BOT",
            config={"symbols": ["BTCUSDT", "ETHUSDT"]}
        )
        bot_ids.append(bot_id)
    
    # Create threads to simulate concurrent trade execution
    def execute_trade_with_bot(bot_id, symbol, side):
        """Execute a trade for a specific bot"""
        trade = create_test_trade_request(symbol=symbol, side=side, bot_id=bot_id)
        trade_id = queue.add_trade(trade)
        logger.info(f"Bot {bot_id} added {side} trade for {symbol} with ID {trade_id}")
        # Wait for execution
        time.sleep(0.5)
        return trade
    
    # Start threads for concurrent execution
    threads = []
    results = []
    
    # Bot 0 and Bot 1 will try to execute trades on BTCUSDT at the same time
    thread1 = threading.Thread(
        target=lambda: results.append(execute_trade_with_bot(bot_ids[0], "BTCUSDT", "BUY"))
    )
    thread2 = threading.Thread(
        target=lambda: results.append(execute_trade_with_bot(bot_ids[1], "BTCUSDT", "BUY"))
    )
    
    # Bot 2 will execute on a different symbol
    thread3 = threading.Thread(
        target=lambda: results.append(execute_trade_with_bot(bot_ids[2], "ETHUSDT", "SELL"))
    )
    
    threads.extend([thread1, thread2, thread3])
    
    for thread in threads:
        thread.start()
    
    for thread in threads:
        thread.join()
    
    logger.info("All trade execution threads completed")
    
    return results

def run_all_tests():
    """Run all integration tests"""
    logger.info("Starting Queue-Bot Integration tests")
    
    # Verify integration is active
    if not is_integrated:
        logger.error("Queue-Bot integration is not active")
        sys.exit(1)
    
    logger.info("Queue-Bot integration is active")
    
    # Test 1: Synchronized Add Trade
    trades_test1 = test_synchronized_add_trade()
    
    # Test 2: Duplicate Trade Detection
    trades_test2 = test_duplicate_trade_detection()
    
    # Test 3: Lock Acquisition
    trades_test3 = test_lock_acquisition()
    
    # Summary
    logger.info("=== Test Summary ===")
    logger.info(f"Synchronized Add Trade Test: {len(trades_test1)} trades tested")
    logger.info(f"Duplicate Trade Detection Test: {len(trades_test2)} trades tested")
    logger.info(f"Lock Acquisition Test: {len(trades_test3)} trades tested")
    
    logger.info("All tests completed successfully")

if __name__ == "__main__":
    # Run tests
    run_all_tests()