#!/usr/bin/env python3
"""
ML Trade Logger

This module provides functions for logging ML trade execution data
for monitoring, analysis, and auditing purposes.
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Configure logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'ml_trades.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ml_trade_logger')

# Define log file paths
TRADE_LOG_FILE = os.path.join('logs', 'trade_executions.jsonl')
POSITION_LOG_FILE = os.path.join('logs', 'position_updates.jsonl')
POSITION_CLOSE_LOG_FILE = os.path.join('logs', 'position_closes.jsonl')
ERROR_LOG_FILE = os.path.join('logs', 'trade_errors.jsonl')

# Ensure log directories exist
os.makedirs(os.path.dirname(TRADE_LOG_FILE), exist_ok=True)

def log_to_file(log_file: str, data: Dict[str, Any]) -> bool:
    """
    Append a log entry to a file in JSON Lines format
    
    Args:
        log_file: Path to the log file
        data: Data to log
        
    Returns:
        True if successful, False otherwise
    """
    try:
        # Add timestamp if not present
        if 'timestamp' not in data:
            data['timestamp'] = datetime.now().isoformat()
            
        # Write to file
        with open(log_file, 'a') as f:
            f.write(json.dumps(data) + '\n')
        return True
    except Exception as e:
        logger.error(f"Error writing to log file {log_file}: {e}")
        return False

def log_trade_execution(
    symbol: str,
    action: str,
    quantity: float,
    price: float,
    position_id: int,
    trade_id: Optional[Union[str, int]] = None,
    ml_confidence: Optional[float] = None
) -> bool:
    """
    Log a trade execution
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        action: Trade action (BUY or SELL)
        quantity: Order quantity
        price: Execution price
        position_id: Position ID for tracking
        trade_id: Trade ID or order ID
        ml_confidence: ML prediction confidence
        
    Returns:
        True if successfully logged, False otherwise
    """
    # Create log entry
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'symbol': symbol,
        'action': action,
        'quantity': quantity,
        'price': price,
        'value': quantity * price,
        'position_id': position_id,
        'trade_id': trade_id,
        'ml_confidence': ml_confidence
    }
    
    # Log to console
    logger.info(f"TRADE: {action} {quantity} {symbol} @ {price} (position: {position_id})")
    
    # Write to log file
    return log_to_file(TRADE_LOG_FILE, log_data)

def log_position_update(
    symbol: str,
    position_id: int,
    entry_price: float,
    current_price: float,
    quantity: float,
    direction: str,
    unrealized_pnl: float,
    unrealized_pnl_pct: float
) -> bool:
    """
    Log a position update
    
    Args:
        symbol: Trading pair symbol
        position_id: Position ID
        entry_price: Entry price
        current_price: Current price
        quantity: Position quantity
        direction: Position direction (LONG or SHORT)
        unrealized_pnl: Unrealized profit/loss in quote currency
        unrealized_pnl_pct: Unrealized profit/loss percentage
        
    Returns:
        True if successfully logged, False otherwise
    """
    # Create log entry
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'symbol': symbol,
        'position_id': position_id,
        'entry_price': entry_price,
        'current_price': current_price,
        'quantity': quantity,
        'direction': direction,
        'unrealized_pnl': unrealized_pnl,
        'unrealized_pnl_pct': unrealized_pnl_pct,
        'total_value': quantity * current_price
    }
    
    # Log to console
    logger.info(f"POSITION UPDATE: {direction} {quantity} {symbol} @ {current_price} (PnL: {unrealized_pnl:.2f} {unrealized_pnl_pct:.2f}%)")
    
    # Write to log file
    return log_to_file(POSITION_LOG_FILE, log_data)

def log_position_close(
    symbol: str,
    position_id: int,
    entry_price: float,
    exit_price: float,
    quantity: float,
    direction: str,
    realized_pnl: float,
    realized_pnl_pct: float,
    holding_period_hours: float,
    close_reason: str
) -> bool:
    """
    Log a position close
    
    Args:
        symbol: Trading pair symbol
        position_id: Position ID
        entry_price: Entry price
        exit_price: Exit price
        quantity: Position quantity
        direction: Position direction (LONG or SHORT)
        realized_pnl: Realized profit/loss in quote currency
        realized_pnl_pct: Realized profit/loss percentage
        holding_period_hours: Holding period in hours
        close_reason: Reason for closing the position
        
    Returns:
        True if successfully logged, False otherwise
    """
    # Create log entry
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'symbol': symbol,
        'position_id': position_id,
        'entry_price': entry_price,
        'exit_price': exit_price,
        'quantity': quantity,
        'direction': direction,
        'realized_pnl': realized_pnl,
        'realized_pnl_pct': realized_pnl_pct,
        'holding_period_hours': holding_period_hours,
        'close_reason': close_reason,
        'total_value': quantity * exit_price
    }
    
    # Log to console
    logger.info(f"POSITION CLOSE: {direction} {quantity} {symbol} (entry: {entry_price}, exit: {exit_price}, PnL: {realized_pnl:.2f} {realized_pnl_pct:.2f}%, reason: {close_reason})")
    
    # Write to log file
    return log_to_file(POSITION_CLOSE_LOG_FILE, log_data)

def log_error(
    symbol: str,
    operation: str,
    error_message: str,
    context: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Log an error
    
    Args:
        symbol: Trading pair symbol
        operation: Operation that failed
        error_message: Error message
        context: Additional context information
        
    Returns:
        True if successfully logged, False otherwise
    """
    # Create log entry
    log_data = {
        'timestamp': datetime.now().isoformat(),
        'symbol': symbol,
        'operation': operation,
        'error_message': error_message,
        'context': context or {}
    }
    
    # Log to console
    logger.error(f"ERROR: {operation} for {symbol} - {error_message}")
    
    # Write to log file
    return log_to_file(ERROR_LOG_FILE, log_data)

