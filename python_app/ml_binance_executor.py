#!/usr/bin/env python3
"""
ML Binance Executor

This module connects the ML Trading Bridge with the Binance Trading Service
to execute trades based on ML predictions directly using the Binance SDK.

It handles:
1. Getting ML signals from the trading bridge
2. Checking positions before executing trades
3. Executing trades via the Binance SDK (no REST API or Flask endpoints)
4. Logging all activities for monitoring and analysis
5. Supporting both real trading and paper trading modes
"""

import os
import sys
import json
import time
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Union, Tuple

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'ml_binance_executor.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ml_binance_executor')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import ML trading bridge
from ml_trading_bridge import get_ml_trading_bridge

# Import Binance trading service
try:
    from services.binance.trading_service import get_binance_trading_service
except ImportError:
    try:
        from python_app.services.binance.trading_service import get_binance_trading_service
    except ImportError:
        logger.error("Could not import Binance trading service - trading functions unavailable")
        get_binance_trading_service = None

# Import ML trade logger
try:
    from utils.ml_trade_logger import (
        log_trade_execution, log_position_update, log_error
    )
except ImportError:
    try:
        from python_app.utils.ml_trade_logger import (
            log_trade_execution, log_position_update, log_error
        )
    except ImportError:
        logger.warning("Could not import ML trade logger - using default logging")
        
        # Create stub functions if import fails
        def log_trade_execution(symbol, action, quantity, price, position_id, trade_id=None, ml_confidence=None):
            logger.info(f"TRADE: {action} {quantity} {symbol} @ {price} (position: {position_id})")
            
        def log_position_update(symbol, position_id, entry_price, current_price, quantity, direction, unrealized_pnl, unrealized_pnl_pct):
            logger.info(f"POSITION UPDATE: {direction} {quantity} {symbol} (entry: {entry_price}, current: {current_price}, PnL: {unrealized_pnl})")
            
        def log_error(symbol, operation, error_message, context=None):
            logger.error(f"ERROR: {symbol} {operation} - {error_message}")


