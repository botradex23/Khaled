#!/usr/bin/env python3
"""
Trading ML Interface

This module provides a simple, direct interface for the trading system to access
ML predictions without requiring API calls. It's designed to be imported and used
directly within Python trading bot code.
"""

import os
import sys
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Add current directory to path to ensure all imports work
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the ML prediction engine
from ml_prediction_engine import get_prediction_engine, direct_predict, direct_batch_predict

class TradingML:
    """
    Trading ML interface for direct integration with trading systems.
    This class provides a simple interface for making ML predictions for trading.
    """
    
    def __init__(self):
        """Initialize the Trading ML interface"""
        self.prediction_engine = get_prediction_engine()
        logger.info("Trading ML interface initialized")
    
    def get_prediction(self, 
                       symbol: str, 
                       model_type: str = 'balanced', 
                       interval: str = '5m') -> Dict[str, Any]:
        """
        Get a prediction for a single symbol
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            model_type: Model type ('balanced' or 'standard')
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
            
        Returns:
            Prediction result dictionary
        """
        try:
            # Log the prediction request
            logger.info(f"Making prediction for {symbol} using {model_type} model at {interval} interval")
            
            # Get the prediction
            result = self.prediction_engine.predict(symbol, model_type, interval)
            
            if result['success']:
                logger.info(f"Prediction for {symbol}: {result.get('predicted_label', 'Unknown')} with confidence {result.get('confidence', 0):.2f}")
            else:
                logger.error(f"Prediction failed for {symbol}: {result.get('error', 'Unknown error')}")
            
            return result
        
        except Exception as e:
            logger.error(f"Error in get_prediction for {symbol}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'symbol': symbol,
                'timestamp': datetime.now().isoformat()
            }
    
    def get_batch_predictions(self, 
                             symbols: List[str], 
                             model_type: str = 'balanced',
                             interval: str = '5m') -> Dict[str, Any]:
        """
        Get predictions for multiple symbols
        
        Args:
            symbols: List of trading pairs
            model_type: Model type ('balanced' or 'standard')
            interval: Timeframe (e.g., 1m, 5m, 15m, 1h, 4h, 1d)
            
        Returns:
            Dictionary with prediction results for all symbols
        """
        try:
            # Log the batch prediction request
            logger.info(f"Making batch prediction for {len(symbols)} symbols using {model_type} model at {interval} interval")
            
            # Get the predictions
            results = self.prediction_engine.batch_predict(symbols, model_type, interval)
            
            # Log results summary
            if results['success']:
                logger.info(f"Batch prediction completed successfully for {len(results['predictions'])} symbols")
                
                # Count signals by type
                signal_counts = {'BUY': 0, 'SELL': 0, 'HOLD': 0}
                for pred in results['predictions']:
                    signal = pred.get('predicted_label', 'HOLD')
                    signal_counts[signal] = signal_counts.get(signal, 0) + 1
                
                logger.info(f"Signal distribution: {signal_counts}")
            else:
                logger.error(f"Batch prediction failed: {results.get('error', 'Unknown error')}")
                
            return results
        
        except Exception as e:
            logger.error(f"Error in get_batch_predictions: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat(),
                'predictions': [],
                'failed_symbols': symbols
            }
    
    def get_trading_signal(self, 
                          symbol: str, 
                          model_type: str = 'balanced', 
                          min_confidence: float = 0.6) -> Dict[str, Any]:
        """
        Get a simplified trading signal suitable for direct use in trading bots
        
        Args:
            symbol: Trading pair (e.g., BTCUSDT)
            model_type: Model type ('balanced' or 'standard')
            min_confidence: Minimum confidence threshold (0.0-1.0)
            
        Returns:
            Dictionary with trading signal information
        """
        # Get the full prediction
        prediction = self.get_prediction(symbol, model_type)
        
        if not prediction['success']:
            return {
                'symbol': symbol,
                'signal': 'HOLD',  # Default to HOLD on error
                'confidence': 0.0,
                'price': None,
                'timestamp': datetime.now().isoformat(),
                'error': prediction.get('error', 'Unknown error'),
                'success': False
            }
        
        # Extract the signal and confidence
        signal = prediction.get('predicted_label', 'HOLD')
        confidence = prediction.get('confidence', 0.0)
        price = prediction.get('current_price')
        
        # Apply confidence threshold
        if confidence < min_confidence and signal != 'HOLD':
            logger.info(f"Signal {signal} for {symbol} has confidence {confidence:.2f} below threshold {min_confidence}, defaulting to HOLD")
            signal = 'HOLD'
        
        return {
            'symbol': symbol,
            'signal': signal,
            'confidence': confidence,
            'price': price,
            'timestamp': datetime.now().isoformat(),
            'success': True
        }
    
    def get_batch_trading_signals(self, 
                                 symbols: List[str], 
                                 model_type: str = 'balanced',
                                 min_confidence: float = 0.6) -> Dict[str, Any]:
        """
        Get simplified trading signals for multiple symbols
        
        Args:
            symbols: List of trading pairs
            model_type: Model type ('balanced' or 'standard')
            min_confidence: Minimum confidence threshold (0.0-1.0)
            
        Returns:
            Dictionary with trading signals for all symbols
        """
        # Get batch predictions
        batch_results = self.get_batch_predictions(symbols, model_type)
        
        signals = {
            'success': batch_results['success'],
            'timestamp': datetime.now().isoformat(),
            'signals': []
        }
        
        if not batch_results['success']:
            signals['error'] = batch_results.get('error', 'Unknown error')
            return signals
        
        # Process each prediction into a trading signal
        for prediction in batch_results['predictions']:
            symbol = prediction.get('symbol', 'UNKNOWN')
            signal = prediction.get('predicted_label', 'HOLD')
            confidence = prediction.get('confidence', 0.0)
            price = prediction.get('current_price')
            
            # Apply confidence threshold
            if confidence < min_confidence and signal != 'HOLD':
                logger.info(f"Signal {signal} for {symbol} has confidence {confidence:.2f} below threshold {min_confidence}, defaulting to HOLD")
                signal = 'HOLD'
            
            signals['signals'].append({
                'symbol': symbol,
                'signal': signal,
                'confidence': confidence,
                'price': price
            })
        
        return signals


