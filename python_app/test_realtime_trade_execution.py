#!/usr/bin/env python3
"""
Test Realtime Trade Execution

This script tests the realtime trade execution system that:
1. Gets trading signals from the ML prediction engine
2. Executes trades based on these signals using the Binance SDK directly
3. Logs all activity for monitoring and analysis
4. Supports paper trading mode for safe testing

Usage:
  python test_realtime_trade_execution.py [--paper] [--real] [--symbol SYMBOL]

Options:
  --paper      Use paper trading mode (default)
  --real       Use real trading mode (requires API keys)
  --symbol     Symbol to test (default: BTCUSDT)
"""

import os
import sys
import json
import time
import argparse
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('test_realtime_execution')

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Parse command line arguments
parser = argparse.ArgumentParser(description="Test realtime trade execution")
parser.add_argument("--paper", action="store_true", help="Use paper trading mode (default)")
parser.add_argument("--real", action="store_true", help="Use real trading mode")
parser.add_argument("--symbol", default="BTCUSDT", help="Symbol to test (default: BTCUSDT)")
args = parser.parse_args()

# Determine trading mode
paper_mode = not args.real or args.paper
if args.real:
    paper_mode = False

# Import the ML Binance Executor
try:
    from ml_binance_executor import get_ml_binance_executor
except ImportError as e:
    logger.error(f"Failed to import ML Binance Executor: {e}")
    sys.exit(1)

# Import the ML Trading Bridge
try:
    from ml_trading_bridge import get_ml_trading_bridge
except ImportError as e:
    logger.error(f"Failed to import ML Trading Bridge: {e}")
    sys.exit(1)

def test_ml_signal_retrieval(symbol: str) -> Dict[str, Any]:
    """
    Test retrieving ML signals for a symbol
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        
    Returns:
        ML signal data
    """
    logger.info(f"Testing ML signal retrieval for {symbol}...")
    
    # Get ML trading bridge
    bridge = get_ml_trading_bridge()
    
    # Get signal with force refresh
    signal = bridge.get_signal(symbol, force_refresh=True)
    
    if signal.get('success', False):
        logger.info(f"ML Signal for {symbol}: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
        logger.info(f"Current price: {signal.get('price')}")
    else:
        logger.error(f"Failed to get ML signal for {symbol}: {signal.get('error', 'Unknown error')}")
    
    return signal

def test_position_check(symbol: str) -> None:
    """
    Test checking if an open position exists for a symbol
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
    """
    logger.info(f"Testing position check for {symbol}...")
    
    # Get ML Binance Executor
    executor = get_ml_binance_executor(paper_mode=paper_mode)
    
    # Check if position exists via trading service
    has_buy_position = executor.trading_service.has_open_position(symbol, "BUY")
    has_sell_position = executor.trading_service.has_open_position(symbol, "SELL")
    
    logger.info(f"Open BUY position for {symbol}: {has_buy_position}")
    logger.info(f"Open SELL position for {symbol}: {has_sell_position}")

def test_signal_execution(symbol: str) -> Dict[str, Any]:
    """
    Test executing a trade based on ML signal
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
        
    Returns:
        Execution result
    """
    logger.info(f"Testing signal execution for {symbol} in {'PAPER' if paper_mode else 'REAL'} mode...")
    
    # Get ML Binance Executor
    executor = get_ml_binance_executor(paper_mode=paper_mode)
    
    # Execute signal
    execution_result = executor.execute_signal(
        symbol=symbol,
        force_refresh=True
    )
    
    if execution_result.get('success', False) and execution_result.get('executed', False):
        logger.info(f"Signal executed successfully for {symbol}")
        logger.info(f"Order ID: {execution_result.get('order_id')}")
    else:
        reason = execution_result.get('message', 'Unknown reason')
        if 'signal not actionable' in reason.lower() or 'position already exists' in reason.lower():
            logger.info(f"Signal not executed for {symbol}: {reason}")
        else:
            logger.warning(f"Failed to execute signal for {symbol}: {reason}")
    
    return execution_result

def test_recommended_trades() -> Dict[str, Any]:
    """
    Test executing recommended trades
    
    Returns:
        Execution results
    """
    logger.info(f"Testing recommended trades execution in {'PAPER' if paper_mode else 'REAL'} mode...")
    
    # Get ML Binance Executor
    executor = get_ml_binance_executor(paper_mode=paper_mode)
    
    # Symbols to consider
    symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT", 
               "XRPUSDT", "DOGEUSDT", "MATICUSDT", "DOTUSDT", "AVAXUSDT"]
    
    # Execute recommended trades
    results = executor.execute_recommended_trades(
        symbols=symbols,
        max_trades=3  # Limit to 3 trades max
    )
    
    # Print summary
    summary = results.get('execution_summary', {})
    logger.info(f"Recommended trades summary:")
    logger.info(f"- Long recommendations: {summary.get('long_recommendations', 0)}")
    logger.info(f"- Short recommendations: {summary.get('short_recommendations', 0)}")
    logger.info(f"- Long positions executed: {summary.get('long_executed', 0)}")
    logger.info(f"- Short positions executed: {summary.get('short_executed', 0)}")
    logger.info(f"- Total positions executed: {summary.get('total_executed', 0)}")
    
    return results

def run_complete_test(symbol: str) -> None:
    """
    Run a complete test of the realtime trade execution system
    
    Args:
        symbol: Trading pair symbol (e.g., BTCUSDT)
    """
    logger.info("=" * 50)
    logger.info(f"REALTIME TRADE EXECUTION TEST - {'PAPER' if paper_mode else 'REAL'} MODE")
    logger.info("=" * 50)
    
    # Step 1: Test ML signal retrieval
    logger.info("\n--- Step 1: Testing ML Signal Retrieval ---")
    signal = test_ml_signal_retrieval(symbol)
    
    if not signal.get('success', False):
        logger.error("ML signal retrieval failed - aborting test")
        return
    
    # Step 2: Test position check
    logger.info("\n--- Step 2: Testing Position Check ---")
    test_position_check(symbol)
    
    # Step 3: Test signal execution
    logger.info("\n--- Step 3: Testing Signal Execution ---")
    execution_result = test_signal_execution(symbol)
    
    # Step 4: Test recommended trades
    logger.info("\n--- Step 4: Testing Recommended Trades ---")
    recommended_results = test_recommended_trades()
    
    # Print overall test summary
    logger.info("\n" + "=" * 50)
    logger.info("TEST SUMMARY")
    logger.info("=" * 50)
    
    logger.info(f"ML Signal for {symbol}: {signal.get('signal')} with {signal.get('confidence', 0):.2f} confidence")
    
    if execution_result.get('executed', False):
        logger.info(f"Trade executed for {symbol}: {execution_result.get('message', 'No details')}")
    else:
        logger.info(f"Trade not executed for {symbol}: {execution_result.get('message', 'No reason provided')}")
    
    summary = recommended_results.get('execution_summary', {})
    logger.info(f"Recommended trades executed: {summary.get('total_executed', 0)} out of {summary.get('long_recommendations', 0) + summary.get('short_recommendations', 0)} recommendations")
    
    logger.info("\nTest completed!")

if __name__ == "__main__":
    symbol = args.symbol.upper().replace('-', '')
    run_complete_test(symbol)