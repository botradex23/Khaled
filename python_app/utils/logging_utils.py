#!/usr/bin/env python3
"""
Logging Utilities for ML Prediction System

This module provides utilities for setting up and configuring logging
across the ML prediction pipeline components. It ensures consistent
log formatting, rotation, and storage.
"""

import os
import sys
import json
import logging
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from datetime import datetime
from typing import Dict, Any, Optional, Union

# Base log directory
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 'logs')

# Ensure log directory exists
os.makedirs(LOG_DIR, exist_ok=True)

# Log format
DEFAULT_LOG_FORMAT = '%(asctime)s [%(levelname)s] [%(name)s] %(message)s'
DEFAULT_DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

# Log levels mapping
LOG_LEVELS = {
    'debug': logging.DEBUG,
    'info': logging.INFO,
    'warning': logging.WARNING,
    'error': logging.ERROR,
    'critical': logging.CRITICAL
}

def get_log_level(level_str: str) -> int:
    """
    Get the logging level from a string
    
    Args:
        level_str: String representation of log level ('debug', 'info', etc.)
        
    Returns:
        Logging level (int)
    """
    return LOG_LEVELS.get(level_str.lower(), logging.INFO)

def setup_logger(
    name: str,
    log_level: Union[str, int] = 'info',
    log_to_console: bool = True,
    log_to_file: bool = True,
    log_format: str = DEFAULT_LOG_FORMAT,
    date_format: str = DEFAULT_DATE_FORMAT,
    json_logging: bool = False,
    max_bytes: int = 10 * 1024 * 1024,  # 10 MB
    backup_count: int = 7
) -> logging.Logger:
    """
    Set up and configure a logger
    
    Args:
        name: Name of the logger
        log_level: Logging level ('debug', 'info', etc.) or level constant
        log_to_console: Whether to log to console
        log_to_file: Whether to log to file
        log_format: Log format string
        date_format: Date format string
        json_logging: Whether to also create JSON log files
        max_bytes: Maximum size of each log file
        backup_count: Number of backup files to keep
        
    Returns:
        Configured logger
    """
    # Convert string log level to int if needed
    if isinstance(log_level, str):
        log_level = get_log_level(log_level)
    
    # Create logger
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    
    # Remove existing handlers if any
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Create formatter
    formatter = logging.Formatter(log_format, date_format)
    
    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
    
    if log_to_file:
        # File handlers
        log_file = os.path.join(LOG_DIR, f'{name}.log')
        
        # Size-based rotating file handler
        file_handler = RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # Also add a time-based handler for daily rotation
        daily_handler = TimedRotatingFileHandler(
            log_file,
            when='midnight',
            interval=1,
            backupCount=backup_count
        )
        daily_handler.setFormatter(formatter)
        logger.addHandler(daily_handler)
        
        # JSON logging if requested
        if json_logging:
            json_log_file = os.path.join(LOG_DIR, f'{name}.json')
            json_handler = RotatingFileHandler(
                json_log_file,
                maxBytes=max_bytes,
                backupCount=backup_count
            )
            
            # Custom JSON formatter
            class JsonFormatter(logging.Formatter):
                def format(self, record):
                    log_data = {
                        'timestamp': datetime.fromtimestamp(record.created).strftime(date_format),
                        'level': record.levelname,
                        'module': record.name,
                        'message': record.getMessage(),
                        'logger': name
                    }
                    
                    # Include exception info if any
                    if record.exc_info:
                        log_data['exception'] = self.formatException(record.exc_info)
                    
                    # Add any extra attributes from record.__dict__
                    # This is the proper way to access extra data passed via the 'extra' parameter
                    for key, value in record.__dict__.items():
                        if key not in ['name', 'msg', 'args', 'levelname', 'levelno', 'pathname', 
                                      'filename', 'module', 'exc_info', 'exc_text', 'lineno', 
                                      'funcName', 'created', 'asctime', 'msecs', 'relativeCreated', 
                                      'thread', 'threadName', 'processName', 'process']:
                            log_data[key] = value
                    
                    return json.dumps(log_data)
            
            json_handler.setFormatter(JsonFormatter())
            logger.addHandler(json_handler)
    
    return logger

def log_with_data(logger, level, message, data=None):
    """
    Log a message with additional JSON data
    
    Args:
        logger: Logger instance
        level: Log level
        message: Log message
        data: Additional data to include in JSON logs
    """
    if data is not None:
        # Create a dict for the 'extra' parameter in logging
        extra_dict = {'extra': data}
        logger.log(level, message, extra=extra_dict)
    else:
        logger.log(level, message)

# Pre-configured loggers for different components
def get_data_loader_logger():
    return setup_logger('data_loader', 'info', json_logging=True)

def get_prediction_engine_logger():
    return setup_logger('prediction_engine', 'info', json_logging=True)

def get_model_logger():
    return setup_logger('model', 'info', json_logging=True)

def get_trading_bridge_logger():
    return setup_logger('trading_bridge', 'info', json_logging=True)

def get_validation_logger():
    return setup_logger('validation', 'info', json_logging=True)

def get_binance_service_logger():
    return setup_logger('binance_service', 'info', json_logging=True)

# Global logger for general use
global_logger = setup_logger('ml_system', 'info', json_logging=True)

if __name__ == "__main__":
    # Simple test of the logging utility
    logger = setup_logger('test_logger', 'debug', json_logging=True)
    
    logger.debug("This is a debug message")
    logger.info("This is an info message")
    logger.warning("This is a warning message")
    logger.error("This is an error message")
    
    # Log with extra data for JSON
    extra_data = {
        'model': 'xgboost_btcusdt_balanced',
        'prediction': 'BUY',
        'confidence': 0.85,
        'features': {
            'rsi_14': 32.5,
            'macd': 0.125
        }
    }
    log_with_data(logger, logging.INFO, "Prediction made", extra_data)
    
    print(f"Log files created in: {LOG_DIR}")