#!/usr/bin/env python3
"""
Main Module for the ML Trading System

This module serves as the main entry point for the ML Trading System,
which provides direct trading capabilities using the Binance SDK based
on ML predictions.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(os.path.join('logs', 'ml_trading_system.log')),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('ml_trading_system')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import core components
try:
    # Import configuration
    from config import active_config
    
    # Import ML trading bridge
    from ml_trading_bridge import get_ml_trading_bridge
    
    # Import Binance executor
    from ml_binance_executor import get_ml_binance_executor
    
    # Import utility modules
    from utils.ml_trade_logger import (
        log_trade_execution, log_position_update, log_position_close, log_error,
        get_recent_trades, get_recent_position_closes, generate_trade_summary
    )
    
    # Import Binance services
    from services.binance.market_service import binance_market_service
    from services.binance.trading_service import binance_trading_service
    
    logger.info("Successfully imported all components")
    components_loaded = True
    
except ImportError as e:
    logger.error(f"Failed to import one or more components: {e}")
    components_loaded = False


def test_market_data(symbol: str = "BTCUSDT") -> Dict[str, Any]:
    """
    Test retrieving market data from Binance
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        
    Returns:
        Market data
    """
    logger.info(f"Testing market data retrieval for {symbol}...")
    
    try:
        # Get current price
        price_data = binance_market_service.get_symbol_price(symbol)
        
        # Get 24hr ticker
        ticker_data = binance_market_service.get_24hr_ticker(symbol)
        
        # Create result
        result = {
            'success': True,
            'symbol': symbol,
            'price': price_data.get('price', 'N/A'),
            'ticker': ticker_data
        }
        
        logger.info(f"Current price for {symbol}: {result['price']}")
        return result
        
    except Exception as e:
        error_msg = f"Error retrieving market data: {e}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'symbol': symbol
        }


def test_ml_signal(symbol: str = "BTCUSDT") -> Dict[str, Any]:
    """
    Test getting ML trading signal
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        
    Returns:
        ML signal data
    """
    logger.info(f"Testing ML signal retrieval for {symbol}...")
    
    try:
        # Get ML trading bridge
        ml_bridge = get_ml_trading_bridge()
        
        # Get signal with force refresh
        signal = ml_bridge.get_signal(symbol, force_refresh=True)
        
        if signal.get('success', False):
            logger.info(f"ML Signal for {symbol}: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
        else:
            logger.warning(f"Failed to get ML signal for {symbol}: {signal.get('error', 'Unknown error')}")
        
        return signal
        
    except Exception as e:
        error_msg = f"Error retrieving ML signal: {e}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'symbol': symbol
        }


def test_trade_execution(symbol: str = "BTCUSDT", paper_mode: bool = True) -> Dict[str, Any]:
    """
    Test executing a trade using the Binance SDK
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        paper_mode: Whether to use paper trading mode
        
    Returns:
        Trade execution result
    """
    logger.info(f"Testing trade execution for {symbol} in {'PAPER' if paper_mode else 'REAL'} mode...")
    
    try:
        # Get ML Binance Executor
        executor = get_ml_binance_executor(paper_mode=paper_mode)
        
        # Execute signal
        execution_result = executor.execute_signal(
            symbol=symbol,
            force_refresh=True
        )
        
        if execution_result.get('success', False) and execution_result.get('executed', False):
            logger.info(f"Trade executed successfully for {symbol}")
        else:
            logger.info(f"Trade not executed for {symbol}: {execution_result.get('message', 'No reason provided')}")
        
        return execution_result
        
    except Exception as e:
        error_msg = f"Error executing trade: {e}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg,
            'symbol': symbol
        }


def test_batch_signals(symbols: List[str] = None) -> Dict[str, Any]:
    """
    Test getting batch signals for multiple symbols
    
    Args:
        symbols: List of trading pair symbols
        
    Returns:
        Batch signals result
    """
    # Default symbols if none provided
    if symbols is None:
        symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
    
    logger.info(f"Testing batch signals for {len(symbols)} symbols...")
    
    try:
        # Get ML trading bridge
        ml_bridge = get_ml_trading_bridge()
        
        # Get batch signals
        batch_result = ml_bridge.get_signals_batch(symbols, force_refresh=True)
        
        # Log summary
        success_count = sum(1 for s in batch_result.get('signals', {}).values() if s.get('success', False))
        logger.info(f"Successfully retrieved {success_count}/{len(symbols)} signals")
        
        return batch_result
        
    except Exception as e:
        error_msg = f"Error retrieving batch signals: {e}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg
        }


def test_recommended_trades(symbols: List[str] = None, max_trades: int = 3) -> Dict[str, Any]:
    """
    Test getting and executing recommended trades
    
    Args:
        symbols: List of trading pair symbols
        max_trades: Maximum number of trades to recommend
        
    Returns:
        Recommended trades result
    """
    # Default symbols if none provided
    if symbols is None:
        symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT", 
                   "ADAUSDT", "DOGEUSDT", "MATICUSDT", "DOTUSDT", "AVAXUSDT"]
    
    logger.info(f"Testing recommended trades from {len(symbols)} symbols...")
    
    try:
        # Get ML Binance Executor
        executor = get_ml_binance_executor(paper_mode=True)
        
        # Get and execute recommended trades
        result = executor.execute_recommended_trades(
            symbols=symbols,
            max_trades=max_trades
        )
        
        # Log summary
        summary = result.get('execution_summary', {})
        logger.info(f"Recommended trades summary:")
        logger.info(f"- Long recommendations: {summary.get('long_recommendations', 0)}")
        logger.info(f"- Short recommendations: {summary.get('short_recommendations', 0)}")
        logger.info(f"- Executed: {summary.get('total_executed', 0)} trades")
        
        return result
        
    except Exception as e:
        error_msg = f"Error executing recommended trades: {e}"
        logger.error(error_msg)
        
        return {
            'success': False,
            'error': error_msg
        }


def run_system_demo():
    """Run a demonstration of the ML Trading System"""
    print("\n" + "="*60)
    print("ML TRADING SYSTEM DEMO")
    print("="*60)
    
    if not components_loaded:
        print("\nFailed to load one or more components. Check the logs for details.")
        return
    
    # Start with configuration
    print("\n1. System Configuration")
    print("-" * 40)
    print(f"Trading mode: {'Paper Trading' if not active_config.BINANCE_API_KEY else 'Live Trading'}")
    print(f"Proxy enabled: {active_config.USE_PROXY}")
    print(f"ML confidence threshold: {active_config.CONFIDENCE_THRESHOLD}")
    
    # Test market data
    print("\n2. Market Data")
    print("-" * 40)
    market_data = test_market_data("BTCUSDT")
    if market_data.get('success', False):
        print(f"BTCUSDT current price: {market_data.get('price')}")
    else:
        print(f"Failed to retrieve market data: {market_data.get('error', 'Unknown error')}")
    
    # Test ML signal
    print("\n3. ML Signal")
    print("-" * 40)
    ml_signal = test_ml_signal("BTCUSDT")
    if ml_signal.get('success', False):
        print(f"ML Signal for BTCUSDT: {ml_signal.get('signal')} with {ml_signal.get('confidence', 0):.2f} confidence")
        print(f"Current price: {ml_signal.get('price')}")
    else:
        print(f"Failed to retrieve ML signal: {ml_signal.get('error', 'Unknown error')}")
    
    # Test trade execution
    print("\n4. Trade Execution")
    print("-" * 40)
    execution_result = test_trade_execution("BTCUSDT", paper_mode=True)
    if execution_result.get('success', False):
        if execution_result.get('executed', False):
            print(f"Trade executed successfully for BTCUSDT")
            print(f"Details: {execution_result.get('message', 'No details')}")
        else:
            print(f"Trade not executed for BTCUSDT: {execution_result.get('message', 'No reason provided')}")
    else:
        print(f"Failed to execute trade: {execution_result.get('error', 'Unknown error')}")
    
    # Test batch signals
    print("\n5. Batch Signals")
    print("-" * 40)
    test_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT"]
    batch_result = test_batch_signals(test_symbols)
    if batch_result.get('success', False) is not False:  # Check if not explicitly False
        signals = batch_result.get('signals', {})
        for symbol, signal in signals.items():
            if signal.get('success', False):
                print(f"{symbol}: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
            else:
                print(f"{symbol}: Failed - {signal.get('error', 'Unknown error')}")
    else:
        print(f"Failed to retrieve batch signals: {batch_result.get('error', 'Unknown error')}")
    
    # Test recommended trades
    print("\n6. Recommended Trades")
    print("-" * 40)
    recommended_result = test_recommended_trades()
    if recommended_result.get('success', False) and 'execution_summary' in recommended_result:
        summary = recommended_result.get('execution_summary', {})
        print(f"Recommended trades summary:")
        print(f"- Long recommendations: {summary.get('long_recommendations', 0)}")
        print(f"- Short recommendations: {summary.get('short_recommendations', 0)}")
        print(f"- Executed: {summary.get('total_executed', 0)} trades")
        
        # Show some details of executed trades
        if summary.get('total_executed', 0) > 0:
            print("\nExecuted trades:")
            for trade in recommended_result.get('long_executions', []):
                if trade.get('executed', False):
                    print(f"- LONG {trade['symbol']} with {trade['confidence']:.2f} confidence")
            
            for trade in recommended_result.get('short_executions', []):
                if trade.get('executed', False):
                    print(f"- SHORT {trade['symbol']} with {trade['confidence']:.2f} confidence")
    else:
        print(f"Failed to execute recommended trades: {recommended_result.get('error', 'Unknown error')}")
    
    # Show trading activity summary
    print("\n7. Trading Activity Summary")
    print("-" * 40)
    summary = generate_trade_summary()
    if summary['total_trades'] > 0:
        print(f"Total trades: {summary['total_trades']}")
        print(f"Closed positions: {summary['total_positions_closed']}")
        print(f"Total trading volume: ${summary['total_volume']:.2f}")
        print(f"Total realized P&L: ${summary['total_realized_pnl']:.2f}")
        print(f"Win rate: {summary['win_rate']:.2f}%")
        print(f"Average holding period: {summary['avg_holding_period_hours']:.2f} hours")
    else:
        print("No trading activity recorded yet")
    
    print("\n" + "="*60)
    print("DEMO COMPLETED")
    print("="*60 + "\n")


if __name__ == "__main__":
    # Run the demo
    run_system_demo()