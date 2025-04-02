#!/usr/bin/env python3
"""
ML Trade Logger

This module provides specialized logging utilities for ML-powered trading activities.
It ensures proper tracking of all trading operations with detailed metadata,
which is essential for post-trade analysis and system improvements.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional, Union, List

# Ensure logs directory exists
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Configure ML trade logging
ML_TRADE_LOG_FILE = os.path.join(log_dir, 'ml_trading_operations.log')
ML_TRADE_JSON_LOG_FILE = os.path.join(log_dir, 'ml_trading_operations.json')


def get_ml_trade_logger() -> logging.Logger:
    """
    Get a configured logger for ML trading operations
    
    Returns:
        Configured logger for ML trading operations
    """
    logger = logging.getLogger('ml.trading')
    
    # Don't add handlers if they already exist
    if logger.handlers:
        return logger
    
    # Configure level
    logger.setLevel(logging.INFO)
    
    # Create formatters
    text_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] %(name)s: %(message)s'
    )
    
    # Create file handler for text log
    file_handler = logging.FileHandler(ML_TRADE_LOG_FILE)
    file_handler.setFormatter(text_formatter)
    logger.addHandler(file_handler)
    
    # Create stream handler for console output
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(text_formatter)
    logger.addHandler(stream_handler)
    
    # Set logger as non-propagating to avoid duplicate logs
    logger.propagate = False
    
    return logger


def log_trade_operation(operation_type: str, 
                       symbol: str, 
                       action: str, 
                       details: Dict[str, Any],
                       metadata: Optional[Dict[str, Any]] = None) -> None:
    """
    Log a trading operation with structured data to both text and JSON formats
    
    Args:
        operation_type: Type of operation (e.g., 'prediction', 'execution', 'position_update')
        symbol: Trading pair symbol
        action: Trading action (e.g., 'BUY', 'SELL', 'HOLD')
        details: Operation details
        metadata: Additional metadata
    """
    logger = get_ml_trade_logger()
    
    # Create structured log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "operation_type": operation_type,
        "symbol": symbol,
        "action": action,
        "details": details
    }
    
    # Add metadata if provided
    if metadata:
        log_entry["metadata"] = metadata
    
    # Log to text log
    logger.info(f"{operation_type.upper()} - {symbol} {action}: {json.dumps(details)}")
    
    # Log to JSON file
    try:
        with open(ML_TRADE_JSON_LOG_FILE, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    except Exception as e:
        logger.error(f"Failed to write to JSON log: {e}")


def log_ml_prediction(symbol: str, 
                     prediction: str, 
                     confidence: float, 
                     indicators: Dict[str, Any],
                     price: float) -> None:
    """
    Log an ML prediction
    
    Args:
        symbol: Trading pair symbol
        prediction: Predicted action ('BUY', 'SELL', 'HOLD')
        confidence: Prediction confidence (0.0-1.0)
        indicators: Technical indicators used for prediction
        price: Current price
    """
    log_trade_operation(
        operation_type='prediction',
        symbol=symbol,
        action=prediction,
        details={
            "confidence": confidence,
            "price": price,
            "indicators": indicators
        }
    )


def log_trade_execution(symbol: str,
                       action: str,
                       quantity: float,
                       price: float,
                       position_id: int,
                       trade_id: Optional[str] = None,
                       ml_confidence: Optional[float] = None) -> None:
    """
    Log a trade execution
    
    Args:
        symbol: Trading pair symbol
        action: Trading action ('BUY' or 'SELL')
        quantity: Trade quantity
        price: Execution price
        position_id: Position ID
        trade_id: Trade ID (optional)
        ml_confidence: ML prediction confidence (optional)
    """
    log_trade_operation(
        operation_type='execution',
        symbol=symbol,
        action=action,
        details={
            "quantity": quantity,
            "price": price,
            "position_id": position_id,
            "trade_id": trade_id,
            "total_value": price * quantity,
            "timestamp": datetime.now().isoformat()
        },
        metadata={
            "ml_confidence": ml_confidence
        } if ml_confidence is not None else None
    )


def log_position_update(symbol: str,
                       position_id: int,
                       entry_price: float,
                       current_price: float,
                       quantity: float,
                       direction: str,
                       unrealized_pnl: float,
                       unrealized_pnl_pct: float) -> None:
    """
    Log a position update
    
    Args:
        symbol: Trading pair symbol
        position_id: Position ID
        entry_price: Position entry price
        current_price: Current market price
        quantity: Position quantity
        direction: Position direction ('LONG' or 'SHORT')
        unrealized_pnl: Unrealized profit/loss
        unrealized_pnl_pct: Unrealized profit/loss percentage
    """
    log_trade_operation(
        operation_type='position_update',
        symbol=symbol,
        action=direction,
        details={
            "position_id": position_id,
            "entry_price": entry_price,
            "current_price": current_price,
            "quantity": quantity,
            "unrealized_pnl": unrealized_pnl,
            "unrealized_pnl_pct": unrealized_pnl_pct,
            "position_value": current_price * quantity
        }
    )


def log_position_close(symbol: str,
                      position_id: int,
                      entry_price: float,
                      exit_price: float,
                      quantity: float,
                      direction: str,
                      realized_pnl: float,
                      realized_pnl_pct: float,
                      holding_period_hours: float,
                      close_reason: str) -> None:
    """
    Log a position close
    
    Args:
        symbol: Trading pair symbol
        position_id: Position ID
        entry_price: Position entry price
        exit_price: Position exit price
        quantity: Position quantity
        direction: Position direction ('LONG' or 'SHORT')
        realized_pnl: Realized profit/loss
        realized_pnl_pct: Realized profit/loss percentage
        holding_period_hours: Position holding period in hours
        close_reason: Reason for closing the position
    """
    log_trade_operation(
        operation_type='position_close',
        symbol=symbol,
        action=direction,
        details={
            "position_id": position_id,
            "entry_price": entry_price,
            "exit_price": exit_price,
            "quantity": quantity,
            "realized_pnl": realized_pnl,
            "realized_pnl_pct": realized_pnl_pct,
            "holding_period_hours": holding_period_hours
        },
        metadata={
            "close_reason": close_reason
        }
    )


def log_error(symbol: str,
             operation: str,
             error_message: str,
             context: Optional[Dict[str, Any]] = None) -> None:
    """
    Log an error in trading operations
    
    Args:
        symbol: Trading pair symbol
        operation: Operation being performed
        error_message: Error message
        context: Additional context about the error
    """
    logger = get_ml_trade_logger()
    
    # Create structured log entry
    log_entry = {
        "timestamp": datetime.now().isoformat(),
        "operation_type": "error",
        "symbol": symbol,
        "operation": operation,
        "error_message": error_message
    }
    
    # Add context if provided
    if context:
        log_entry["context"] = context
    
    # Log to text log
    logger.error(f"ERROR - {symbol} {operation}: {error_message}")
    
    # Log to JSON file
    try:
        with open(ML_TRADE_JSON_LOG_FILE, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
    except Exception as e:
        logger.error(f"Failed to write to JSON log: {e}")


def get_trading_logs(n: int = 100) -> List[Dict[str, Any]]:
    """
    Get the most recent trading logs
    
    Args:
        n: Number of log entries to retrieve (default: 100)
        
    Returns:
        List of log entries
    """
    try:
        logs = []
        try:
            with open(ML_TRADE_JSON_LOG_FILE, 'r') as f:
                for line in f:
                    try:
                        log_entry = json.loads(line.strip())
                        logs.append(log_entry)
                    except json.JSONDecodeError:
                        pass
        except FileNotFoundError:
            return []
        
        # Sort by timestamp and take the most recent n logs
        logs.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
        return logs[:n]
    except Exception as e:
        logger = get_ml_trade_logger()
        logger.error(f"Error retrieving trading logs: {e}")
        return []


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing ML Trade Logger ===\n")
    
    # Example ML prediction
    log_ml_prediction(
        symbol="BTCUSDT",
        prediction="BUY",
        confidence=0.87,
        indicators={
            "rsi": 32.5,
            "macd": 0.25,
            "ema_diff": 1.2
        },
        price=45000.0
    )
    
    # Example trade execution
    log_trade_execution(
        symbol="BTCUSDT",
        action="BUY",
        quantity=0.1,
        price=45000.0,
        position_id=123,
        trade_id="ML-BTC-123",
        ml_confidence=0.87
    )
    
    # Example position update
    log_position_update(
        symbol="BTCUSDT",
        position_id=123,
        entry_price=45000.0,
        current_price=46000.0,
        quantity=0.1,
        direction="LONG",
        unrealized_pnl=100.0,
        unrealized_pnl_pct=2.22
    )
    
    # Example position close
    log_position_close(
        symbol="BTCUSDT",
        position_id=123,
        entry_price=45000.0,
        exit_price=46500.0,
        quantity=0.1,
        direction="LONG",
        realized_pnl=150.0,
        realized_pnl_pct=3.33,
        holding_period_hours=24.5,
        close_reason="Take profit triggered"
    )
    
    # Example error log
    log_error(
        symbol="ETHUSDT",
        operation="trade_execution",
        error_message="Insufficient balance",
        context={
            "required_balance": 1500.0,
            "available_balance": 1000.0
        }
    )
    
    # Test log retrieval
    print("Retrieving recent logs...")
    recent_logs = get_trading_logs(5)
    print(f"Retrieved {len(recent_logs)} logs")
    for log in recent_logs:
        print(f"- {log['timestamp']} - {log['operation_type']} - {log['symbol']} {log.get('action', '')}")
    
    print("\nTest completed!")