#!/usr/bin/env python3
"""
Bot Synchronizer Mock Test

This script tests the Bot Synchronizer service using local mocks without
making any API calls to Binance, ensuring the tests run regardless of connection status.
"""

import os
import sys
import time
import logging
from datetime import datetime
import threading
from unittest.mock import patch, MagicMock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('bot_sync_test')

# Create mock TradeRequest and TradeStatus classes to avoid import dependencies
class TradeStatus:
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    EXECUTED = "EXECUTED"
    FAILED = "FAILED"
    CANCELED = "CANCELED"
    RATE_LIMITED = "RATE_LIMITED"
    RISK_REJECTED = "RISK_REJECTED"

class TradeRequest:
    def __init__(
        self,
        symbol: str,
        side: str,
        quantity: float,
        order_type: str = "MARKET",
        price: float = None,
        position_id: int = None,
        user_id: int = None,
        strategy_id: str = None
    ):
        self.id = f"mock-trade-{int(time.time())}"
        self.symbol = symbol.upper()
        self.side = side.upper()
        self.quantity = quantity
        self.order_type = order_type.upper()
        self.price = price
        self.position_id = position_id
        self.user_id = user_id
        self.strategy_id = strategy_id
        self.status = TradeStatus.PENDING
        self.error_message = None
        self.result = None
        self.created_at = datetime.now()
        self.processed_at = None
        self.ml_signal = {}
        self.meta = {}

# Import the bot synchronizer module directly
sys.path.append(os.path.abspath('.'))
from python_app.services.coordination import bot_synchronizer, LockType

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


def test_mock_queue_integration():
    """Test integration with a mock trade queue"""
    logger.info("Testing mock queue integration...")
    
    # Create a mock trade queue function
    def mock_register_trade(trade_request):
        trade_details = {
            "symbol": trade_request.symbol,
            "side": trade_request.side,
            "quantity": trade_request.quantity,
            "price": trade_request.price,
            "order_type": trade_request.order_type,
            "bot_id": str(trade_request.user_id) if trade_request.user_id else trade_request.strategy_id,
            "strategy_id": trade_request.strategy_id,
            "trade_id": trade_request.id,
            "timestamp": datetime.now().isoformat()
        }
        
        # Check with bot synchronizer
        allowed = bot_synchronizer.register_trade(trade_details)
        if not allowed:
            trade_request.status = TradeStatus.CANCELED
            trade_request.error_message = "Trade rejected by bot synchronizer - conflict with another bot"
        return trade_request.id
    
    # Test with a valid trade
    valid_request = TradeRequest(
        symbol="ADAUSDT",
        side="BUY",
        quantity=1000.0,
        order_type="MARKET",
        strategy_id="test-dca-bot-1"
    )
    
    valid_id = mock_register_trade(valid_request)
    assert valid_id == valid_request.id
    assert valid_request.status == TradeStatus.PENDING
    
    # Test with a conflicting trade
    conflicting_request = TradeRequest(
        symbol="ADAUSDT",
        side="SELL",
        quantity=500.0,
        order_type="MARKET",
        strategy_id="test-macd-bot-1"
    )
    
    conflict_id = mock_register_trade(conflicting_request)
    assert conflict_id == conflicting_request.id
    assert conflicting_request.status == TradeStatus.CANCELED
    
    logger.info("Mock queue integration test passed!")


def test_null_side_handling():
    """Test handling of None values for trade sides"""
    logger.info("Testing null side handling...")
    
    # Verify trading is allowed with None side
    assert bot_synchronizer.check_trading_allowed("BTCUSDT", "test-grid-bot-1", None)
    
    # Register a BUY trade
    buy_trade = {
        "symbol": "ATOMUSDT",
        "side": "BUY",
        "quantity": 50,
        "price": 8.75,
        "order_type": "LIMIT",
        "bot_id": "test-grid-bot-1", 
        "trade_id": "test-trade-atom-1",
        "timestamp": datetime.now().isoformat()
    }
    bot_synchronizer.register_trade(buy_trade)
    
    # Check that a lock-only operation is still allowed
    assert bot_synchronizer.check_trading_allowed("ATOMUSDT", "test-macd-bot-1", None)
    
    # But a SELL would be rejected
    assert not bot_synchronizer.check_trading_allowed("ATOMUSDT", "test-macd-bot-1", "SELL")
    
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
        test_mock_queue_integration()
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