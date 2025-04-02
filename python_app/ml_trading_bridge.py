#!/usr/bin/env python3
"""
ML Trading Bridge

This module provides a bridge between the ML prediction system and the trading bots.
It allows trading bots to use ML predictions for decision making without requiring 
HTTP API calls.
"""

import os
import sys
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the trading ML interface
from trading_ml import (
    get_trading_ml,
    get_prediction,
    get_trading_signal,
    get_batch_trading_signals
)

class MLTradingBridge:
    """
    Bridge between ML prediction and trading systems.
    
    This class provides the interface for trading bots to leverage ML predictions
    for generating trading signals and making trading decisions.
    """
    
    def __init__(self, 
                 default_model: str = 'balanced', 
                 confidence_threshold: float = 0.7,
                 prediction_interval: str = '5m',
                 cache_duration: int = 300):  # Cache for 5 minutes by default
        """
        Initialize the ML Trading Bridge
        
        Args:
            default_model: Default model type to use ('balanced' or 'standard')
            confidence_threshold: Minimum confidence for signals
            prediction_interval: Timeframe for predictions
            cache_duration: How long to cache predictions (in seconds)
        """
        self.default_model = default_model
        self.confidence_threshold = confidence_threshold
        self.prediction_interval = prediction_interval
        self.cache_duration = cache_duration
        self.signal_cache = {}  # Symbol -> {'signal': signal, 'timestamp': timestamp, ...}
        
        # Get the trading ML instance
        self.trading_ml = get_trading_ml()
        
        logger.info(f"ML Trading Bridge initialized with {default_model} model, {confidence_threshold} confidence threshold")
    
    def get_signal(self, 
                  symbol: str, 
                  model_type: Optional[str] = None,
                  force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get a trading signal for a symbol
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            model_type: Override default model type
            force_refresh: Force refresh the cached signal
            
        Returns:
            Trading signal dictionary
        """
        # Standardize symbol format
        symbol = symbol.upper().replace('-', '')
        
        # Use default model if not specified
        model_type = model_type or self.default_model
        
        # Check cache first if not forcing refresh
        if not force_refresh and symbol in self.signal_cache:
            cached_signal = self.signal_cache[symbol]
            cached_time = datetime.fromisoformat(cached_signal['timestamp'])
            now = datetime.now()
            
            # Return cached signal if it's still valid
            if (now - cached_time).total_seconds() < self.cache_duration:
                logger.debug(f"Using cached signal for {symbol}: {cached_signal['signal']}")
                return cached_signal
        
        # Get fresh signal
        logger.info(f"Getting fresh signal for {symbol} using {model_type} model")
        signal = self.trading_ml.get_trading_signal(
            symbol, 
            model_type, 
            self.confidence_threshold
        )
        
        # Cache the signal
        if signal['success']:
            self.signal_cache[symbol] = signal
            logger.info(f"Cached new signal for {symbol}: {signal['signal']} with confidence {signal['confidence']:.2f}")
        
        return signal
    
    def get_batch_signals(self, 
                         symbols: List[str], 
                         model_type: Optional[str] = None,
                         force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get trading signals for multiple symbols
        
        Args:
            symbols: List of trading pairs
            model_type: Override default model type
            force_refresh: Force refresh cached signals
            
        Returns:
            Dictionary with trading signals for all symbols
        """
        # Standardize symbol formats
        symbols = [s.upper().replace('-', '') for s in symbols]
        
        # Use default model if not specified
        model_type = model_type or self.default_model
        
        # If not forcing refresh, check which symbols need refreshing
        to_refresh = symbols
        if not force_refresh:
            now = datetime.now()
            to_refresh = []
            
            for symbol in symbols:
                need_refresh = True
                
                if symbol in self.signal_cache:
                    cached_signal = self.signal_cache[symbol]
                    cached_time = datetime.fromisoformat(cached_signal['timestamp'])
                    
                    if (now - cached_time).total_seconds() < self.cache_duration:
                        need_refresh = False
                
                if need_refresh:
                    to_refresh.append(symbol)
        
        # Get fresh signals for symbols that need refreshing
        if to_refresh:
            logger.info(f"Getting fresh signals for {len(to_refresh)} symbols using {model_type} model")
            batch_result = self.trading_ml.get_batch_trading_signals(
                to_refresh,
                model_type,
                self.confidence_threshold
            )
            
            # Cache the new signals
            if batch_result['success']:
                for signal in batch_result['signals']:
                    symbol = signal['symbol']
                    self.signal_cache[symbol] = {
                        **signal,
                        'success': True,
                        'timestamp': batch_result['timestamp']
                    }
        
        # Build the final result combining fresh and cached signals
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'signals': []
        }
        
        for symbol in symbols:
            if symbol in self.signal_cache:
                result['signals'].append(self.signal_cache[symbol])
            else:
                # Add a placeholder for symbols without signals
                result['signals'].append({
                    'symbol': symbol,
                    'signal': 'HOLD',  # Default
                    'confidence': 0.0,
                    'price': None,
                    'timestamp': datetime.now().isoformat(),
                    'error': 'No signal available',
                    'success': False
                })
        
        return result
    
    def should_open_position(self, 
                           symbol: str, 
                           direction: str,
                           model_type: Optional[str] = None,
                           min_confidence: Optional[float] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a position should be opened based on ML prediction
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            direction: Direction of the trade ('LONG' or 'SHORT')
            model_type: Override default model type
            min_confidence: Override default confidence threshold
            
        Returns:
            Tuple of (should_open, signal_info)
        """
        # Standardize inputs
        symbol = symbol.upper().replace('-', '')
        direction = direction.upper()
        model_type = model_type or self.default_model
        min_confidence = min_confidence or self.confidence_threshold
        
        # Get signal
        signal = self.get_signal(symbol, model_type)
        
        # Default response
        should_open = False
        
        # Check if signal matches the requested direction
        if signal['success']:
            predicted_signal = signal['signal']
            confidence = signal['confidence']
            
            if direction == 'LONG' and predicted_signal == 'BUY' and confidence >= min_confidence:
                logger.info(f"ML signal BUY with {confidence:.2f} confidence supports opening LONG position for {symbol}")
                should_open = True
            
            elif direction == 'SHORT' and predicted_signal == 'SELL' and confidence >= min_confidence:
                logger.info(f"ML signal SELL with {confidence:.2f} confidence supports opening SHORT position for {symbol}")
                should_open = True
            
            else:
                logger.info(f"ML signal {predicted_signal} with {confidence:.2f} confidence does not support opening {direction} position for {symbol}")
        else:
            logger.warning(f"Failed to get ML signal for {symbol}: {signal.get('error', 'Unknown error')}")
        
        return (should_open, signal)
    
    def should_close_position(self, 
                            symbol: str, 
                            direction: str,
                            model_type: Optional[str] = None,
                            min_confidence: Optional[float] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if a position should be closed based on ML prediction
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            direction: Direction of the open position ('LONG' or 'SHORT')
            model_type: Override default model type
            min_confidence: Override default confidence threshold
            
        Returns:
            Tuple of (should_close, signal_info)
        """
        # Standardize inputs
        symbol = symbol.upper().replace('-', '')
        direction = direction.upper()
        model_type = model_type or self.default_model
        min_confidence = min_confidence or self.confidence_threshold
        
        # Get signal
        signal = self.get_signal(symbol, model_type, force_refresh=True)  # Force refresh for close decisions
        
        # Default response
        should_close = False
        
        # Check if signal contradicts the current position
        if signal['success']:
            predicted_signal = signal['signal']
            confidence = signal['confidence']
            
            if direction == 'LONG' and predicted_signal == 'SELL' and confidence >= min_confidence:
                logger.info(f"ML signal SELL with {confidence:.2f} confidence suggests closing LONG position for {symbol}")
                should_close = True
            
            elif direction == 'SHORT' and predicted_signal == 'BUY' and confidence >= min_confidence:
                logger.info(f"ML signal BUY with {confidence:.2f} confidence suggests closing SHORT position for {symbol}")
                should_close = True
            
            else:
                logger.info(f"ML signal {predicted_signal} with {confidence:.2f} confidence does not suggest closing {direction} position for {symbol}")
        else:
            logger.warning(f"Failed to get ML signal for {symbol}: {signal.get('error', 'Unknown error')}")
        
        return (should_close, signal)
    
    def get_recommended_pairs(self, 
                            all_symbols: List[str],
                            max_pairs: int = 5,
                            min_confidence: Optional[float] = None,
                            model_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get recommended trading pairs based on ML predictions
        
        Args:
            all_symbols: List of all trading pairs to consider
            max_pairs: Maximum number of pairs to recommend
            min_confidence: Override default confidence threshold
            model_type: Override default model type
            
        Returns:
            Dictionary with recommended pairs for LONG and SHORT positions
        """
        # Standardize inputs
        all_symbols = [s.upper().replace('-', '') for s in all_symbols]
        model_type = model_type or self.default_model
        min_confidence = min_confidence or self.confidence_threshold
        
        # Get batch signals
        batch_result = self.get_batch_signals(all_symbols, model_type, force_refresh=True)
        
        recommended = {
            'success': batch_result['success'],
            'timestamp': batch_result['timestamp'],
            'long': [],
            'short': []
        }
        
        if not batch_result['success']:
            recommended['error'] = batch_result.get('error', 'Failed to get signals')
            return recommended
        
        # Filter and sort signals by confidence
        buy_signals = []
        sell_signals = []
        
        for signal in batch_result['signals']:
            if signal.get('success', False):
                signal_type = signal['signal']
                confidence = signal['confidence']
                
                if signal_type == 'BUY' and confidence >= min_confidence:
                    buy_signals.append(signal)
                elif signal_type == 'SELL' and confidence >= min_confidence:
                    sell_signals.append(signal)
        
        # Sort by confidence (descending)
        buy_signals.sort(key=lambda x: x['confidence'], reverse=True)
        sell_signals.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Take top signals up to max_pairs
        recommended['long'] = buy_signals[:max_pairs]
        recommended['short'] = sell_signals[:max_pairs]
        
        logger.info(f"Recommended {len(recommended['long'])} LONG and {len(recommended['short'])} SHORT positions")
        
        return recommended


# Create a singleton instance
_ml_trading_bridge = None

def get_ml_trading_bridge() -> MLTradingBridge:
    """
    Get or create the MLTradingBridge singleton instance
    
    Returns:
        The MLTradingBridge instance
    """
    global _ml_trading_bridge
    if _ml_trading_bridge is None:
        _ml_trading_bridge = MLTradingBridge()
    return _ml_trading_bridge


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing ML Trading Bridge ===\n")
    
    # Create the bridge
    bridge = get_ml_trading_bridge()
    
    # Test getting a trading signal
    symbol = "BTCUSDT"
    signal = bridge.get_signal(symbol)
    print(f"Signal for {symbol}:")
    print(json.dumps(signal, indent=2))
    
    # Test should_open_position
    print("\nTesting should_open_position for LONG:")
    should_open, signal_info = bridge.should_open_position(symbol, "LONG")
    print(f"Should open LONG position for {symbol}? {should_open}")
    
    print("\nTesting should_open_position for SHORT:")
    should_open, signal_info = bridge.should_open_position(symbol, "SHORT")
    print(f"Should open SHORT position for {symbol}? {should_open}")
    
    # Test should_close_position
    print("\nTesting should_close_position for LONG:")
    should_close, signal_info = bridge.should_close_position(symbol, "LONG")
    print(f"Should close LONG position for {symbol}? {should_close}")
    
    print("\nTesting should_close_position for SHORT:")
    should_close, signal_info = bridge.should_close_position(symbol, "SHORT")
    print(f"Should close SHORT position for {symbol}? {should_close}")
    
    # Test getting recommended pairs
    print("\nTesting get_recommended_pairs:")
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", 
               "XRPUSDT", "DOGEUSDT", "DOTUSDT", "MATICUSDT", "LINKUSDT"]
    recommended = bridge.get_recommended_pairs(symbols)
    print("Recommended pairs:")
    print(json.dumps(recommended, indent=2))