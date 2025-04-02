"""
Signal Validator Module

This module provides validation functionality for AI trading signals.
"""

import logging
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Add parent directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Configure logging
logger = logging.getLogger(__name__)

class SignalValidator:
    """
    Validates AI trading signals to ensure they meet the required format and constraints.
    """
    
    # Valid actions for trading signals
    VALID_ACTIONS = ["BUY", "SELL", "HOLD"]
    
    @staticmethod
    def validate_signal(signal: Dict[str, Any]) -> Dict[str, Union[bool, str, Dict[str, Any]]]:
        """
        Validates an AI trading signal against the required schema.
        
        Args:
            signal: Dictionary containing the signal data
            
        Returns:
            Dictionary with validation results including:
                - valid: Boolean indicating if the signal is valid
                - message: Description of validation result or error
                - errors: Dictionary of specific field errors (if any)
                - normalized_signal: Normalized signal data (if valid)
        """
        errors = {}
        
        # Check required fields
        required_fields = ['symbol', 'action', 'confidence', 'timestamp']
        for field in required_fields:
            if field not in signal:
                errors[field] = f"Missing required field: {field}"
        
        # Return early if missing required fields
        if errors:
            return {
                'valid': False,
                'message': 'Missing required fields',
                'errors': errors
            }
        
        # Validate symbol format
        symbol = signal.get('symbol', '')
        if not isinstance(symbol, str) or not symbol:
            errors['symbol'] = "Symbol must be a non-empty string"
        elif not SignalValidator._is_valid_symbol_format(symbol):
            errors['symbol'] = f"Invalid symbol format: {symbol}"
            
        # Validate action
        action = signal.get('action', '')
        if not isinstance(action, str) or action not in SignalValidator.VALID_ACTIONS:
            errors['action'] = f"Action must be one of: {', '.join(SignalValidator.VALID_ACTIONS)}"
            
        # Validate confidence
        confidence = signal.get('confidence')
        if not isinstance(confidence, (int, float)):
            errors['confidence'] = "Confidence must be a number"
        elif confidence < 0 or confidence > 1:
            errors['confidence'] = "Confidence must be between 0 and 1"
            
        # Validate timestamp
        timestamp = signal.get('timestamp')
        if isinstance(timestamp, str):
            try:
                # Try parsing the timestamp
                datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            except ValueError:
                errors['timestamp'] = "Invalid timestamp format. Use ISO format (YYYY-MM-DDTHH:MM:SS.sssZ)"
        elif isinstance(timestamp, (int, float)):
            # Check if it's a reasonable Unix timestamp (between 2020 and 2050)
            if timestamp < 1577836800 or timestamp > 2524608000:
                errors['timestamp'] = "Timestamp out of reasonable range (2020-2050)"
        else:
            errors['timestamp'] = "Timestamp must be a string in ISO format or a Unix timestamp number"
        
        # Return validation result
        if errors:
            return {
                'valid': False,
                'message': 'Validation failed',
                'errors': errors
            }
        
        # Create normalized signal
        normalized_signal = SignalValidator._normalize_signal(signal)
        
        return {
            'valid': True,
            'message': 'Signal is valid',
            'normalized_signal': normalized_signal
        }
    
    @staticmethod
    def _normalize_signal(signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normalizes a validated signal to ensure consistent format.
        
        Args:
            signal: Dictionary containing the validated signal data
            
        Returns:
            Normalized signal dictionary
        """
        normalized = {
            'symbol': signal['symbol'].upper(),  # Ensure uppercase for symbol
            'action': signal['action'].upper(),  # Ensure uppercase for action
            'confidence': float(signal['confidence']),  # Ensure float for confidence
        }
        
        # Handle timestamp normalization
        timestamp = signal['timestamp']
        if isinstance(timestamp, str):
            # Convert ISO string to unix timestamp
            try:
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                normalized['timestamp'] = dt.timestamp()
                normalized['timestamp_iso'] = dt.isoformat()
            except ValueError:
                # Fallback to current time if there was an error (this shouldn't happen due to validation)
                now = datetime.utcnow()
                normalized['timestamp'] = now.timestamp()
                normalized['timestamp_iso'] = now.isoformat()
        else:
            # It's already a unix timestamp
            normalized['timestamp'] = float(timestamp)
            normalized['timestamp_iso'] = datetime.fromtimestamp(float(timestamp)).isoformat()
        
        # Include original signal data if provided
        if 'raw_data' in signal:
            normalized['raw_data'] = signal['raw_data']
            
        # Include signal source if provided
        if 'source' in signal:
            normalized['source'] = signal['source']
            
        # Include additional metadata if provided
        if 'metadata' in signal:
            normalized['metadata'] = signal['metadata']
            
        # Add received_at timestamp
        normalized['received_at'] = datetime.utcnow().timestamp()
        normalized['received_at_iso'] = datetime.utcnow().isoformat()
        
        return normalized
    
    @staticmethod
    def _is_valid_symbol_format(symbol: str) -> bool:
        """
        Validates the format of a trading symbol.
        
        Args:
            symbol: Trading symbol string (e.g. "BTCUSDT")
            
        Returns:
            Boolean indicating if the symbol format is valid
        """
        # Basic validation: non-empty string with only alphanumeric chars
        if not symbol or not all(c.isalnum() for c in symbol):
            return False
        
        # Symbol should have a base asset and quote asset
        # For crypto, typically 5-12 characters (e.g., BTCUSDT, ETHBTC, SOLUSDT)
        # This is a simplified check - real implementation might need more specific rules
        if len(symbol) < 5 or len(symbol) > 12:
            # There are exceptions, so not strict validation
            logger.warning(f"Symbol length unusual: {symbol} ({len(symbol)} chars)")
        
        return True