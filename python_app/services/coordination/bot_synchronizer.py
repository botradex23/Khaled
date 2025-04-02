#!/usr/bin/env python3
"""
Bot Synchronization Service

This module provides a synchronization service for coordinating between different trading bots
to prevent conflicting trades, duplicate orders, and ensure proper coordination.

Features:
1. Trade collision prevention (same symbol, same time)
2. Bot locking mechanism for critical operations
3. Trade queue synchronization
4. Comprehensive logging for debugging bot behavior
"""

import os
import sys
import time
import logging
import threading
import json
from typing import Dict, List, Any, Optional, Set, Tuple
from datetime import datetime, timedelta
from enum import Enum

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(name)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'bot_sync.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('bot_synchronizer')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Resource lock types
class LockType(Enum):
    SYMBOL = "symbol"  # Lock for a specific trading pair
    BOT = "bot"        # Lock for a specific bot
    GLOBAL = "global"  # Global lock for system-wide operations


class BotSynchronizer:
    """
    Singleton service that coordinates bot operations to prevent conflicts
    """
    _instance = None
    _lock = threading.RLock()
    
    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(BotSynchronizer, cls).__new__(cls)
            return cls._instance
    
    def __init__(self):
        if not hasattr(self, 'initialized'):
            # Resource locks
            self.locks = {
                LockType.SYMBOL: {},   # Symbol locks: {"BTCUSDT": lock_object}
                LockType.BOT: {},      # Bot locks: {bot_id: lock_object}
                LockType.GLOBAL: threading.RLock()  # Global lock
            }
            
            # Active trades tracking
            self.active_trades = {}  # {symbol: [{trade_details}]}
            self.active_trades_lock = threading.RLock()
            
            # Bot states
            self.bot_states = {}  # {bot_id: {"status": "running", "last_action": timestamp}}
            self.bot_states_lock = threading.RLock()
            
            # Trade collision history for analysis
            self.collision_history = []
            self.max_collision_history = 100
            
            self.initialized = True
            logger.info("Bot Synchronizer initialized")
    
    def get_lock(self, lock_type: LockType, resource_id: Optional[str] = None) -> threading.RLock:
        """
        Get a lock for a specific resource
        
        Args:
            lock_type: Type of lock (SYMBOL, BOT, GLOBAL)
            resource_id: ID of the resource to lock (symbol or bot ID)
            
        Returns:
            The lock object
        """
        if lock_type == LockType.GLOBAL:
            return self.locks[LockType.GLOBAL]
        
        if not resource_id:
            raise ValueError(f"Resource ID required for lock type {lock_type.name}")
        
        with self._lock:
            # Create lock if it doesn't exist
            if resource_id not in self.locks[lock_type]:
                self.locks[lock_type][resource_id] = threading.RLock()
            
            return self.locks[lock_type][resource_id]
    
    def acquire_lock(self, lock_type: LockType, resource_id: Optional[str] = None, timeout: float = 10.0) -> bool:
        """
        Acquire a lock for a specific resource
        
        Args:
            lock_type: Type of lock (SYMBOL, BOT, GLOBAL)
            resource_id: ID of the resource to lock (symbol or bot ID)
            timeout: Maximum time to wait for the lock (seconds)
            
        Returns:
            True if lock acquired, False if timeout
        """
        lock = self.get_lock(lock_type, resource_id)
        
        # Try to acquire lock with timeout
        result = lock.acquire(timeout=timeout)
        
        if result:
            logger.debug(f"Acquired {lock_type.name} lock for {resource_id}")
        else:
            logger.warning(f"Failed to acquire {lock_type.name} lock for {resource_id} (timeout)")
        
        return result
    
    def release_lock(self, lock_type: LockType, resource_id: Optional[str] = None) -> None:
        """
        Release a previously acquired lock
        
        Args:
            lock_type: Type of lock (SYMBOL, BOT, GLOBAL)
            resource_id: ID of the resource to unlock (symbol or bot ID)
        """
        lock = self.get_lock(lock_type, resource_id)
        
        try:
            lock.release()
            logger.debug(f"Released {lock_type.name} lock for {resource_id}")
        except RuntimeError:
            logger.warning(f"Attempted to release non-acquired {lock_type.name} lock for {resource_id}")
    
    def register_bot(self, bot_id: str, bot_type: str, config: Dict[str, Any]) -> None:
        """
        Register a bot with the synchronizer
        
        Args:
            bot_id: Unique ID of the bot
            bot_type: Type of bot (GRID, DCA, MACD, etc.)
            config: Bot configuration parameters
        """
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
            
            logger.info(f"Registered {bot_type} bot {bot_id}")
    
    def update_bot_status(self, bot_id: str, status: str, details: Optional[Dict[str, Any]] = None) -> None:
        """
        Update a bot's status in the registry
        
        Args:
            bot_id: Unique ID of the bot
            status: New status ("running", "paused", "stopped", etc.)
            details: Additional details about the status
        """
        with self.bot_states_lock:
            if bot_id not in self.bot_states:
                logger.warning(f"Attempted to update unregistered bot {bot_id}")
                return
            
            self.bot_states[bot_id]["status"] = status
            self.bot_states[bot_id]["last_action"] = datetime.now().isoformat()
            
            if details:
                for key, value in details.items():
                    self.bot_states[bot_id][key] = value
            
            logger.info(f"Updated bot {bot_id} status to {status}")
    
    def register_trade(self, trade_details: Dict[str, Any]) -> bool:
        """
        Register a trade with the synchronizer to detect conflicts
        
        Args:
            trade_details: Trade details including symbol, side, etc.
            
        Returns:
            True if trade registered, False if conflicting with existing trade
        """
        symbol = trade_details.get("symbol")
        
        if not symbol:
            logger.error(f"Missing symbol in trade details: {trade_details}")
            return False
        
        with self.active_trades_lock:
            # Initialize symbol entry if needed
            if symbol not in self.active_trades:
                self.active_trades[symbol] = []
            
            # Check for conflicts with existing trades
            bot_id = trade_details.get("bot_id")
            strategy_id = trade_details.get("strategy_id")
            
            for existing_trade in self.active_trades[symbol]:
                # Skip if it's the same bot/strategy or if trade is old (completed)
                if (existing_trade.get("bot_id") == bot_id and 
                    existing_trade.get("strategy_id") == strategy_id):
                    continue
                
                # Check for conflicting trade direction
                if (existing_trade.get("side") != trade_details.get("side") and
                    datetime.fromisoformat(existing_trade.get("timestamp")) > 
                    datetime.now() - timedelta(minutes=5)):
                    
                    # Record collision for analysis
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
                    
                    logger.warning(
                        f"Trade conflict detected for {symbol}: {trade_details.get('side')} from "
                        f"bot {bot_id} conflicts with {existing_trade.get('side')} from "
                        f"bot {existing_trade.get('bot_id')}"
                    )
                    
                    return False
            
            # Add trade if no conflicts
            trade_details["timestamp"] = trade_details.get("timestamp", datetime.now().isoformat())
            self.active_trades[symbol].append(trade_details)
            
            # Clean up old trades
            self._cleanup_old_trades(symbol)
            
            logger.info(f"Registered {trade_details.get('side')} trade for {symbol} from bot {bot_id}")
            return True
    
    def _cleanup_old_trades(self, symbol: str) -> None:
        """
        Clean up old trades for a symbol
        
        Args:
            symbol: Trading pair symbol
        """
        if symbol not in self.active_trades:
            return
        
        # Keep only trades from the last hour
        cutoff_time = datetime.now() - timedelta(hours=1)
        self.active_trades[symbol] = [
            trade for trade in self.active_trades[symbol]
            if datetime.fromisoformat(trade.get("timestamp", "2020-01-01T00:00:00")) > cutoff_time
        ]
    
    def check_trading_allowed(self, symbol: str, bot_id: str, side: Optional[str]) -> bool:
        """
        Check if trading is allowed for a given symbol and bot
        
        Args:
            symbol: Trading pair to check
            bot_id: ID of the bot requesting permission
            side: Trade side ("BUY" or "SELL"), can be None for lock-only operations
            
        Returns:
            True if trading is allowed, False otherwise
        """
        with self.active_trades_lock:
            # No active trades for this symbol, trading is allowed
            if symbol not in self.active_trades:
                return True
            
            # If no side specified (lock-only operation), allow it
            if side is None:
                return True
            
            # Check for conflicts with existing trades
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
                    logger.warning(
                        f"Trading not allowed for {symbol} {side} from bot {bot_id}: "
                        f"Conflicts with {trade.get('side')} from bot {trade.get('bot_id')}"
                    )
                    return False
            
            return True
    
    def get_active_bots_for_symbol(self, symbol: str) -> List[Dict[str, Any]]:
        """
        Get all active bots trading a specific symbol
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            List of bot details
        """
        result = []
        
        with self.bot_states_lock:
            for bot_id, bot_state in self.bot_states.items():
                # Check if bot is active and trading this symbol
                if (bot_state.get("status") in ["running", "active"] and
                    symbol in bot_state.get("trading_pairs", [])):
                    result.append(bot_state)
        
        return result
    
    def get_bot_trading_pairs(self) -> Dict[str, List[str]]:
        """
        Get all trading pairs grouped by bot ID
        
        Returns:
            Dictionary mapping bot IDs to their trading pairs
        """
        result = {}
        
        with self.bot_states_lock:
            for bot_id, bot_state in self.bot_states.items():
                result[bot_id] = bot_state.get("trading_pairs", [])
        
        return result
    
    def get_collision_history(self) -> List[Dict[str, Any]]:
        """
        Get history of trade collisions
        
        Returns:
            List of collision records
        """
        return self.collision_history
    
    def lock_symbol_for_trading(self, symbol: str, bot_id: str, timeout: float = 10.0) -> bool:
        """
        Lock a symbol for exclusive trading by a specific bot
        
        Args:
            symbol: Trading pair to lock
            bot_id: ID of the bot requesting the lock
            timeout: Maximum time to wait for the lock (seconds)
            
        Returns:
            True if lock acquired, False if timeout
        """
        # First, check if trading is allowed
        if not self.check_trading_allowed(symbol, bot_id, None):
            logger.warning(f"Cannot lock {symbol} for bot {bot_id}: Trading not allowed")
            return False
        
        # Try to acquire the symbol lock
        if not self.acquire_lock(LockType.SYMBOL, symbol, timeout):
            return False
        
        # Update bot state to record the lock
        with self.bot_states_lock:
            if bot_id in self.bot_states:
                if "locked_symbols" not in self.bot_states[bot_id]:
                    self.bot_states[bot_id]["locked_symbols"] = []
                
                if symbol not in self.bot_states[bot_id]["locked_symbols"]:
                    self.bot_states[bot_id]["locked_symbols"].append(symbol)
        
        logger.info(f"Bot {bot_id} locked {symbol} for trading")
        return True
    
    def unlock_symbol(self, symbol: str, bot_id: str) -> None:
        """
        Unlock a symbol that was previously locked
        
        Args:
            symbol: Trading pair to unlock
            bot_id: ID of the bot releasing the lock
        """
        # Update bot state to remove the lock
        with self.bot_states_lock:
            if (bot_id in self.bot_states and 
                "locked_symbols" in self.bot_states[bot_id] and
                symbol in self.bot_states[bot_id]["locked_symbols"]):
                self.bot_states[bot_id]["locked_symbols"].remove(symbol)
        
        # Release the lock
        self.release_lock(LockType.SYMBOL, symbol)
        logger.info(f"Bot {bot_id} unlocked {symbol}")


# Singleton instance
bot_synchronizer = BotSynchronizer()