#!/usr/bin/env python3
"""
Bot Synchronizer Test

This script tests the Bot Synchronizer service to ensure it properly prevents conflicting trades
and manages coordination between different bots.
"""

import os
import sys
import time
import logging
from datetime import datetime
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('bot_sync_test')

# Import the bot synchronizer and trade queue
try:
    from python_app.services.coordination import bot_synchronizer, LockType
    from python_app.services.queue.trade_execution_queue import TradeRequest, TradeStatus, TradeExecutionQueue
except ImportError:
    # Set up path for imports
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.append(current_dir)
    
    # Try imports again
    from python_app.services.coordination import bot_synchronizer, LockType
    from python_app.services.queue.trade_execution_queue import TradeRequest, TradeStatus, TradeExecutionQueue


def test_register_bot():
    """Test registering bots with the synchronizer"""
    logger.info("Testing bot registration...")
    
    # Create three test bots
    bot_synchronizer.register_bot(
        bot_id="test-grid-bot-1",
        bot_type="GRID",
        config={
            "symbol": "BTCUSDT",
            "upper_price": 70000,
            "lower_price": 60000,
            "grid_levels": 10
        }
    )
    
    bot_synchronizer.register_bot(
        bot_id="test-dca-bot-1",
        bot_type="DCA",
        config={
            "symbol": "ETHUSDT",
            "base_order_size": 0.1,
            "price_deviation": 5.0
        }
    )
    
    bot_synchronizer.register_bot(
        bot_id="test-macd-bot-1",
        bot_type="MACD",
        config={
            "symbols": ["BTCUSDT", "ETHUSDT", "SOLUSDT"],
            "fast_period": 12,
            "slow_period": 26,
            "signal_period": 9
        }
    )
    
    # Verify bots were registered
    with bot_synchronizer.bot_states_lock:
        assert "test-grid-bot-1" in bot_synchronizer.bot_states
        assert "test-dca-bot-1" in bot_synchronizer.bot_states
        assert "test-macd-bot-1" in bot_synchronizer.bot_states
        
        # Verify bot details
        assert bot_synchronizer.bot_states["test-grid-bot-1"]["type"] == "GRID"
        assert bot_synchronizer.bot_states["test-dca-bot-1"]["type"] == "DCA"
        assert bot_synchronizer.bot_states["test-macd-bot-1"]["type"] == "MACD"
        
        # Verify trading pairs
        assert bot_synchronizer.bot_states["test-grid-bot-1"]["trading_pairs"] == ["BTCUSDT"]
        assert bot_synchronizer.bot_states["test-dca-bot-1"]["trading_pairs"] == ["ETHUSDT"]
        assert bot_synchronizer.bot_states["test-macd-bot-1"]["trading_pairs"] == ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
    
    logger.info("Bot registration test passed!")


def test_trade_conflict_detection():
    """Test trade conflict detection between bots"""
    logger.info("Testing trade conflict detection...")
    
    # Update bot statuses to active
    bot_synchronizer.update_bot_status("test-grid-bot-1", "active")
    bot_synchronizer.update_bot_status("test-dca-bot-1", "active")
    bot_synchronizer.update_bot_status("test-macd-bot-1", "active")
    
    # Register a BUY trade for BTCUSDT from grid bot
    grid_trade = {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "quantity": 0.01,
        "price": 65000,
        "order_type": "LIMIT",
        "bot_id": "test-grid-bot-1",
        "strategy_id": "grid-strategy",
        "trade_id": "grid-trade-1",
        "timestamp": datetime.now().isoformat()
    }
    
    # Register the trade
    assert bot_synchronizer.register_trade(grid_trade)
    
    # Try to register a conflicting SELL trade from MACD bot
    macd_trade = {
        "symbol": "BTCUSDT",
        "side": "SELL",
        "quantity": 0.02,
        "price": 66000,
        "order_type": "LIMIT",
        "bot_id": "test-macd-bot-1",
        "strategy_id": "macd-strategy",
        "trade_id": "macd-trade-1",
        "timestamp": datetime.now().isoformat()
    }
    
    # This should fail due to conflict
    assert not bot_synchronizer.register_trade(macd_trade)
    
    # Verify we recorded the collision
    assert len(bot_synchronizer.collision_history) > 0
    assert bot_synchronizer.collision_history[-1]["resolution"] == "rejected"
    
    logger.info("Trade conflict detection test passed!")


