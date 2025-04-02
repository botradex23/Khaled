#!/usr/bin/env python3
"""
ML Trading Bridge

This module serves as a bridge between ML prediction models and trading execution.
It provides simplified interfaces for getting trading signals and recommendations
that can be used by both ML-based trading systems and manual trading interfaces.
"""

import os
import sys
import json
import time
import logging
import random
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple, cast

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'ml_trading_bridge.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ml_trading_bridge')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Try to import the ML prediction engine
try:
    from ml_prediction_engine import predict_next_move
except ImportError:
    logger.warning("Could not import ML prediction engine - using fallback predictions")
    
    def predict_next_move(symbol: str, model_type: str = 'xgboost', timeframe: str = '1h'):
        """Fallback prediction function that returns random signals"""
        signals = ['BUY', 'SELL', 'HOLD']
        weights = [0.3, 0.3, 0.4]  # Higher probability for HOLD
        signal = random.choices(signals, weights=weights, k=1)[0]
        confidence = random.uniform(0.5, 0.95)
        
        # For testing purposes, make BTC more bullish
        if 'BTC' in symbol and random.random() < 0.6:
            signal = 'BUY'
            confidence = random.uniform(0.7, 0.95)
        
        price = 69000.0 if 'BTC' in symbol else 1900.0 if 'ETH' in symbol else 500.0 if 'BNB' in symbol else 10.0
        # Add some randomness to price
        price *= random.uniform(0.98, 1.02)
        
        return {
            'success': True,
            'symbol': symbol,
            'signal': signal,
            'confidence': confidence,
            'price': price,
            'timestamp': datetime.now().isoformat(),
            'is_fallback': True
        }

# Try to import market service for getting prices
try:
    from services.binance.market_service import binance_market_service
except ImportError:
    logger.warning("Could not import Binance market service - using fallback prices")
    binance_market_service = None


