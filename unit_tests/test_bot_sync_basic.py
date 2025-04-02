#!/usr/bin/env python3
"""
Simple Bot Synchronizer Test

A minimal test of the bot synchronizer without external dependencies
"""

import threading
from enum import Enum
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple

# Define minimal LockType enum
class LockType(Enum):
    SYMBOL = "symbol"
    BOT = "bot"
    GLOBAL = "global"

# Basic bot synchronizer implementation for testing
class BotSynchronizer:
    def __init__(self):
        self.locks = {
            LockType.SYMBOL: {},
            LockType.BOT: {},
            LockType.GLOBAL: threading.RLock()
        }
        self.active_trades = {}
        self.active_trades_lock = threading.RLock()
        self.bot_states = {}
        self.bot_states_lock = threading.RLock()
        self.collision_history = []
        self.max_collision_history = 100
    
    def get_lock(self, lock_type: LockType, resource_id: Optional[str] = None) -> threading.RLock:
        if lock_type == LockType.GLOBAL:
            return self.locks[LockType.GLOBAL]
        
        if not resource_id:
            raise ValueError(f"Resource ID required for lock type {lock_type.name}")
        
        with threading.RLock():
            if resource_id not in self.locks[lock_type]:
                self.locks[lock_type][resource_id] = threading.RLock()
            
            return self.locks[lock_type][resource_id]
    
    def acquire_lock(self, lock_type: LockType, resource_id: Optional[str] = None, timeout: float = 10.0) -> bool:
        lock = self.get_lock(lock_type, resource_id)
        return lock.acquire(timeout=timeout)
    
    def release_lock(self, lock_type: LockType, resource_id: Optional[str] = None) -> None:
        lock = self.get_lock(lock_type, resource_id)
        try:
            lock.release()
        except RuntimeError:
            pass
    
    def register_bot(self, bot_id: str, bot_type: str, config: Dict[str, Any]) -> None:
        with self.bot_states_lock:
            self.bot_states[bot_id] = {
                "id": bot_id,
                "type": bot_type,
                "status": "initialized",
                "config": config,
                "last_action": datetime.now().isoformat(),
                "registered_at": datetime.now().isoformat(),
                "trading_pairs": config.get("symbols", [config.get("symbol")]) if config else []
            }
    
    def update_bot_status(self, bot_id: str, status: str, details: Optional[Dict[str, Any]] = None) -> None:
        with self.bot_states_lock:
            if bot_id not in self.bot_states:
                return
            
            self.bot_states[bot_id]["status"] = status
            self.bot_states[bot_id]["last_action"] = datetime.now().isoformat()
            
            if details:
                for key, value in details.items():
                    self.bot_states[bot_id][key] = value
    
    def register_trade(self, trade_details: Dict[str, Any]) -> bool:
        symbol = trade_details.get("symbol")
        
        if not symbol:
            return False
        
        with self.active_trades_lock:
            if symbol not in self.active_trades:
                self.active_trades[symbol] = []
            
            bot_id = trade_details.get("bot_id")
            strategy_id = trade_details.get("strategy_id")
            
            for existing_trade in self.active_trades[symbol]:
                if (existing_trade.get("bot_id") == bot_id and 
                    existing_trade.get("strategy_id") == strategy_id):
                    continue
                
                if (existing_trade.get("side") != trade_details.get("side") and
                    datetime.fromisoformat(existing_trade.get("timestamp")) > 
                    datetime.now() - timedelta(minutes=5)):
                    
                    collision = {
                        "timestamp": datetime.now().isoformat(),
                        "symbol": symbol,
                        "new_trade": trade_details,
                        "existing_trade": existing_trade,
                        "resolution": "rejected"
                    }
                    
                    self.collision_history.append(collision)
                    if len(self.collision_history) > self.max_collision_history:
                        self.collision_history.pop(0)
                    
                    return False
            
            trade_details["timestamp"] = trade_details.get("timestamp", datetime.now().isoformat())
            self.active_trades[symbol].append(trade_details)
            
            return True
    
    def check_trading_allowed(self, symbol: str, bot_id: str, side: Optional[str]) -> bool:
        with self.active_trades_lock:
            if symbol not in self.active_trades:
                return True
            
            # If no side specified (lock-only operation), allow it
            if side is None:
                return True
            
            for trade in self.active_trades[symbol]:
                # Skip old trades
                if (datetime.fromisoformat(trade.get("timestamp", "2020-01-01T00:00:00")) < 
                    datetime.now() - timedelta(minutes=5)):
                    continue
                
                # Skip trades from the same bot
                if trade.get("bot_id") == bot_id:
                    continue
                
                # Check for conflicting directions
                if trade.get("side") != side:
                    return False
            
            return True
    
    def lock_symbol_for_trading(self, symbol: str, bot_id: str, timeout: float = 10.0) -> bool:
        if not self.check_trading_allowed(symbol, bot_id, None):
            return False
        
        if not self.acquire_lock(LockType.SYMBOL, symbol, timeout):
            return False
        
        with self.bot_states_lock:
            if bot_id in self.bot_states:
                if "locked_symbols" not in self.bot_states[bot_id]:
                    self.bot_states[bot_id]["locked_symbols"] = []
                
                if symbol not in self.bot_states[bot_id]["locked_symbols"]:
                    self.bot_states[bot_id]["locked_symbols"].append(symbol)
        
        return True
    
    def unlock_symbol(self, symbol: str, bot_id: str) -> None:
        with self.bot_states_lock:
            if (bot_id in self.bot_states and 
                "locked_symbols" in self.bot_states[bot_id] and
                symbol in self.bot_states[bot_id]["locked_symbols"]):
                self.bot_states[bot_id]["locked_symbols"].remove(symbol)
        
        self.release_lock(LockType.SYMBOL, symbol)