def test_symbol_locking():
    """Test symbol locking functionality"""
    logger.info("Testing symbol locking...")
    
    # Lock ETHUSDT for the DCA bot
    assert bot_synchronizer.lock_symbol_for_trading("ETHUSDT", "test-dca-bot-1")
    
    # Verify the lock was recorded
    with bot_synchronizer.bot_states_lock:
        assert "locked_symbols" in bot_synchronizer.bot_states["test-dca-bot-1"]
        assert "ETHUSDT" in bot_synchronizer.bot_states["test-dca-bot-1"]["locked_symbols"]
    
    # Try to lock same symbol for MACD bot - should fail
    def try_lock_symbol():
        # Use non-blocking acquire to avoid hanging test
        return bot_synchronizer.acquire_lock(LockType.SYMBOL, "ETHUSDT", timeout=0.1)
    
    # This should fail because symbol is already locked
    assert not try_lock_symbol()
    
    # Unlock the symbol
    bot_synchronizer.unlock_symbol("ETHUSDT", "test-dca-bot-1")
    
    # Now the lock should be available
    assert bot_synchronizer.acquire_lock(LockType.SYMBOL, "ETHUSDT", timeout=0.1)
    
    # Clean up
    bot_synchronizer.release_lock(LockType.SYMBOL, "ETHUSDT")
    
    logger.info("Symbol locking test passed!")


def test_queue_integration():
    """Test integration with the trade execution queue"""
    logger.info("Testing queue integration...")
    
    # Create a trade queue
    queue = TradeExecutionQueue()
    
    # Create a test trade request for SOLUSDT
    trade_request = TradeRequest(
        symbol="SOLUSDT",
        side="BUY",
        quantity=1.0,
        order_type="MARKET",
        strategy_id="test-macd-bot-1"
    )
    
    # Add trade to queue
    trade_id = queue.add_trade(trade_request)
    
    # Verify trade is added and not rejected
    assert trade_id == trade_request.id
    assert trade_request.status != TradeStatus.CANCELED
    
    # Try to add conflicting trade
    conflicting_request = TradeRequest(
        symbol="SOLUSDT",
        side="SELL",
        quantity=1.0,
        order_type="MARKET",
        strategy_id="test-grid-bot-1"
    )
    
    # This should be rejected by the bot synchronizer
    conflict_id = queue.add_trade(conflicting_request)
    
    # Verify conflict rejection
    assert conflict_id == conflicting_request.id
    assert conflicting_request.status == TradeStatus.CANCELED
    
    # Check for conflict message if available
    if conflicting_request.error_message is not None:
        assert "conflict" in conflicting_request.error_message.lower()
    
    logger.info("Queue integration test passed!")


def test_null_side_handling():
    """Test handling of None values for trade sides"""
    logger.info("Testing null side handling...")
    
    # Verify trading is allowed with None side
    assert bot_synchronizer.check_trading_allowed("BTCUSDT", "test-grid-bot-1", None)
    
    # Register a BUY trade
    buy_trade = {
        "symbol": "ADAUSDT",
        "side": "BUY",
        "quantity": 100,
        "price": 0.45,
        "order_type": "LIMIT",
        "bot_id": "test-grid-bot-1", 
        "trade_id": "test-trade-ada-1",
        "timestamp": datetime.now().isoformat()
    }
    bot_synchronizer.register_trade(buy_trade)
    
    # Check that a lock-only operation is still allowed
    assert bot_synchronizer.check_trading_allowed("ADAUSDT", "test-macd-bot-1", None)
    
    # But a SELL would be rejected
    assert not bot_synchronizer.check_trading_allowed("ADAUSDT", "test-macd-bot-1", "SELL")
    
    logger.info("Null side handling test passed!")


def test_cleanup():
    """Cleanup test data"""
    logger.info("Cleaning up test data...")
    
    # Clear collision history
    bot_synchronizer.collision_history.clear()
    
    # Clean up active trades
    with bot_synchronizer.active_trades_lock:
        bot_synchronizer.active_trades.clear()
    
    # Clean up bot states
    with bot_synchronizer.bot_states_lock:
        for bot_id in ["test-grid-bot-1", "test-dca-bot-1", "test-macd-bot-1"]:
            if bot_id in bot_synchronizer.bot_states:
                del bot_synchronizer.bot_states[bot_id]
    
    logger.info("Cleanup complete!")


def main():
    """Run all tests"""
    try:
        # Make sure we're starting with clean state
        test_cleanup()
        
        # Run the tests
        test_register_bot()
        test_trade_conflict_detection()
        test_symbol_locking()
        test_queue_integration()
        test_null_side_handling()
        
        # Clean up after tests
        test_cleanup()
        
        logger.info("All bot synchronizer tests passed successfully!")
        return True
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)