# Create a singleton instance
_trading_ml = None

def get_trading_ml() -> TradingML:
    """
    Get or create the TradingML singleton instance
    
    Returns:
        The TradingML instance
    """
    global _trading_ml
    if _trading_ml is None:
        _trading_ml = TradingML()
    return _trading_ml


# Simple function interfaces for direct use

def get_prediction(symbol: str, model_type: str = 'balanced') -> Dict[str, Any]:
    """
    Get a prediction for a symbol
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        model_type: Model type ('balanced' or 'standard')
        
    Returns:
        Prediction result
    """
    ml = get_trading_ml()
    return ml.get_prediction(symbol, model_type)

def get_trading_signal(symbol: str, model_type: str = 'balanced', min_confidence: float = 0.6) -> Dict[str, Any]:
    """
    Get a simplified trading signal for a symbol
    
    Args:
        symbol: Trading pair (e.g., BTCUSDT)
        model_type: Model type ('balanced' or 'standard')
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Trading signal
    """
    ml = get_trading_ml()
    return ml.get_trading_signal(symbol, model_type, min_confidence)

def get_batch_trading_signals(symbols: List[str], model_type: str = 'balanced', min_confidence: float = 0.6) -> Dict[str, Any]:
    """
    Get simplified trading signals for multiple symbols
    
    Args:
        symbols: List of trading pairs
        model_type: Model type ('balanced' or 'standard')
        min_confidence: Minimum confidence threshold (0.0-1.0)
        
    Returns:
        Dictionary with trading signals for all symbols
    """
    ml = get_trading_ml()
    return ml.get_batch_trading_signals(symbols, model_type, min_confidence)


# Simple test function
if __name__ == "__main__":
    # Test the trading ML interface
    print("\n=== Testing Trading ML Interface ===\n")
    
    # Test single prediction
    print("Testing single prediction for BTCUSDT...")
    result = get_prediction("BTCUSDT", "balanced")
    print(json.dumps(result, indent=2))
    
    # Test trading signal
    print("\nTesting trading signal for BTCUSDT...")
    signal = get_trading_signal("BTCUSDT", "balanced", 0.7)
    print(json.dumps(signal, indent=2))
    
    # Test batch trading signals
    print("\nTesting batch trading signals for BTCUSDT, ETHUSDT, BNBUSDT...")
    signals = get_batch_trading_signals(["BTCUSDT", "ETHUSDT", "BNBUSDT"], "balanced", 0.7)
    print(json.dumps(signals, indent=2))