def get_recent_trades(symbol: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Get recent trade executions
    
    Args:
        symbol: Filter by symbol (optional)
        limit: Maximum number of entries to return
        
    Returns:
        List of trade execution entries
    """
    try:
        trades = []
        if os.path.exists(TRADE_LOG_FILE):
            with open(TRADE_LOG_FILE, 'r') as f:
                for line in f:
                    try:
                        trade = json.loads(line.strip())
                        if symbol is None or trade.get('symbol') == symbol:
                            trades.append(trade)
                    except json.JSONDecodeError:
                        continue
        
        # Sort by timestamp (newest first) and limit
        trades.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return trades[:limit]
    except Exception as e:
        logger.error(f"Error reading trade logs: {e}")
        return []

def get_recent_position_updates(symbol: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Get recent position updates
    
    Args:
        symbol: Filter by symbol (optional)
        limit: Maximum number of entries to return
        
    Returns:
        List of position update entries
    """
    try:
        updates = []
        if os.path.exists(POSITION_LOG_FILE):
            with open(POSITION_LOG_FILE, 'r') as f:
                for line in f:
                    try:
                        update = json.loads(line.strip())
                        if symbol is None or update.get('symbol') == symbol:
                            updates.append(update)
                    except json.JSONDecodeError:
                        continue
        
        # Sort by timestamp (newest first) and limit
        updates.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return updates[:limit]
    except Exception as e:
        logger.error(f"Error reading position updates: {e}")
        return []

def get_recent_position_closes(symbol: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Get recent position closes
    
    Args:
        symbol: Filter by symbol (optional)
        limit: Maximum number of entries to return
        
    Returns:
        List of position close entries
    """
    try:
        closes = []
        if os.path.exists(POSITION_CLOSE_LOG_FILE):
            with open(POSITION_CLOSE_LOG_FILE, 'r') as f:
                for line in f:
                    try:
                        close = json.loads(line.strip())
                        if symbol is None or close.get('symbol') == symbol:
                            closes.append(close)
                    except json.JSONDecodeError:
                        continue
        
        # Sort by timestamp (newest first) and limit
        closes.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return closes[:limit]
    except Exception as e:
        logger.error(f"Error reading position closes: {e}")
        return []

def get_recent_errors(symbol: str = None, limit: int = 100) -> List[Dict[str, Any]]:
    """
    Get recent errors
    
    Args:
        symbol: Filter by symbol (optional)
        limit: Maximum number of entries to return
        
    Returns:
        List of error entries
    """
    try:
        errors = []
        if os.path.exists(ERROR_LOG_FILE):
            with open(ERROR_LOG_FILE, 'r') as f:
                for line in f:
                    try:
                        error = json.loads(line.strip())
                        if symbol is None or error.get('symbol') == symbol:
                            errors.append(error)
                    except json.JSONDecodeError:
                        continue
        
        # Sort by timestamp (newest first) and limit
        errors.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return errors[:limit]
    except Exception as e:
        logger.error(f"Error reading error logs: {e}")
        return []

def generate_trade_summary(symbol: str = None) -> Dict[str, Any]:
    """
    Generate a summary of trading activity
    
    Args:
        symbol: Filter by symbol (optional)
        
    Returns:
        Summary statistics
    """
    trades = get_recent_trades(symbol, limit=1000)
    closes = get_recent_position_closes(symbol, limit=1000)
    
    # Initialize summary
    summary = {
        'total_trades': len(trades),
        'total_positions_closed': len(closes),
        'total_volume': sum(t.get('value', 0) for t in trades),
        'total_realized_pnl': sum(c.get('realized_pnl', 0) for c in closes),
        'winning_trades': sum(1 for c in closes if c.get('realized_pnl', 0) > 0),
        'losing_trades': sum(1 for c in closes if c.get('realized_pnl', 0) < 0),
        'avg_holding_period_hours': sum(c.get('holding_period_hours', 0) for c in closes) / len(closes) if closes else 0,
        'trading_pairs': len(set(t.get('symbol', '') for t in trades)),
        'by_symbol': {}
    }
    
    # Calculate win rate
    total_closed = summary['winning_trades'] + summary['losing_trades']
    summary['win_rate'] = (summary['winning_trades'] / total_closed) * 100 if total_closed > 0 else 0
    
    # Group by symbol
    symbols = set(t.get('symbol', '') for t in trades)
    for sym in symbols:
        sym_trades = [t for t in trades if t.get('symbol') == sym]
        sym_closes = [c for c in closes if c.get('symbol') == sym]
        
        symbol_summary = {
            'total_trades': len(sym_trades),
            'total_positions_closed': len(sym_closes),
            'total_volume': sum(t.get('value', 0) for t in sym_trades),
            'total_realized_pnl': sum(c.get('realized_pnl', 0) for c in sym_closes),
            'winning_trades': sum(1 for c in sym_closes if c.get('realized_pnl', 0) > 0),
            'losing_trades': sum(1 for c in sym_closes if c.get('realized_pnl', 0) < 0)
        }
        
        # Calculate win rate for this symbol
        sym_total_closed = symbol_summary['winning_trades'] + symbol_summary['losing_trades']
        symbol_summary['win_rate'] = (symbol_summary['winning_trades'] / sym_total_closed) * 100 if sym_total_closed > 0 else 0
        
        summary['by_symbol'][sym] = symbol_summary
    
    return summary

# Simple test function
if __name__ == "__main__":
    print("\n=== Testing ML Trade Logger ===\n")
    
    # Test logging a trade execution
    print("Testing trade execution logging...")
    trade_logged = log_trade_execution(
        symbol="BTCUSDT",
        action="BUY",
        quantity=0.01,
        price=69000.0,
        position_id=123456,
        trade_id="TEST-1",
        ml_confidence=0.85
    )
    print(f"Trade logged: {trade_logged}")
    
    # Test logging a position update
    print("\nTesting position update logging...")
    position_update_logged = log_position_update(
        symbol="BTCUSDT",
        position_id=123456,
        entry_price=69000.0,
        current_price=69500.0,
        quantity=0.01,
        direction="LONG",
        unrealized_pnl=5.0,
        unrealized_pnl_pct=0.72
    )
    print(f"Position update logged: {position_update_logged}")
    
    # Test logging a position close
    print("\nTesting position close logging...")
    position_close_logged = log_position_close(
        symbol="BTCUSDT",
        position_id=123456,
        entry_price=69000.0,
        exit_price=69800.0,
        quantity=0.01,
        direction="LONG",
        realized_pnl=8.0,
        realized_pnl_pct=1.16,
        holding_period_hours=2.5,
        close_reason="Test close"
    )
    print(f"Position close logged: {position_close_logged}")
    
    # Test logging an error
    print("\nTesting error logging...")
    error_logged = log_error(
        symbol="BTCUSDT",
        operation="execute_trade",
        error_message="Test error",
        context={"test": True}
    )
    print(f"Error logged: {error_logged}")
    
    # Test retrieving logs
    print("\nRetrieving recent trade logs...")
    recent_trades = get_recent_trades(limit=5)
    print(f"Recent trades: {len(recent_trades)}")
    if recent_trades:
        print(f"Latest trade: {recent_trades[0]}")
    
    # Generate and print summary
    print("\nGenerating trade summary...")
    summary = generate_trade_summary()
    print(f"Total trades: {summary['total_trades']}")
    print(f"Total PnL: {summary['total_realized_pnl']:.2f}")
    print(f"Win rate: {summary['win_rate']:.2f}%")
    
    print("\nTest completed!")