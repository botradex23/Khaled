"""
Signal Receiver Module

This module provides functionality to receive, validate, store, and process AI trading signals.
"""

import logging
import json
import sys
import os
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Add parent directory to Python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Use absolute imports
from services.ai_signals.signal_validator import SignalValidator
from services.database_service import DatabaseService

# Configure logging
logger = logging.getLogger(__name__)

class SignalReceiver:
    """
    Receives, processes, and stores AI trading signals.
    
    This class handles the reception of AI trading signals, performs validation,
    saves signals to the database, and prepares them for further processing.
    """
    
    def __init__(self, database_service: Optional[DatabaseService] = None):
        """
        Initialize the SignalReceiver service.
        
        Args:
            database_service: Optional database service for storing signals
        """
        self.db_service = database_service
        self.validator = SignalValidator()
        logger.info("AI Signal Receiver service initialized")
    
    def receive_signal(self, signal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a received AI trading signal.
        
        Args:
            signal_data: Dictionary containing the signal data
            
        Returns:
            Dictionary with processing results
        """
        logger.info(f"Received AI signal: {json.dumps(signal_data)}")
        
        # Validate the signal
        validation_result = SignalValidator.validate_signal(signal_data)
        
        if not validation_result['valid']:
            logger.warning(f"Invalid signal received: {validation_result['message']}")
            logger.debug(f"Validation errors: {validation_result.get('errors', {})}")
            return {
                'success': False,
                'message': validation_result['message'],
                'errors': validation_result.get('errors', {})
            }
        
        # Extract the normalized signal
        normalized_signal = validation_result.get('normalized_signal', {})
        if not isinstance(normalized_signal, dict):
            logger.error(f"Expected normalized_signal to be a dict, but got {type(normalized_signal)}")
            return {
                'success': False,
                'message': "Internal error: normalized signal has incorrect format",
            }
        
        # Log the received signal
        self._log_signal(normalized_signal)
        
        # Store in database if database service is available
        stored_signal = None
        if self.db_service:
            try:
                stored_signal = self._store_signal(normalized_signal)
                signal_id = stored_signal.get('_id', 'unknown')
                logger.info(f"Signal stored with ID: {signal_id}")
            except Exception as e:
                logger.error(f"Failed to store signal: {str(e)}")
                return {
                    'success': False,
                    'message': f"Signal validation succeeded but storage failed: {str(e)}",
                    'signal': normalized_signal
                }
        else:
            logger.warning("Database service not available - signal not stored")
        
        # Queue the signal for processing (implementation will be added later)
        self._queue_signal_for_processing(normalized_signal)
        
        return {
            'success': True,
            'message': 'Signal received and processed successfully',
            'signal': normalized_signal,
            'stored': stored_signal is not None
        }
    
    def _log_signal(self, signal: Dict[str, Any]) -> None:
        """
        Log the details of a received signal.
        
        Args:
            signal: Dictionary containing the normalized signal data
        """
        symbol = signal['symbol']
        action = signal['action']
        confidence = signal['confidence']
        timestamp_iso = signal['timestamp_iso']
        
        logger.info(f"AI Signal: {action} {symbol} (Confidence: {confidence:.2f}) at {timestamp_iso}")
    
    def _store_signal(self, signal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Store a signal in the database.
        
        Args:
            signal: Dictionary containing the normalized signal data
            
        Returns:
            Dictionary containing the stored signal data with database ID
        """
        if not self.db_service:
            raise ValueError("Database service not available")
        
        # For now, we'll use a simple key-value storage approach
        # In a real implementation, this would use a proper database schema
        collection = "ai_signals"
        
        # Add storage timestamp
        signal['stored_at'] = datetime.utcnow().timestamp()
        signal['stored_at_iso'] = datetime.utcnow().isoformat()
        
        # Store in database
        result = self.db_service.insert_one(collection, signal)
        
        # Return the stored signal with its ID
        return {**signal, '_id': result.inserted_id}
    
    def _queue_signal_for_processing(self, signal: Dict[str, Any]) -> None:
        """
        Queue a signal for further processing by the trade execution service.
        
        Args:
            signal: Dictionary containing the normalized signal data
        """
        # This is a placeholder for future implementation
        # In a real system, this would add the signal to a queue
        # or emit an event for other services to consume
        
        # For now, just log that we would process this signal
        logger.info(f"Signal queued for processing: {signal['action']} {signal['symbol']}")
        
        # TODO: In future implementations, this would:
        # 1. Add the signal to a message queue (e.g., RabbitMQ, Redis)
        # 2. Or emit an event via a publish/subscribe mechanism
        # 3. Or write to a stream processing system