def test_register_bot():
    """Test registering bots with the synchronizer"""
    print("Testing bot registration...")
    
    # Create a fresh synchronizer instance
    bot_sync = BotSynchronizer()
    
    # Register test bots
    bot_sync.register_bot(
        bot_id="test-bot-1",
        bot_type="GRID", 
        config={"symbol": "BTCUSDT"}
    )
    
    bot_sync.register_bot(
        bot_id="test-bot-2",
        bot_type="DCA",
        config={"symbol": "ETHUSDT"}
    )
    
    # Verify registration
    assert "test-bot-1" in bot_sync.bot_states
    assert "test-bot-2" in bot_sync.bot_states
    
    print("Bot registration test passed!")


def test_trading_conflict():
    """Test trade conflict detection"""
    print("Testing trade conflict detection...")
    
    # Create a fresh synchronizer instance
    bot_sync = BotSynchronizer()
    
    # Register a BUY trade
    buy_trade = {
        "symbol": "BTCUSDT",
        "side": "BUY", 
        "quantity": 0.1,
        "bot_id": "test-bot-1",
        "timestamp": datetime.now().isoformat()
    }
    
    assert bot_sync.register_trade(buy_trade)
    
    # Try to register a conflicting SELL trade
    sell_trade = {
        "symbol": "BTCUSDT", 
        "side": "SELL",
        "quantity": 0.1,
        "bot_id": "test-bot-2",
        "timestamp": datetime.now().isoformat()
    }
    
    # Should be rejected due to conflict
    assert not bot_sync.register_trade(sell_trade)
    
    # Verify collision was recorded
    assert len(bot_sync.collision_history) == 1
    
    print("Trade conflict detection test passed!")


def test_null_side_handling():
    """Test handling of None values for trade sides"""
    print("Testing null side handling...")
    
    # Create a fresh synchronizer instance  
    bot_sync = BotSynchronizer()
    
    # Register a BUY trade
    buy_trade = {
        "symbol": "ETHUSDT",
        "side": "BUY",
        "quantity": 1.0,
        "bot_id": "test-bot-1",
        "timestamp": datetime.now().isoformat()
    }
    
    bot_sync.register_trade(buy_trade)
    
    # Check that trading is allowed with None side
    assert bot_sync.check_trading_allowed("ETHUSDT", "test-bot-2", None)
    
    # But a SELL from another bot would be rejected
    assert not bot_sync.check_trading_allowed("ETHUSDT", "test-bot-2", "SELL")
    
    print("Null side handling test passed!")


def main():
    """Run all tests"""
    try:
        test_register_bot()
        test_trading_conflict()
        test_null_side_handling()
        print("\nAll tests passed!")
        return 0
    except Exception as e:
        print(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(main())
