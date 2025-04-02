#!/usr/bin/env python3
"""
Trade Logging System

This module provides a comprehensive trade logging system that records all trade-related
actions in a persistent and queryable format. It supports:

1. Logging trade signals received
2. Logging order creation requests
3. Logging order execution results (success/failure)
4. Complete trade lifecycle tracking with timestamps
5. Persistent storage in both JSON files and database
6. Query capabilities for reporting and analysis

Usage:
    from python_app.utils.trade_logger import TradeLogger
    
    # Get the singleton logger instance
    trade_logger = TradeLogger.get_instance()
    
    # Log a trade signal
    trade_logger.log_signal(
        symbol="BTCUSDT",
        side="BUY",
        source="AI_GRID_BOT",
        signal_data={...}
    )
    
    # Log order creation
    trade_id = trade_logger.log_order_creation(
        symbol="BTCUSDT",
        side="BUY", 
        quantity=0.001,
        price=None,  # Market order
        order_type="MARKET",
        user_id=None,
        strategy_id="AI_GRID_123",
        source="AI_GRID_BOT"
    )
    
    # Log order execution result
    trade_logger.log_order_execution(
        trade_id=trade_id,
        success=True,
        executed_price=69000.0,
        executed_quantity=0.001,
        timestamp=datetime.now(),
        order_id="BINANCE123456",
        error_message=None,
        is_paper_trade=False
    )
"""

import os
import sys
import json
import uuid
import logging
import threading
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timedelta
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
import pandas as pd

# Import Telegram notification module if available
try:
    from python_app.utils.telegram_notifier import (
        notify_signal, notify_order_created, notify_trade_executed,
        notify_trade_error, notify_risk_management, get_telegram_notifier
    )
    TELEGRAM_AVAILABLE = True
except ImportError:
    try:
        from utils.telegram_notifier import (
            notify_signal, notify_order_created, notify_trade_executed,
            notify_trade_error, notify_risk_management, get_telegram_notifier
        )
        TELEGRAM_AVAILABLE = True
    except ImportError:
        logger = logging.getLogger('trade_logger')
        logger.warning("Could not import Telegram notifier - notifications will be disabled")
        TELEGRAM_AVAILABLE = False

# Configure base logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'trade_logs.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('trade_logger')

# Add the parent directory to the path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import local modules with proper error handling
try:
    from python_app.config import DATABASE_URL, USE_DATABASE, LOG_DIR
except ImportError:
    try:
        from config import DATABASE_URL, USE_DATABASE, LOG_DIR
    except ImportError:
        logger.warning("Could not import config - using default configuration")
        DATABASE_URL = os.getenv('DATABASE_URL')
        USE_DATABASE = True if DATABASE_URL else False
        LOG_DIR = os.path.join(os.path.dirname(parent_dir), 'logs')

# Ensure log directory exists
if not os.path.exists(LOG_DIR):
    os.makedirs(LOG_DIR)

# Define trade log file paths
TRADE_SIGNALS_LOG_FILE = os.path.join(LOG_DIR, 'trade_signals.jsonl')
TRADE_ORDERS_LOG_FILE = os.path.join(LOG_DIR, 'trade_orders.jsonl')
TRADE_EXECUTIONS_LOG_FILE = os.path.join(LOG_DIR, 'trade_executions.jsonl')
TRADE_ERRORS_LOG_FILE = os.path.join(LOG_DIR, 'trade_errors.jsonl')

# Trade status constants
class TradeStatus:
    QUEUED = "QUEUED"          # Trade request is queued but not yet processed
    PROCESSING = "PROCESSING"   # Trade is being processed
    EXECUTED = "EXECUTED"       # Trade was successfully executed
    FAILED = "FAILED"           # Trade execution failed
    CANCELED = "CANCELED"       # Trade was canceled
    PARTIAL = "PARTIAL"         # Trade was partially executed
    EXPIRED = "EXPIRED"         # Trade expired before execution
    REJECTED = "REJECTED"       # Trade was rejected by the exchange