class MLTradingBridge:
    """
    Bridge between ML predictions and trading execution
    
    This class provides simplified interfaces for getting trading signals
    and recommendations that can be used by trading systems.
    """
    
    def __init__(self, confidence_threshold: float = 0.7):
        """
        Initialize the ML Trading Bridge
        
        Args:
            confidence_threshold: Minimum confidence for trading signals
        """
        self.confidence_threshold = confidence_threshold
        self.signal_cache = {}  # Cache for recent signals
        self.cache_ttl = 300    # Cache TTL in seconds (5 minutes)
        
        logger.info(f"ML Trading Bridge initialized with confidence threshold: {confidence_threshold}")
    
    def get_signal(self, 
                  symbol: str, 
                  model_type: Optional[str] = None,
                  timeframe: str = '1h',
                  force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get trading signal for a symbol
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            model_type: ML model type to use
            timeframe: Timeframe for analysis
            force_refresh: Whether to force refresh the signal
            
        Returns:
            Signal data with prediction
        """
        # Format symbol
        symbol = symbol.upper().replace('-', '')
        
        # If model type is not specified, use default (xgboost)
        if model_type is None:
            model_type = 'xgboost'
        
        # Check cache first if not forcing refresh
        cache_key = f"{symbol}_{model_type}_{timeframe}"
        if not force_refresh and cache_key in self.signal_cache:
            cached_signal = self.signal_cache[cache_key]
            cached_time = cached_signal.get('cache_time', 0)
            
            # Use cached signal if it's still fresh
            if time.time() - cached_time < self.cache_ttl:
                logger.debug(f"Using cached signal for {symbol} (model: {model_type})")
                return cached_signal
        
        # Get new prediction
        try:
            # Get prediction from ML engine
            prediction = predict_next_move(symbol, model_type, timeframe)
            
            # Get current price using market service if available
            if binance_market_service:
                try:
                    price_data = binance_market_service.get_symbol_price(symbol)
                    if price_data and 'price' in price_data:
                        prediction['price'] = float(price_data['price'])
                except Exception as e:
                    logger.warning(f"Error getting current price for {symbol}: {e}")
            
            # Add additional metadata
            prediction['timestamp'] = datetime.now().isoformat()
            prediction['cache_time'] = time.time()
            prediction['model_type'] = model_type
            prediction['timeframe'] = timeframe
            
            # Cache the result
            self.signal_cache[cache_key] = prediction
            
            logger.info(f"ML signal for {symbol}: {prediction['signal']} with {prediction['confidence']:.2f} confidence")
            return prediction
            
        except Exception as e:
            error_msg = f"Error getting ML signal for {symbol}: {e}"
            logger.error(error_msg)
            
            return {
                'success': False,
                'symbol': symbol,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_signals_batch(self, 
                         symbols: List[str], 
                         model_type: Optional[str] = None,
                         timeframe: str = '1h',
                         force_refresh: bool = False) -> Dict[str, Any]:
        """
        Get trading signals for multiple symbols
        
        Args:
            symbols: List of trading pair symbols
            model_type: ML model type to use
            timeframe: Timeframe for analysis
            force_refresh: Whether to force refresh signals
            
        Returns:
            Dictionary with signals for each symbol
        """
        # Format symbols
        formatted_symbols = [s.upper().replace('-', '') for s in symbols]
        
        results = {
            'timestamp': datetime.now().isoformat(),
            'signals': {}
        }
        
        # Process each symbol
        for symbol in formatted_symbols:
            try:
                # Get signal for this symbol
                signal = self.get_signal(
                    symbol=symbol,
                    model_type=model_type,
                    timeframe=timeframe,
                    force_refresh=force_refresh
                )
                
                # Store in results
                results['signals'][symbol] = signal
                
            except Exception as e:
                # Log error and continue with other symbols
                error_msg = f"Error getting signal for {symbol}: {e}"
                logger.error(error_msg)
                
                # Store error in results
                results['signals'][symbol] = {
                    'success': False,
                    'symbol': symbol,
                    'error': str(e),
                    'timestamp': datetime.now().isoformat()
                }
        
        return results
    
    def should_open_position(self, 
                            symbol: str, 
                            direction: str,
                            model_type: Optional[str] = None) -> Tuple[bool, Dict[str, Any]]:
        """
        Check if we should open a position based on ML signal
        
        Args:
            symbol: Trading pair symbol
            direction: Position direction (LONG or SHORT)
            model_type: ML model type to use
            
        Returns:
            Tuple of (should_open, signal_data)
        """
        # Format inputs
        symbol = symbol.upper().replace('-', '')
        direction = direction.upper()
        
        # Get ML signal
        signal = self.get_signal(symbol, model_type, force_refresh=True)
        
        # If failed to get signal, don't open position
        if not signal.get('success', False):
            logger.warning(f"Failed to get signal for {symbol} - not opening position")
            return False, signal
        
        # Determine if we should open position based on signal and direction
        signal_type = signal.get('signal', '').upper()
        confidence = signal.get('confidence', 0)
        
        should_open = False
        
        # For LONG positions, only open on BUY signals
        if direction == 'LONG' and signal_type == 'BUY' and confidence >= self.confidence_threshold:
            should_open = True
        
        # For SHORT positions, only open on SELL signals
        elif direction == 'SHORT' and signal_type == 'SELL' and confidence >= self.confidence_threshold:
            should_open = True
        
        logger.info(f"Should open {direction} position for {symbol}? {should_open} (signal: {signal_type}, confidence: {confidence:.2f})")
        return should_open, signal
    
    def get_recommended_pairs(self, 
                             symbols: List[str], 
                             max_pairs: int = 5,
                             min_confidence: float = 0.7,
                             model_type: Optional[str] = None,
                             timeframe: str = '1h') -> Dict[str, Any]:
        """
        Get recommended trading pairs based on ML signals
        
        Args:
            symbols: List of trading pair symbols to analyze
            max_pairs: Maximum number of pairs to recommend
            min_confidence: Minimum confidence threshold
            model_type: ML model type to use
            timeframe: Timeframe for analysis
            
        Returns:
            Dictionary with recommended pairs for long and short positions
        """
        # Get signals for all symbols
        signals_batch = self.get_signals_batch(
            symbols=symbols,
            model_type=model_type,
            timeframe=timeframe,
            force_refresh=True
        )
        
        # Extract signals
        signals = signals_batch.get('signals', {})
        
        # Filter and sort signals
        buy_signals = []
        sell_signals = []
        
        for symbol, signal in signals.items():
            # Skip failed signals
            if not signal.get('success', False):
                continue
            
            signal_type = signal.get('signal', '').upper()
            confidence = signal.get('confidence', 0)
            
            # Skip signals below confidence threshold
            if confidence < min_confidence:
                continue
            
            # Categorize by signal type
            if signal_type == 'BUY':
                buy_signals.append({
                    'symbol': symbol,
                    'confidence': confidence,
                    'price': signal.get('price', 0),
                    'signal': signal
                })
            elif signal_type == 'SELL':
                sell_signals.append({
                    'symbol': symbol,
                    'confidence': confidence,
                    'price': signal.get('price', 0),
                    'signal': signal
                })
        
        # Sort by confidence (highest first)
        buy_signals.sort(key=lambda x: x['confidence'], reverse=True)
        sell_signals.sort(key=lambda x: x['confidence'], reverse=True)
        
        # Limit to max_pairs
        buy_signals = buy_signals[:max_pairs]
        sell_signals = sell_signals[:max_pairs]
        
        # Create result
        result = {
            'success': True,
            'timestamp': datetime.now().isoformat(),
            'long': buy_signals,
            'short': sell_signals,
            'model_type': model_type,
            'timeframe': timeframe,
            'min_confidence': min_confidence
        }
        
        logger.info(f"Recommended pairs: {len(buy_signals)} long, {len(sell_signals)} short")
        return result
    
    def should_close_position(self, 
                             symbol: str, 
                             direction: str,
                             entry_price: float,
                             current_price: float,
                             stop_loss_pct: float = 2.0,
                             take_profit_pct: float = 4.0,
                             model_type: Optional[str] = None) -> Tuple[bool, str]:
        """
        Check if we should close a position based on price and ML signal
        
        Args:
            symbol: Trading pair symbol
            direction: Position direction (LONG or SHORT)
            entry_price: Position entry price
            current_price: Current market price
            stop_loss_pct: Stop loss percentage
            take_profit_pct: Take profit percentage
            model_type: ML model type to use
            
        Returns:
            Tuple of (should_close, reason)
        """
        # Format inputs
        symbol = symbol.upper().replace('-', '')
        direction = direction.upper()
        
        # Calculate price difference percentage
        price_diff_pct = 0
        
        if direction == 'LONG':
            # For long positions: (current - entry) / entry * 100
            price_diff_pct = ((current_price - entry_price) / entry_price) * 100
        else:  # SHORT
            # For short positions: (entry - current) / entry * 100
            price_diff_pct = ((entry_price - current_price) / entry_price) * 100
        
        # Check stop loss
        if price_diff_pct <= -stop_loss_pct:
            return True, f"Stop loss triggered: {price_diff_pct:.2f}%"
        
        # Check take profit
        if price_diff_pct >= take_profit_pct:
            return True, f"Take profit triggered: {price_diff_pct:.2f}%"
        
        # Get ML signal
        signal = self.get_signal(symbol, model_type, force_refresh=True)
        
        # If failed to get signal, don't close based on ML
        if not signal.get('success', False):
            return False, "No ML signal available"
        
        signal_type = signal.get('signal', '').upper()
        confidence = signal.get('confidence', 0)
        
        # Check if ML signal suggests closing
        should_close = False
        reason = "ML signal not strong enough to close"
        
        # For LONG positions, close on strong SELL signal
        if direction == 'LONG' and signal_type == 'SELL' and confidence >= self.confidence_threshold:
            should_close = True
            reason = f"ML sell signal with {confidence:.2f} confidence"
        
        # For SHORT positions, close on strong BUY signal
        elif direction == 'SHORT' and signal_type == 'BUY' and confidence >= self.confidence_threshold:
            should_close = True
            reason = f"ML buy signal with {confidence:.2f} confidence"
        
        logger.info(f"Should close {direction} position for {symbol}? {should_close} (reason: {reason})")
        return should_close, reason


# Create a singleton instance
_ml_trading_bridge = None

def get_ml_trading_bridge(confidence_threshold: float = 0.7) -> MLTradingBridge:
    """
    Get or create the MLTradingBridge singleton instance
    
    Args:
        confidence_threshold: Minimum confidence for trading signals
        
    Returns:
        The MLTradingBridge instance
    """
    global _ml_trading_bridge
    if _ml_trading_bridge is None:
        _ml_trading_bridge = MLTradingBridge(
            confidence_threshold=confidence_threshold
        )
    return _ml_trading_bridge


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing ML Trading Bridge ===\n")
    
    # Create the bridge
    bridge = get_ml_trading_bridge()
    
    # Test getting signal for BTCUSDT
    print("Testing ML signal for BTCUSDT...")
    signal = bridge.get_signal("BTCUSDT", force_refresh=True)
    print(f"Signal: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
    print(f"Price: {signal.get('price')}")
    
    # Test batch signals
    print("\nTesting batch signals...")
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
    batch_results = bridge.get_signals_batch(symbols)
    
    for symbol, signal in batch_results.get('signals', {}).items():
        if signal.get('success', False):
            print(f"{symbol}: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
        else:
            print(f"{symbol}: Failed - {signal.get('error', 'Unknown error')}")
    
    # Test recommended pairs
    print("\nTesting recommended pairs...")
    recommendations = bridge.get_recommended_pairs(symbols, max_pairs=3)
    
    print("Long recommendations:")
    for rec in recommendations.get('long', []):
        print(f"- {rec['symbol']}: {rec['confidence']:.2f} confidence @ {rec['price']}")
    
    print("\nShort recommendations:")
    for rec in recommendations.get('short', []):
        print(f"- {rec['symbol']}: {rec['confidence']:.2f} confidence @ {rec['price']}")
    
    # Test should_open_position
    print("\nTesting should_open_position...")
    should_open, signal = bridge.should_open_position("BTCUSDT", "LONG")
    print(f"Should open LONG position for BTCUSDT? {should_open}")
    
    # Test should_close_position
    print("\nTesting should_close_position...")
    entry_price = 69000.0
    current_price = 69500.0
    should_close, reason = bridge.should_close_position(
        "BTCUSDT", "LONG", entry_price, current_price
    )
    print(f"Should close LONG position for BTCUSDT? {should_close} (reason: {reason})")
    
    print("\nTest completed!")