class MLBinanceExecutor:
    """
    Executor that connects ML predictions with Binance trading
    
    This class handles the complete flow from ML prediction to trade execution
    using the Binance SDK directly, without any REST API or Flask endpoints.
    """
    
    def __init__(self, 
                 paper_mode: bool = True,
                 use_testnet: bool = False,
                 confidence_threshold: float = 0.7,
                 default_quantity: Dict[str, float] = None):
        """
        Initialize the ML Binance Executor
        
        Args:
            paper_mode: Whether to use paper trading mode (default: True)
            use_testnet: Whether to use the Binance testnet (default: False)
            confidence_threshold: Minimum confidence for trading signals
            default_quantity: Default quantities to trade for each symbol
        """
        self.paper_mode = paper_mode
        self.use_testnet = use_testnet
        self.confidence_threshold = confidence_threshold
        self.default_quantity = default_quantity or {
            "BTCUSDT": 0.001,  # 0.001 BTC (approx. $70 @ $70,000)
            "ETHUSDT": 0.01,   # 0.01 ETH (approx. $19 @ $1,900)
            "BNBUSDT": 0.1,    # 0.1 BNB (approx. $50 @ $500)
            "DEFAULT": 10.0     # Default for other symbols
        }
        
        # Create instances of required services
        self.ml_bridge = get_ml_trading_bridge()
        self.trading_service = get_binance_trading_service(
            use_testnet=self.use_testnet,
            paper_mode=self.paper_mode
        )
        
        mode_str = "PAPER" if self.paper_mode else "REAL"
        network_str = "TESTNET" if self.use_testnet else "PRODUCTION"
        logger.info(f"ML Binance Executor initialized with {mode_str} trading on {network_str}")
        logger.info(f"Confidence threshold: {self.confidence_threshold}")
        logger.info(f"Default quantities: {json.dumps(self.default_quantity)}")
    
    def execute_signal(self, 
                      symbol: str, 
                      position_id: Optional[int] = None,
                      quantity: Optional[float] = None,
                      model_type: Optional[str] = None,
                      force_refresh: bool = True) -> Dict[str, Any]:
        """
        Get an ML signal and execute it if actionable
        
        Args:
            symbol: Trading pair symbol (e.g., BTCUSDT)
            position_id: Position ID for tracking
            quantity: Order quantity (will use default if not provided)
            model_type: ML model type to use
            force_refresh: Whether to force refresh the ML signal
            
        Returns:
            Execution result
        """
        # Format symbol
        symbol = symbol.upper().replace('-', '')
        
        # Generate position ID if not provided
        if position_id is None:
            position_id = int(time.time() * 1000)
        
        # Get ML signal
        signal = self.ml_bridge.get_signal(symbol, model_type, force_refresh=force_refresh)
        
        # Log the received signal
        logger.info(f"ML Signal for {symbol}: {signal.get('signal', 'Unknown')} with confidence {signal.get('confidence', 0):.2f}")
        
        # Skip if signal is not valid or confidence is too low
        if not signal.get('success', False):
            error_msg = signal.get('error', 'Unknown error')
            logger.warning(f"Invalid ML signal for {symbol}: {error_msg}")
            return {
                "success": False,
                "message": f"Invalid ML signal: {error_msg}",
                "executed": False
            }
        
        # Skip if signal is HOLD or confidence is below threshold
        if signal['signal'] == 'HOLD' or signal['confidence'] < self.confidence_threshold:
            logger.info(f"Skipping execution for {symbol} - Signal: {signal['signal']}, Confidence: {signal['confidence']:.2f}")
            return {
                "success": True,
                "message": f"Signal not actionable: {signal['signal']} with {signal['confidence']:.2f} confidence",
                "executed": False,
                "signal": signal
            }
        
        # Determine quantity to trade
        trade_quantity = quantity
        if trade_quantity is None:
            # Use default quantity for the symbol or the generic default
            trade_quantity = self.default_quantity.get(symbol, self.default_quantity.get('DEFAULT', 1.0))
        
        # Execute the trade using Binance SDK via our trading service
        execution_result = self.trading_service.execute_ml_trade(
            symbol=symbol,
            ml_signal=signal,
            position_id=position_id,
            quantity=trade_quantity
        )
        
        # Log the execution result
        if execution_result.get('success', False) and execution_result.get('executed', False):
            logger.info(f"Successfully executed {signal['signal']} for {symbol} - Quantity: {trade_quantity}")
        else:
            logger.warning(f"Failed to execute {signal['signal']} for {symbol}: {execution_result.get('message', 'Unknown error')}")
        
        # Add signal information to result
        execution_result['signal'] = signal
        
        return execution_result
    
    def batch_execute_signals(self, 
                             symbols: List[str],
                             model_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Execute ML signals for multiple symbols
        
        Args:
            symbols: List of trading pair symbols
            model_type: ML model type to use
            
        Returns:
            Dictionary with results for each symbol
        """
        # Format symbols
        formatted_symbols = [s.upper().replace('-', '') for s in symbols]
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "executions": {}
        }
        
        # Process each symbol
        for symbol in formatted_symbols:
            try:
                # Execute signal for this symbol
                execution_result = self.execute_signal(
                    symbol=symbol,
                    model_type=model_type
                )
                
                # Store result
                results["executions"][symbol] = execution_result
                
            except Exception as e:
                # Log error and continue with other symbols
                error_msg = f"Error executing signal for {symbol}: {e}"
                logger.error(error_msg)
                
                # Log the error
                try:
                    log_error(
                        symbol=symbol,
                        operation="execute_signal",
                        error_message=str(e)
                    )
                except Exception:
                    pass  # Ignore logging errors
                
                # Store error in results
                results["executions"][symbol] = {
                    "success": False,
                    "message": error_msg,
                    "executed": False
                }
        
        # Set overall success flag based on individual executions
        results["success"] = any(r.get("executed", False) for r in results["executions"].values())
        results["execution_count"] = sum(1 for r in results["executions"].values() if r.get("executed", False))
        
        logger.info(f"Batch execution completed - {results['execution_count']} trades executed out of {len(formatted_symbols)} symbols")
        
        return results
    
    def execute_recommended_trades(self, 
                                  symbols: List[str], 
                                  max_trades: int = 3,
                                  model_type: Optional[str] = None) -> Dict[str, Any]:
        """
        Get recommended trades and execute them
        
        Args:
            symbols: List of symbols to consider
            max_trades: Maximum number of trades to execute
            model_type: ML model type to use
            
        Returns:
            Dictionary with execution results
        """
        # Get recommended pairs from ML bridge
        recommendations = self.ml_bridge.get_recommended_pairs(
            symbols, 
            max_pairs=max_trades,
            min_confidence=self.confidence_threshold,
            model_type=model_type
        )
        
        # Skip if no recommendations
        if not recommendations.get('success', False):
            error_msg = recommendations.get('error', 'Unknown error')
            logger.warning(f"Failed to get recommendations: {error_msg}")
            return {
                "success": False,
                "message": f"Failed to get recommendations: {error_msg}",
                "executed": False
            }
        
        results = {
            "timestamp": datetime.now().isoformat(),
            "success": True,
            "long_executions": [],
            "short_executions": []
        }
        
        # Process LONG recommendations
        for signal in recommendations.get('long', []):
            symbol = signal.get('symbol')
            confidence = signal.get('confidence', 0)
            
            logger.info(f"Processing LONG recommendation for {symbol} with {confidence:.2f} confidence")
            
            try:
                # Check if we should open position
                should_open, signal_info = self.ml_bridge.should_open_position(symbol, "LONG")
                
                if should_open:
                    # Execute the trade
                    execution_result = self.trading_service.execute_ml_trade(
                        symbol=symbol,
                        ml_signal=signal_info,
                        quantity=self.default_quantity.get(symbol, self.default_quantity.get('DEFAULT', 1.0))
                    )
                    
                    # Add to results
                    results["long_executions"].append({
                        "symbol": symbol,
                        "confidence": confidence,
                        "executed": execution_result.get('executed', False),
                        "result": execution_result
                    })
                    
                    logger.info(f"LONG position opened for {symbol}: {execution_result.get('success', False)}")
                else:
                    logger.info(f"Conditions not met for opening LONG position for {symbol}")
                    
                    # Add to results as skipped
                    results["long_executions"].append({
                        "symbol": symbol,
                        "confidence": confidence,
                        "executed": False,
                        "result": {
                            "success": True,
                            "message": "Conditions not met for opening position",
                            "executed": False
                        }
                    })
                
            except Exception as e:
                # Log error and continue
                error_msg = f"Error processing LONG recommendation for {symbol}: {e}"
                logger.error(error_msg)
                
                # Add to results with error
                results["long_executions"].append({
                    "symbol": symbol,
                    "confidence": confidence,
                    "executed": False,
                    "result": {
                        "success": False,
                        "message": error_msg,
                        "executed": False
                    }
                })
        
        # Process SHORT recommendations
        for signal in recommendations.get('short', []):
            symbol = signal.get('symbol')
            confidence = signal.get('confidence', 0)
            
            logger.info(f"Processing SHORT recommendation for {symbol} with {confidence:.2f} confidence")
            
            try:
                # Check if we should open position
                should_open, signal_info = self.ml_bridge.should_open_position(symbol, "SHORT")
                
                if should_open:
                    # Execute the trade
                    execution_result = self.trading_service.execute_ml_trade(
                        symbol=symbol,
                        ml_signal=signal_info,
                        quantity=self.default_quantity.get(symbol, self.default_quantity.get('DEFAULT', 1.0))
                    )
                    
                    # Add to results
                    results["short_executions"].append({
                        "symbol": symbol,
                        "confidence": confidence,
                        "executed": execution_result.get('executed', False),
                        "result": execution_result
                    })
                    
                    logger.info(f"SHORT position opened for {symbol}: {execution_result.get('success', False)}")
                else:
                    logger.info(f"Conditions not met for opening SHORT position for {symbol}")
                    
                    # Add to results as skipped
                    results["short_executions"].append({
                        "symbol": symbol,
                        "confidence": confidence,
                        "executed": False,
                        "result": {
                            "success": True,
                            "message": "Conditions not met for opening position",
                            "executed": False
                        }
                    })
                
            except Exception as e:
                # Log error and continue
                error_msg = f"Error processing SHORT recommendation for {symbol}: {e}"
                logger.error(error_msg)
                
                # Add to results with error
                results["short_executions"].append({
                    "symbol": symbol,
                    "confidence": confidence,
                    "executed": False,
                    "result": {
                        "success": False,
                        "message": error_msg,
                        "executed": False
                    }
                })
        
        # Compute execution counts
        long_executed = sum(1 for r in results["long_executions"] if r.get("executed", False))
        short_executed = sum(1 for r in results["short_executions"] if r.get("executed", False))
        
        results["execution_summary"] = {
            "long_recommendations": len(recommendations.get('long', [])),
            "short_recommendations": len(recommendations.get('short', [])),
            "long_executed": long_executed,
            "short_executed": short_executed,
            "total_executed": long_executed + short_executed
        }
        
        logger.info(f"Recommended trade execution completed - {results['execution_summary']['total_executed']} trades executed")
        
        return results


# Create a singleton instance
_ml_binance_executor = None

def get_ml_binance_executor(paper_mode: bool = True, use_testnet: bool = False) -> MLBinanceExecutor:
    """
    Get or create the MLBinanceExecutor singleton instance
    
    Args:
        paper_mode: Whether to use paper trading mode
        use_testnet: Whether to use the Binance testnet
        
    Returns:
        The MLBinanceExecutor instance
    """
    global _ml_binance_executor
    if _ml_binance_executor is None:
        _ml_binance_executor = MLBinanceExecutor(
            paper_mode=paper_mode,
            use_testnet=use_testnet
        )
    return _ml_binance_executor


# Simple test function
if __name__ == "__main__":
    print("\n=== Testing ML Binance Executor ===\n")
    
    # Create executor with paper trading
    executor = get_ml_binance_executor(paper_mode=True)
    
    # Test a single trade execution
    print("Testing signal execution for BTCUSDT...")
    result = executor.execute_signal("BTCUSDT")
    print(f"Execution result: {json.dumps(result, indent=2)}")
    
    # Test batch execution
    print("\nTesting batch execution for multiple symbols...")
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
    batch_result = executor.batch_execute_signals(symbols)
    print(f"Batch execution summary: {batch_result['execution_count']} trades executed")
    
    # Test recommended trades
    print("\nTesting execution of recommended trades...")
    recommended_result = executor.execute_recommended_trades(symbols, max_trades=2)
    summary = recommended_result.get('execution_summary', {})
    print(f"Recommended trades summary: {summary.get('total_executed', 0)} trades executed")
    
    print("\nTest completed!")