class TradeLogger:
    """
    Comprehensive trade logging system that records all trade actions
    and provides query capabilities
    """
    
    _instance = None
    _lock = threading.Lock()
    
    @classmethod
    def get_instance(cls) -> 'TradeLogger':
        """
        Get the singleton instance of the trade logger
        
        Returns:
            TradeLogger: The singleton instance
        """
        with cls._lock:
            if cls._instance is None:
                cls._instance = cls()
        return cls._instance
    
    def __init__(self):
        """Initialize the trade logger"""
        self.logger = logger
        self.use_database = USE_DATABASE
        self.db_conn = None
        
        # Try to connect to the database if available
        if self.use_database and DATABASE_URL:
            try:
                self.db_conn = psycopg2.connect(DATABASE_URL)
                self.logger.info("Connected to trade logs database")
                self._create_tables_if_not_exist()
            except Exception as e:
                self.logger.error(f"Failed to connect to database: {e}")
                self.use_database = False
    
    def _create_tables_if_not_exist(self):
        """Create database tables if they don't exist"""
        if not self.db_conn:
            return
        
        try:
            with self.db_conn.cursor() as cursor:
                # Trade Signals table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS trade_signals (
                        id SERIAL PRIMARY KEY,
                        signal_id TEXT UNIQUE,
                        timestamp TIMESTAMP NOT NULL,
                        symbol TEXT NOT NULL,
                        side TEXT NOT NULL,
                        price NUMERIC,
                        quantity NUMERIC,
                        source TEXT NOT NULL,
                        user_id TEXT,
                        signal_data JSONB,
                        metadata JSONB
                    )
                """)
                
                # Trade Orders table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS trade_orders (
                        id SERIAL PRIMARY KEY,
                        trade_id TEXT UNIQUE,
                        timestamp TIMESTAMP NOT NULL,
                        symbol TEXT NOT NULL,
                        side TEXT NOT NULL,
                        quantity NUMERIC NOT NULL,
                        price NUMERIC,
                        order_type TEXT NOT NULL,
                        user_id TEXT,
                        strategy_id TEXT,
                        source TEXT NOT NULL,
                        signal_id TEXT,
                        status TEXT NOT NULL,
                        metadata JSONB,
                        FOREIGN KEY (signal_id) REFERENCES trade_signals(signal_id) ON DELETE SET NULL
                    )
                """)
                
                # Trade Executions table
                cursor.execute("""
                    CREATE TABLE IF NOT EXISTS trade_executions (
                        id SERIAL PRIMARY KEY,
                        trade_id TEXT UNIQUE,
                        timestamp TIMESTAMP NOT NULL,
                        executed_price NUMERIC,
                        executed_quantity NUMERIC,
                        success BOOLEAN NOT NULL,
                        order_id TEXT,
                        error_message TEXT,
                        is_paper_trade BOOLEAN NOT NULL,
                        execution_data JSONB,
                        FOREIGN KEY (trade_id) REFERENCES trade_orders(trade_id) ON DELETE CASCADE
                    )
                """)
                
                # Create indices for faster querying
                cursor.execute("""
                    CREATE INDEX IF NOT EXISTS idx_trade_signals_symbol ON trade_signals(symbol);
                    CREATE INDEX IF NOT EXISTS idx_trade_signals_timestamp ON trade_signals(timestamp);
                    
                    CREATE INDEX IF NOT EXISTS idx_trade_orders_symbol ON trade_orders(symbol);
                    CREATE INDEX IF NOT EXISTS idx_trade_orders_timestamp ON trade_orders(timestamp);
                    CREATE INDEX IF NOT EXISTS idx_trade_orders_source ON trade_orders(source);
                    CREATE INDEX IF NOT EXISTS idx_trade_orders_status ON trade_orders(status);
                    
                    CREATE INDEX IF NOT EXISTS idx_trade_executions_timestamp ON trade_executions(timestamp);
                    CREATE INDEX IF NOT EXISTS idx_trade_executions_success ON trade_executions(success);
                """)
                
                self.db_conn.commit()
                self.logger.info("Trade log tables created or verified")
        except Exception as e:
            self.logger.error(f"Failed to create trade log tables: {e}")
            self.use_database = False
            if self.db_conn:
                self.db_conn.rollback()
    
    def _log_to_file(self, file_path: str, log_data: Dict[str, Any]) -> bool:
        """
        Log data to a JSONL file
        
        Args:
            file_path: Path to the JSONL file
            log_data: Data to log
            
        Returns:
            bool: True if successful, False otherwise
        """
        try:
            with open(file_path, 'a') as f:
                f.write(json.dumps(log_data) + '\n')
            return True
        except Exception as e:
            self.logger.error(f"Failed to write to log file {file_path}: {e}")
            return False
    
    def log_signal(self, symbol: str, side: str, source: str, 
                  price: Optional[float] = None, quantity: Optional[float] = None,
                  user_id: Optional[str] = None, signal_data: Optional[Dict[str, Any]] = None,
                  metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Log a trade signal
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            side: Trade side (BUY or SELL)
            source: Signal source (e.g., AI_GRID_BOT, DCA_BOT)
            price: Optional signal price
            quantity: Optional signal quantity
            user_id: Optional user ID
            signal_data: Optional dictionary with signal-specific data
            metadata: Optional dictionary with additional metadata
            
        Returns:
            str: Signal ID
        """
        # Generate a unique signal ID
        signal_id = str(uuid.uuid4())
        
        # Create log entry
        timestamp = datetime.now()
        log_data = {
            'signal_id': signal_id,
            'timestamp': timestamp.isoformat(),
            'symbol': symbol,
            'side': side,
            'price': price,
            'quantity': quantity,
            'source': source,
            'user_id': user_id,
            'signal_data': signal_data or {},
            'metadata': metadata or {}
        }
        
        # Log to console
        self.logger.info(f"SIGNAL: {side} {symbol} from {source} (ID: {signal_id})")
        
        # Log to file
        self._log_to_file(TRADE_SIGNALS_LOG_FILE, log_data)
        
        # Log to database if available
        if self.use_database and self.db_conn:
            try:
                with self.db_conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO trade_signals
                        (signal_id, timestamp, symbol, side, price, quantity, source, user_id, signal_data, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        signal_id, timestamp, symbol, side, price, quantity, source, user_id,
                        json.dumps(signal_data) if signal_data else '{}',
                        json.dumps(metadata) if metadata else '{}'
                    ))
                    self.db_conn.commit()
            except Exception as e:
                self.logger.error(f"Failed to log signal to database: {e}")
                if self.db_conn:
                    self.db_conn.rollback()
        
        # Send Telegram notification if available
        if TELEGRAM_AVAILABLE:
            try:
                # Extract confidence from signal data if available
                confidence = None
                if signal_data and 'confidence' in signal_data:
                    confidence = signal_data['confidence']
                
                # Use notify_signal function from telegram_notifier
                notify_signal(
                    symbol=symbol,
                    side=side,
                    source=source,
                    confidence=confidence,
                    price=price,
                    signal_id=signal_id
                )
            except Exception as e:
                self.logger.warning(f"Failed to send Telegram notification for signal: {e}")
        
        return signal_id
    
    def log_order_creation(self, symbol: str, side: str, quantity: float, 
                          order_type: str, source: str, price: Optional[float] = None,
                          user_id: Optional[str] = None, strategy_id: Optional[str] = None,
                          signal_id: Optional[str] = None, 
                          metadata: Optional[Dict[str, Any]] = None) -> str:
        """
        Log a trade order creation
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            side: Trade side (BUY or SELL)
            quantity: Order quantity
            order_type: Order type (MARKET, LIMIT, etc.)
            source: Order source (e.g., AI_GRID_BOT, DCA_BOT)
            price: Optional order price (required for LIMIT orders)
            user_id: Optional user ID
            strategy_id: Optional strategy ID
            signal_id: Optional signal ID (for linking with signal)
            metadata: Optional dictionary with additional metadata
            
        Returns:
            str: Trade ID
        """
        # Generate a unique trade ID
        trade_id = str(uuid.uuid4())
        
        # Create log entry
        timestamp = datetime.now()
        log_data = {
            'trade_id': trade_id,
            'timestamp': timestamp.isoformat(),
            'symbol': symbol,
            'side': side,
            'quantity': quantity,
            'price': price,
            'order_type': order_type,
            'user_id': user_id,
            'strategy_id': strategy_id,
            'source': source,
            'signal_id': signal_id,
            'status': TradeStatus.QUEUED,
            'metadata': metadata or {}
        }
        
        # Log to console
        self.logger.info(f"ORDER: {side} {quantity} {symbol} @ {price if price else 'MARKET'} (ID: {trade_id})")
        
        # Log to file
        self._log_to_file(TRADE_ORDERS_LOG_FILE, log_data)
        
        # Log to database if available
        if self.use_database and self.db_conn:
            try:
                with self.db_conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO trade_orders
                        (trade_id, timestamp, symbol, side, quantity, price, order_type, 
                         user_id, strategy_id, source, signal_id, status, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        trade_id, timestamp, symbol, side, quantity, price, order_type,
                        user_id, strategy_id, source, signal_id, TradeStatus.QUEUED,
                        json.dumps(metadata) if metadata else '{}'
                    ))
                    self.db_conn.commit()
            except Exception as e:
                self.logger.error(f"Failed to log order creation to database: {e}")
                if self.db_conn:
                    self.db_conn.rollback()
        
        # Send Telegram notification if available
        if TELEGRAM_AVAILABLE:
            try:
                # Use notify_order_created function from telegram_notifier
                notify_order_created(
                    symbol=symbol,
                    side=side,
                    quantity=quantity,
                    order_type=order_type,
                    source=source,
                    trade_id=trade_id,
                    price=price
                )
            except Exception as e:
                self.logger.warning(f"Failed to send Telegram notification for order creation: {e}")
        
        return trade_id
    
    def log_order_execution(self, trade_id: str, success: bool, 
                           executed_price: Optional[float] = None, 
                           executed_quantity: Optional[float] = None,
                           timestamp: Optional[datetime] = None,
                           order_id: Optional[str] = None,
                           error_message: Optional[str] = None,
                           is_paper_trade: bool = False,
                           execution_data: Optional[Dict[str, Any]] = None) -> bool:
        """
        Log a trade order execution result
        
        Args:
            trade_id: Trade ID from log_order_creation
            success: Whether the execution was successful
            executed_price: Execution price
            executed_quantity: Executed quantity
            timestamp: Execution timestamp (defaults to now)
            order_id: Exchange order ID
            error_message: Error message if execution failed
            is_paper_trade: Whether this was a paper trade
            execution_data: Optional dictionary with execution-specific data
            
        Returns:
            bool: True if successfully logged
        """
        if not timestamp:
            timestamp = datetime.now()
        
        # Create log entry
        log_data = {
            'trade_id': trade_id,
            'timestamp': timestamp.isoformat(),
            'executed_price': executed_price,
            'executed_quantity': executed_quantity,
            'success': success,
            'order_id': order_id,
            'error_message': error_message,
            'is_paper_trade': is_paper_trade,
            'execution_data': execution_data or {}
        }
        
        # Log to console
        if success:
            mode = "PAPER" if is_paper_trade else "LIVE"
            self.logger.info(f"EXECUTION SUCCESS ({mode}): Trade {trade_id} executed at {executed_price} (OrderID: {order_id})")
        else:
            self.logger.error(f"EXECUTION FAILED: Trade {trade_id} - {error_message}")
            self._log_to_file(TRADE_ERRORS_LOG_FILE, log_data)
        
        # Log to file
        self._log_to_file(TRADE_EXECUTIONS_LOG_FILE, log_data)
        
        # Update order status in database if available
        if self.use_database and self.db_conn:
            try:
                status = TradeStatus.EXECUTED if success else TradeStatus.FAILED
                
                # First update the order status
                with self.db_conn.cursor() as cursor:
                    cursor.execute("""
                        UPDATE trade_orders
                        SET status = %s
                        WHERE trade_id = %s
                    """, (status, trade_id))
                
                # Then log the execution details
                with self.db_conn.cursor() as cursor:
                    cursor.execute("""
                        INSERT INTO trade_executions
                        (trade_id, timestamp, executed_price, executed_quantity, 
                         success, order_id, error_message, is_paper_trade, execution_data)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        trade_id, timestamp, executed_price, executed_quantity,
                        success, order_id, error_message, is_paper_trade,
                        json.dumps(execution_data) if execution_data else '{}'
                    ))
                self.db_conn.commit()
            except Exception as e:
                self.logger.error(f"Failed to log order execution to database: {e}")
                if self.db_conn:
                    self.db_conn.rollback()
        
        # Send Telegram notification if available
        if TELEGRAM_AVAILABLE:
            try:
                # Retrieve order details from database to get symbol and side
                symbol = "UNKNOWN"
                side = "UNKNOWN"
                
                if self.use_database and self.db_conn:
                    try:
                        with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                            cursor.execute("""
                                SELECT symbol, side FROM trade_orders
                                WHERE trade_id = %s
                            """, (trade_id,))
                            result = cursor.fetchone()
                            if result:
                                symbol = result['symbol']
                                side = result['side']
                    except Exception as e:
                        self.logger.warning(f"Failed to retrieve order details for Telegram notification: {e}")
                
                # Extract confidence from execution data if available
                confidence = None
                if execution_data and 'confidence' in execution_data:
                    confidence = execution_data['confidence']
                
                if success:
                    # Send execution notification
                    notify_trade_executed(
                        symbol=symbol,
                        side=side,
                        quantity=executed_quantity,
                        price=executed_price,
                        trade_id=trade_id,
                        order_id=order_id,
                        confidence=confidence
                    )
                else:
                    # Send error notification
                    notify_trade_error(
                        symbol=symbol,
                        operation="EXECUTION",
                        error_type="EXECUTION_FAILED",
                        error_message=error_message or "Unknown error",
                        trade_id=trade_id
                    )
            except Exception as e:
                self.logger.warning(f"Failed to send Telegram notification for execution: {e}")
        
        return True
    
    def update_order_status(self, trade_id: str, status: str, 
                           metadata: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update the status of an order
        
        Args:
            trade_id: Trade ID
            status: New status
            metadata: Optional metadata updates
            
        Returns:
            bool: True if successful
        """
        # Log to console
        self.logger.info(f"STATUS UPDATE: Trade {trade_id} status changed to {status}")
        
        # Create log entry for the update
        log_data = {
            'trade_id': trade_id,
            'timestamp': datetime.now().isoformat(),
            'status': status,
            'metadata_update': metadata
        }
        
        # Log to file - append to the orders file 
        self._log_to_file(TRADE_ORDERS_LOG_FILE, log_data)
        
        # Update database if available
        if self.use_database and self.db_conn:
            try:
                with self.db_conn.cursor() as cursor:
                    if metadata:
                        cursor.execute("""
                            UPDATE trade_orders
                            SET status = %s, metadata = metadata || %s::jsonb
                            WHERE trade_id = %s
                        """, (status, json.dumps(metadata), trade_id))
                    else:
                        cursor.execute("""
                            UPDATE trade_orders
                            SET status = %s
                            WHERE trade_id = %s
                        """, (status, trade_id))
                    self.db_conn.commit()
                return True
            except Exception as e:
                self.logger.error(f"Failed to update order status in database: {e}")
                if self.db_conn:
                    self.db_conn.rollback()
                return False
        
        return True
    
    def log_error(self, trade_id: Optional[str], error_type: str, 
                 error_message: str, context: Optional[Dict[str, Any]] = None) -> bool:
        """
        Log a trade-related error
        
        Args:
            trade_id: Optional trade ID
            error_type: Type of error
            error_message: Error message
            context: Optional context information
            
        Returns:
            bool: True if successfully logged
        """
        # Create log entry
        timestamp = datetime.now()
        log_data = {
            'timestamp': timestamp.isoformat(),
            'trade_id': trade_id,
            'error_type': error_type,
            'error_message': error_message,
            'context': context or {}
        }
        
        # Log to console
        self.logger.error(f"TRADE ERROR: {error_type} - {error_message}")
        
        # Log to file
        file_result = self._log_to_file(TRADE_ERRORS_LOG_FILE, log_data)
        
        # Send Telegram notification if available
        if TELEGRAM_AVAILABLE:
            try:
                # Try to get symbol from context or database
                symbol = "UNKNOWN"
                
                if context and 'symbol' in context:
                    symbol = context['symbol']
                elif trade_id and self.use_database and self.db_conn:
                    try:
                        with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                            cursor.execute("""
                                SELECT symbol FROM trade_orders
                                WHERE trade_id = %s
                            """, (trade_id,))
                            result = cursor.fetchone()
                            if result:
                                symbol = result['symbol']
                    except Exception as e:
                        self.logger.warning(f"Failed to retrieve symbol for error notification: {e}")
                
                # Determine operation from context or error_type
                operation = context.get('operation', 'TRADING') if context else 'TRADING'
                
                # Send error notification
                notify_trade_error(
                    symbol=symbol,
                    operation=operation,
                    error_type=error_type,
                    error_message=error_message,
                    trade_id=trade_id
                )
            except Exception as e:
                self.logger.warning(f"Failed to send Telegram notification for error: {e}")
        
        return file_result
    
    def query_trades(self, symbol: Optional[str] = None, 
                    side: Optional[str] = None,
                    source: Optional[str] = None,
                    status: Optional[str] = None,
                    user_id: Optional[str] = None,
                    strategy_id: Optional[str] = None,
                    start_time: Optional[datetime] = None,
                    end_time: Optional[datetime] = None,
                    limit: int = 100,
                    include_executions: bool = True) -> List[Dict[str, Any]]:
        """
        Query trade records with optional filtering
        
        Args:
            symbol: Filter by symbol
            side: Filter by side (BUY/SELL)
            source: Filter by source
            status: Filter by status
            user_id: Filter by user ID
            strategy_id: Filter by strategy ID
            start_time: Filter by start time
            end_time: Filter by end time
            limit: Maximum number of results to return
            include_executions: Whether to include execution details
            
        Returns:
            List of trade records matching the criteria
        """
        if not self.use_database or not self.db_conn:
            self.logger.warning("Database not available for querying trades")
            return self._query_trades_from_files(
                symbol, side, source, status, user_id, strategy_id, 
                start_time, end_time, limit, include_executions
            )
        
        try:
            query = """
                SELECT o.*, 
                       CASE WHEN e.id IS NOT NULL THEN 
                           json_build_object(
                               'executed_price', e.executed_price,
                               'executed_quantity', e.executed_quantity,
                               'timestamp', e.timestamp,
                               'success', e.success,
                               'order_id', e.order_id,
                               'error_message', e.error_message,
                               'is_paper_trade', e.is_paper_trade
                           )
                       ELSE NULL END as execution
                FROM trade_orders o
                LEFT JOIN trade_executions e ON o.trade_id = e.trade_id
                WHERE 1=1
            """
            params = []
            
            # Add filters
            if symbol:
                query += " AND o.symbol = %s"
                params.append(symbol)
            
            if side:
                query += " AND o.side = %s"
                params.append(side)
            
            if source:
                query += " AND o.source = %s"
                params.append(source)
            
            if status:
                query += " AND o.status = %s"
                params.append(status)
            
            if user_id:
                query += " AND o.user_id = %s"
                params.append(user_id)
            
            if strategy_id:
                query += " AND o.strategy_id = %s"
                params.append(strategy_id)
            
            if start_time:
                query += " AND o.timestamp >= %s"
                params.append(start_time)
            
            if end_time:
                query += " AND o.timestamp <= %s"
                params.append(end_time)
            
            # Order by most recent first
            query += " ORDER BY o.timestamp DESC"
            
            # Add limit
            query += " LIMIT %s"
            params.append(limit)
            
            # Execute query
            with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, params)
                results = cursor.fetchall()
                
                # Convert to list of dicts
                trade_records = []
                for row in results:
                    trade_record = dict(row)
                    
                    # Handle JSON fields
                    for field in ['metadata', 'signal_data']:
                        if field in trade_record and isinstance(trade_record[field], str):
                            try:
                                trade_record[field] = json.loads(trade_record[field])
                            except:
                                trade_record[field] = {}
                    
                    # Convert datetime objects to ISO format
                    for field in ['timestamp']:
                        if field in trade_record and isinstance(trade_record[field], datetime):
                            trade_record[field] = trade_record[field].isoformat()
                    
                    trade_records.append(trade_record)
                
                return trade_records
        except Exception as e:
            self.logger.error(f"Failed to query trades from database: {e}")
            return self._query_trades_from_files(
                symbol, side, source, status, user_id, strategy_id, 
                start_time, end_time, limit, include_executions
            )
    
    def _query_trades_from_files(self, symbol: Optional[str] = None, 
                               side: Optional[str] = None,
                               source: Optional[str] = None,
                               status: Optional[str] = None,
                               user_id: Optional[str] = None,
                               strategy_id: Optional[str] = None,
                               start_time: Optional[datetime] = None,
                               end_time: Optional[datetime] = None,
                               limit: int = 100,
                               include_executions: bool = True) -> List[Dict[str, Any]]:
        """
        Query trade records from log files (fallback when database is not available)
        
        Args:
            (Same as query_trades)
            
        Returns:
            List of trade records matching the criteria
        """
        try:
            # Load trade orders from file
            orders = []
            if os.path.exists(TRADE_ORDERS_LOG_FILE):
                with open(TRADE_ORDERS_LOG_FILE, 'r') as f:
                    for line in f:
                        try:
                            order = json.loads(line.strip())
                            orders.append(order)
                        except:
                            pass
            
            # Load executions if needed
            executions_by_trade_id = {}
            if include_executions and os.path.exists(TRADE_EXECUTIONS_LOG_FILE):
                with open(TRADE_EXECUTIONS_LOG_FILE, 'r') as f:
                    for line in f:
                        try:
                            execution = json.loads(line.strip())
                            trade_id = execution.get('trade_id')
                            if trade_id:
                                executions_by_trade_id[trade_id] = execution
                        except:
                            pass
            
            # Filter orders
            filtered_orders = []
            for order in orders:
                # Check all filters
                if symbol and order.get('symbol') != symbol:
                    continue
                
                if side and order.get('side') != side:
                    continue
                
                if source and order.get('source') != source:
                    continue
                
                if status and order.get('status') != status:
                    continue
                
                if user_id and order.get('user_id') != user_id:
                    continue
                
                if strategy_id and order.get('strategy_id') != strategy_id:
                    continue
                
                if start_time:
                    order_time = datetime.fromisoformat(order.get('timestamp', '2000-01-01T00:00:00'))
                    if order_time < start_time:
                        continue
                
                if end_time:
                    order_time = datetime.fromisoformat(order.get('timestamp', '2099-12-31T23:59:59'))
                    if order_time > end_time:
                        continue
                
                # Add execution data if available
                if include_executions:
                    trade_id = order.get('trade_id')
                    if trade_id in executions_by_trade_id:
                        order['execution'] = executions_by_trade_id[trade_id]
                
                filtered_orders.append(order)
            
            # Sort by timestamp (most recent first)
            filtered_orders.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            
            # Apply limit
            return filtered_orders[:limit]
        except Exception as e:
            self.logger.error(f"Failed to query trades from files: {e}")
            return []
    
    def get_trade_by_id(self, trade_id: str, include_execution: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get a specific trade by ID
        
        Args:
            trade_id: Trade ID
            include_execution: Whether to include execution details
            
        Returns:
            Trade record or None if not found
        """
        if not self.use_database or not self.db_conn:
            return self._get_trade_by_id_from_files(trade_id, include_execution)
        
        try:
            query = """
                SELECT o.*, 
                       CASE WHEN e.id IS NOT NULL THEN 
                           json_build_object(
                               'executed_price', e.executed_price,
                               'executed_quantity', e.executed_quantity,
                               'timestamp', e.timestamp,
                               'success', e.success,
                               'order_id', e.order_id,
                               'error_message', e.error_message,
                               'is_paper_trade', e.is_paper_trade,
                               'execution_data', e.execution_data
                           )
                       ELSE NULL END as execution
                FROM trade_orders o
                LEFT JOIN trade_executions e ON o.trade_id = e.trade_id
                WHERE o.trade_id = %s
            """
            
            with self.db_conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(query, (trade_id,))
                result = cursor.fetchone()
                
                if not result:
                    return None
                
                # Convert to dict
                trade_record = dict(result)
                
                # Handle JSON fields
                for field in ['metadata', 'signal_data', 'execution_data']:
                    if field in trade_record and isinstance(trade_record[field], str):
                        try:
                            trade_record[field] = json.loads(trade_record[field])
                        except:
                            trade_record[field] = {}
                
                # Convert datetime objects to ISO format
                for field in ['timestamp']:
                    if field in trade_record and isinstance(trade_record[field], datetime):
                        trade_record[field] = trade_record[field].isoformat()
                
                return trade_record
        except Exception as e:
            self.logger.error(f"Failed to get trade by ID from database: {e}")
            return self._get_trade_by_id_from_files(trade_id, include_execution)
    
    def _get_trade_by_id_from_files(self, trade_id: str, include_execution: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get a specific trade by ID from log files
        
        Args:
            trade_id: Trade ID
            include_execution: Whether to include execution details
            
        Returns:
            Trade record or None if not found
        """
        try:
            # Load trade orders from file
            if os.path.exists(TRADE_ORDERS_LOG_FILE):
                with open(TRADE_ORDERS_LOG_FILE, 'r') as f:
                    for line in f:
                        try:
                            order = json.loads(line.strip())
                            if order.get('trade_id') == trade_id:
                                # Found the order
                                
                                # Add execution data if available
                                if include_execution and os.path.exists(TRADE_EXECUTIONS_LOG_FILE):
                                    with open(TRADE_EXECUTIONS_LOG_FILE, 'r') as e_file:
                                        for e_line in e_file:
                                            try:
                                                execution = json.loads(e_line.strip())
                                                if execution.get('trade_id') == trade_id:
                                                    order['execution'] = execution
                                                    break
                                            except:
                                                pass
                                
                                return order
                        except:
                            pass
            
            return None
        except Exception as e:
            self.logger.error(f"Failed to get trade by ID from files: {e}")
            return None
    
    def get_summary_statistics(self, 
                             source: Optional[str] = None,
                             user_id: Optional[str] = None,
                             strategy_id: Optional[str] = None,
                             start_time: Optional[datetime] = None,
                             end_time: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get summary statistics for trades
        
        Args:
            source: Filter by source
            user_id: Filter by user ID
            strategy_id: Filter by strategy ID
            start_time: Filter by start time
            end_time: Filter by end time
            
        Returns:
            Dictionary with summary statistics
        """
        if not self.use_database or not self.db_conn:
            return self._get_summary_statistics_from_files(
                source, user_id, strategy_id, start_time, end_time
            )
        
        try:
            query_conditions = []
            params = []
            
            # Add filters
            if source:
                query_conditions.append("o.source = %s")
                params.append(source)
            
            if user_id:
                query_conditions.append("o.user_id = %s")
                params.append(user_id)
            
            if strategy_id:
                query_conditions.append("o.strategy_id = %s")
                params.append(strategy_id)
            
            if start_time:
                query_conditions.append("o.timestamp >= %s")
                params.append(start_time)
            
            if end_time:
                query_conditions.append("o.timestamp <= %s")
                params.append(end_time)
            
            # Build WHERE clause
            where_clause = ""
            if query_conditions:
                where_clause = "WHERE " + " AND ".join(query_conditions)
            
            # Execute query for basic statistics
            with self.db_conn.cursor() as cursor:
                cursor.execute(f"""
                    SELECT 
                        COUNT(*) as total_trades,
                        SUM(CASE WHEN o.status = 'EXECUTED' THEN 1 ELSE 0 END) as executed_trades,
                        SUM(CASE WHEN o.status = 'FAILED' THEN 1 ELSE 0 END) as failed_trades,
                        COUNT(DISTINCT o.symbol) as unique_symbols,
                        COUNT(DISTINCT o.user_id) as unique_users,
                        COUNT(DISTINCT o.strategy_id) as unique_strategies,
                        COUNT(DISTINCT o.source) as unique_sources,
                        SUM(CASE WHEN o.side = 'BUY' THEN 1 ELSE 0 END) as buy_orders,
                        SUM(CASE WHEN o.side = 'SELL' THEN 1 ELSE 0 END) as sell_orders,
                        MAX(o.timestamp) as latest_trade,
                        MIN(o.timestamp) as earliest_trade
                    FROM trade_orders o
                    {where_clause}
                """, params)
                
                result = cursor.fetchone()
                
                statistics = {
                    'total_trades': result[0] or 0,
                    'executed_trades': result[1] or 0,
                    'failed_trades': result[2] or 0,
                    'unique_symbols': result[3] or 0,
                    'unique_users': result[4] or 0,
                    'unique_strategies': result[5] or 0,
                    'unique_sources': result[6] or 0,
                    'buy_orders': result[7] or 0,
                    'sell_orders': result[8] or 0,
                    'latest_trade': result[9].isoformat() if result[9] else None,
                    'earliest_trade': result[10].isoformat() if result[10] else None
                }
                
                return statistics
        except Exception as e:
            self.logger.error(f"Failed to get summary statistics from database: {e}")
            return self._get_summary_statistics_from_files(
                source, user_id, strategy_id, start_time, end_time
            )
    
    def _get_summary_statistics_from_files(self, 
                                         source: Optional[str] = None,
                                         user_id: Optional[str] = None,
                                         strategy_id: Optional[str] = None,
                                         start_time: Optional[datetime] = None,
                                         end_time: Optional[datetime] = None) -> Dict[str, Any]:
        """
        Get summary statistics for trades from log files
        
        Args:
            (Same as get_summary_statistics)
            
        Returns:
            Dictionary with summary statistics
        """
        try:
            # Load all trade orders from file
            orders = []
            if os.path.exists(TRADE_ORDERS_LOG_FILE):
                with open(TRADE_ORDERS_LOG_FILE, 'r') as f:
                    for line in f:
                        try:
                            order = json.loads(line.strip())
                            
                            # Apply filters
                            if source and order.get('source') != source:
                                continue
                            
                            if user_id and order.get('user_id') != user_id:
                                continue
                            
                            if strategy_id and order.get('strategy_id') != strategy_id:
                                continue
                            
                            if start_time:
                                order_time = datetime.fromisoformat(order.get('timestamp', '2000-01-01T00:00:00'))
                                if order_time < start_time:
                                    continue
                            
                            if end_time:
                                order_time = datetime.fromisoformat(order.get('timestamp', '2099-12-31T23:59:59'))
                                if order_time > end_time:
                                    continue
                            
                            orders.append(order)
                        except:
                            pass
            
            # Calculate statistics
            unique_symbols = set(order.get('symbol') for order in orders if 'symbol' in order)
            unique_users = set(order.get('user_id') for order in orders if order.get('user_id'))
            unique_strategies = set(order.get('strategy_id') for order in orders if order.get('strategy_id'))
            unique_sources = set(order.get('source') for order in orders if 'source' in order)
            
            executed_trades = sum(1 for order in orders if order.get('status') == TradeStatus.EXECUTED)
            failed_trades = sum(1 for order in orders if order.get('status') == TradeStatus.FAILED)
            
            buy_orders = sum(1 for order in orders if order.get('side') == 'BUY')
            sell_orders = sum(1 for order in orders if order.get('side') == 'SELL')
            
            timestamps = [datetime.fromisoformat(order.get('timestamp')) for order in orders if 'timestamp' in order]
            latest_trade = max(timestamps).isoformat() if timestamps else None
            earliest_trade = min(timestamps).isoformat() if timestamps else None
            
            return {
                'total_trades': len(orders),
                'executed_trades': executed_trades,
                'failed_trades': failed_trades,
                'unique_symbols': len(unique_symbols),
                'unique_users': len(unique_users),
                'unique_strategies': len(unique_strategies),
                'unique_sources': len(unique_sources),
                'buy_orders': buy_orders,
                'sell_orders': sell_orders,
                'latest_trade': latest_trade,
                'earliest_trade': earliest_trade
            }
        except Exception as e:
            self.logger.error(f"Failed to get summary statistics from files: {e}")
            return {
                'total_trades': 0,
                'executed_trades': 0,
                'failed_trades': 0,
                'unique_symbols': 0,
                'unique_users': 0,
                'unique_strategies': 0,
                'unique_sources': 0,
                'buy_orders': 0,
                'sell_orders': 0,
                'latest_trade': None,
                'earliest_trade': None
            }


# Singleton instance
trade_logger = TradeLogger.get_instance()

# Helper functions for direct access
def log_trade_signal(symbol: str, side: str, source: str, **kwargs) -> str:
    """Helper function to log a trade signal"""
    return trade_logger.log_signal(symbol, side, source, **kwargs)

def log_trade_order(symbol: str, side: str, quantity: float, 
                  order_type: str, source: str, **kwargs) -> str:
    """Helper function to log a trade order creation"""
    return trade_logger.log_order_creation(symbol, side, quantity, order_type, source, **kwargs)

def log_trade_execution(trade_id: str, success: bool, **kwargs) -> bool:
    """Helper function to log a trade execution result"""
    return trade_logger.log_order_execution(trade_id, success, **kwargs)

def update_trade_status(trade_id: str, status: str, **kwargs) -> bool:
    """Helper function to update a trade status"""
    return trade_logger.update_order_status(trade_id, status, **kwargs)

def log_trade_error(trade_id: Optional[str], error_type: str, error_message: str, **kwargs) -> bool:
    """Helper function to log a trade error"""
    return trade_logger.log_error(trade_id, error_type, error_message, **kwargs)

def query_trade_logs(**kwargs) -> List[Dict[str, Any]]:
    """Helper function to query trade logs"""
    return trade_logger.query_trades(**kwargs)

def get_trade_by_id(trade_id: str) -> Optional[Dict[str, Any]]:
    """Helper function to get a trade by ID"""
    return trade_logger.get_trade_by_id(trade_id)

def get_trade_summary(**kwargs) -> Dict[str, Any]:
    """Helper function to get trade summary statistics"""
    return trade_logger.get_summary_statistics(**kwargs)


# Test function
if __name__ == "__main__":
    print("\n=== Testing Trade Logger ===\n")
    
    # Test trade logger
    logger = TradeLogger.get_instance()
    
    # Test logging a trade signal
    print("Testing trade signal logging...")
    signal_id = logger.log_signal(
        symbol="BTCUSDT",
        side="BUY",
        source="AI_GRID_BOT",
        price=69000.0,
        quantity=0.001,
        signal_data={
            "confidence": 0.85,
            "indicators": {
                "rsi": 32.5,
                "macd": 0.125
            }
        }
    )
    print(f"Signal logged with ID: {signal_id}")
    
    # Test logging an order creation
    print("\nTesting order creation logging...")
    trade_id = logger.log_order_creation(
        symbol="BTCUSDT",
        side="BUY",
        quantity=0.001,
        price=None,
        order_type="MARKET",
        source="AI_GRID_BOT",
        signal_id=signal_id,
        metadata={
            "user_risk_level": "medium",
            "max_position_size": 0.01
        }
    )
    print(f"Order logged with ID: {trade_id}")
    
    # Test logging an execution result
    print("\nTesting execution result logging...")
    execution_logged = logger.log_order_execution(
        trade_id=trade_id,
        success=True,
        executed_price=69000.0,
        executed_quantity=0.001,
        order_id="BINANCE123456",
        is_paper_trade=True
    )
    print(f"Execution result logged: {execution_logged}")
    
    # Test querying trades
    print("\nTesting trade querying...")
    trades = logger.query_trades(
        symbol="BTCUSDT",
        source="AI_GRID_BOT",
        limit=10
    )
    print(f"Found {len(trades)} trades")
    
    # Test getting summary statistics
    print("\nTesting summary statistics...")
    stats = logger.get_summary_statistics()
    print(f"Statistics: {json.dumps(stats, indent=2)}")
    
    print("\n=== Trade Logger Test Complete ===")