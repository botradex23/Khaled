#!/usr/bin/env python3
"""
Test ML Paper Trading Integration

This script tests the integration between the ML prediction system and paper trading.
It performs a series of tests to validate:
1. Connection to the Binance API for real-time data
2. ML prediction functionality
3. Paper trading execution
4. Logging and monitoring
5. Performance analysis
"""

import os
import sys
import json
import time
import logging
from datetime import datetime, timedelta
import argparse
from typing import Dict, List, Any, Optional

# Configure basic logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('ml_paper_trading_test')

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import necessary modules
try:
    from ml_paper_trading_integration import get_ml_paper_trading
    from ml_trading_bridge import get_ml_trading_bridge
    from utils.ml_trade_logger import (
        get_ml_trade_logger, log_trade_execution, log_position_update, 
        log_position_close, log_error, get_trading_logs
    )
except ImportError as e:
    logger.error(f"Failed to import required modules: {e}")
    print(f"\nError: {e}")
    print("Please make sure all required modules are available.")
    sys.exit(1)


def test_binance_connection() -> Dict[str, Any]:
    """
    Test connection to Binance API
    
    Returns:
        Test results
    """
    logger.info("Testing Binance API connection...")
    
    try:
        # Get the ML paper trading instance
        ml_paper = get_ml_paper_trading()
        
        # Test getting price for a popular symbol
        btc_price = ml_paper._get_symbol_price("BTCUSDT")
        eth_price = ml_paper._get_symbol_price("ETHUSDT")
        
        success = btc_price is not None and eth_price is not None
        
        result = {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "prices": {
                "BTCUSDT": btc_price,
                "ETHUSDT": eth_price
            }
        }
        
        logger.info(f"Binance API connection test {'passed' if success else 'failed'}")
        return result
    
    except Exception as e:
        logger.error(f"Binance API connection test failed: {e}")
        return {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


def test_ml_prediction() -> Dict[str, Any]:
    """
    Test ML prediction functionality
    
    Returns:
        Test results with predictions
    """
    logger.info("Testing ML prediction...")
    
    try:
        # Get the ML trading bridge
        bridge = get_ml_trading_bridge()
        
        # Test symbols
        test_symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT"]
        
        # Get batch predictions
        predictions = {}
        for symbol in test_symbols:
            signal = bridge.get_signal(symbol)
            predictions[symbol] = signal
        
        success = all(p.get('success', False) for p in predictions.values())
        
        result = {
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "predictions": predictions
        }
        
        logger.info(f"ML prediction test {'passed' if success else 'failed'}")
        return result
    
    except Exception as e:
        logger.error(f"ML prediction test failed: {e}")
        return {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


def test_paper_trading() -> Dict[str, Any]:
    """
    Test paper trading operations
    
    Returns:
        Test results
    """
    logger.info("Testing paper trading operations...")
    
    try:
        # Get the ML paper trading instance
        ml_paper = get_ml_paper_trading()
        
        # Initialize paper trading
        init_result = ml_paper.initialize_paper_trading()
        
        if not init_result:
            logger.error("Failed to initialize paper trading")
            return {
                "success": False,
                "timestamp": datetime.now().isoformat(),
                "error": "Failed to initialize paper trading"
            }
        
        # Get account balance
        account = ml_paper.get_account_balance()
        
        if not account:
            logger.error("Failed to get account balance")
            return {
                "success": False,
                "timestamp": datetime.now().isoformat(),
                "error": "Failed to get account balance"
            }
        
        # Execute a test trade
        trade_result = ml_paper.execute_trade("BTCUSDT", "BUY", 0.85)
        
        # Get open positions
        positions = ml_paper.get_open_positions()
        
        result = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "account": account,
            "trade_execution": trade_result,
            "open_positions": positions
        }
        
        logger.info("Paper trading operations test passed")
        return result
    
    except Exception as e:
        logger.error(f"Paper trading operations test failed: {e}")
        return {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


def test_logging() -> Dict[str, Any]:
    """
    Test trading logs
    
    Returns:
        Test results
    """
    logger.info("Testing trading logs...")
    
    try:
        # Create test logs
        # Example ML prediction
        test_symbol = "BTCUSDT"
        test_price = 50000.0
        
        log_trade_execution(
            symbol=test_symbol,
            action="BUY",
            quantity=0.1,
            price=test_price,
            position_id=999,
            trade_id="TEST-123",
            ml_confidence=0.85
        )
        
        log_position_update(
            symbol=test_symbol,
            position_id=999,
            entry_price=test_price,
            current_price=test_price * 1.02,  # 2% increase
            quantity=0.1,
            direction="LONG",
            unrealized_pnl=test_price * 0.1 * 0.02,  # 2% of position value
            unrealized_pnl_pct=2.0
        )
        
        log_position_close(
            symbol=test_symbol,
            position_id=999,
            entry_price=test_price,
            exit_price=test_price * 1.03,  # 3% increase
            quantity=0.1,
            direction="LONG",
            realized_pnl=test_price * 0.1 * 0.03,  # 3% of position value
            realized_pnl_pct=3.0,
            holding_period_hours=1.0,
            close_reason="Test close"
        )
        
        # Get recent logs
        recent_logs = get_trading_logs(10)
        
        result = {
            "success": len(recent_logs) > 0,
            "timestamp": datetime.now().isoformat(),
            "log_count": len(recent_logs),
            "recent_logs": recent_logs[:3]  # Include only a few logs
        }
        
        logger.info(f"Trading logs test {'passed' if result['success'] else 'failed'}")
        return result
    
    except Exception as e:
        logger.error(f"Trading logs test failed: {e}")
        return {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


def run_live_test(duration_minutes: int = 5, check_interval: int = 60) -> Dict[str, Any]:
    """
    Run a live test of the ML paper trading system
    
    Args:
        duration_minutes: Test duration in minutes
        check_interval: Interval between checks in seconds
        
    Returns:
        Test results
    """
    logger.info(f"Running live test for {duration_minutes} minutes...")
    
    try:
        # Get the ML paper trading instance
        ml_paper = get_ml_paper_trading()
        
        # Initialize paper trading
        init_result = ml_paper.initialize_paper_trading()
        
        if not init_result:
            logger.error("Failed to initialize paper trading")
            return {
                "success": False,
                "timestamp": datetime.now().isoformat(),
                "error": "Failed to initialize paper trading"
            }
        
        # Get starting account balance
        start_account = ml_paper.get_account_balance()
        start_balance = float(start_account['currentBalance']) if start_account else 0
        
        # Set up a shorter monitoring interval for the test
        ml_paper.monitoring_interval = check_interval
        
        # Start monitoring in a separate process or thread
        # For simplicity in this test, we'll just run it for the specified duration
        logger.info("Starting automated monitoring...")
        
        # Calculate end time
        end_time = datetime.now() + timedelta(minutes=duration_minutes)
        
        # Run until the test duration expires
        test_updates = []
        
        while datetime.now() < end_time:
            # Check for signals and execute trades
            ml_paper._check_and_execute_signals()
            
            # Update positions with current prices
            ml_paper._update_positions_with_current_prices()
            
            # Check for take profit or stop loss conditions
            ml_paper._check_exit_conditions()
            
            # Get current positions and record state
            positions = ml_paper.get_open_positions()
            trades = ml_paper.get_trading_history()
            
            update = {
                "timestamp": datetime.now().isoformat(),
                "positions_count": len(positions),
                "trades_count": len(trades)
            }
            
            test_updates.append(update)
            logger.info(f"Live test update: {json.dumps(update)}")
            
            # Sleep until next check
            time.sleep(check_interval)
        
        # Get final account balance
        end_account = ml_paper.get_account_balance()
        end_balance = float(end_account['currentBalance']) if end_account else 0
        
        # Generate performance report
        report = ml_paper.generate_performance_report()
        
        result = {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "test_duration_minutes": duration_minutes,
            "starting_balance": start_balance,
            "ending_balance": end_balance,
            "balance_change": end_balance - start_balance,
            "balance_change_percent": ((end_balance - start_balance) / start_balance) * 100 if start_balance > 0 else 0,
            "updates": test_updates,
            "performance_report": report.get('report', {}) if report.get('success', False) else {}
        }
        
        logger.info(f"Live test completed successfully. Balance change: {result['balance_change']:.2f} ({result['balance_change_percent']:.2f}%)")
        return result
    
    except Exception as e:
        logger.error(f"Live test failed: {e}")
        return {
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }


def run_all_tests() -> Dict[str, Any]:
    """
    Run all tests in sequence
    
    Returns:
        Combined test results
    """
    logger.info("Starting all tests...")
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "binance_connection": test_binance_connection(),
        "ml_prediction": test_ml_prediction(),
        "paper_trading": test_paper_trading(),
        "logging": test_logging()
    }
    
    all_passed = all(test.get('success', False) for test in results.values() if isinstance(test, dict))
    
    if all_passed:
        logger.info("All initial tests passed. Running live test for 5 minutes...")
        results["live_test"] = run_live_test(duration_minutes=5, check_interval=60)
        
        logger.info("All tests completed.")
        results["overall_success"] = results["live_test"].get('success', False)
    else:
        logger.warning("Some tests failed. Skipping live test.")
        results["overall_success"] = False
    
    return results


def main():
    # Parse command-line arguments
    parser = argparse.ArgumentParser(description='Test ML Paper Trading Integration')
    parser.add_argument('--test', choices=['all', 'binance', 'ml', 'paper', 'logging', 'live'], 
                        default='all', help='Test type to run')
    parser.add_argument('--duration', type=int, default=5,
                        help='Duration in minutes for live test')
    parser.add_argument('--interval', type=int, default=60,
                        help='Check interval in seconds for live test')
    parser.add_argument('--output', type=str, help='Output file path for test results (JSON)')
    
    args = parser.parse_args()
    
    print("\n=== ML Paper Trading Integration Test ===\n")
    
    # Run selected test
    if args.test == 'all':
        results = run_all_tests()
    elif args.test == 'binance':
        results = test_binance_connection()
    elif args.test == 'ml':
        results = test_ml_prediction()
    elif args.test == 'paper':
        results = test_paper_trading()
    elif args.test == 'logging':
        results = test_logging()
    elif args.test == 'live':
        results = run_live_test(args.duration, args.interval)
    
    # Display summary
    print("\n=== Test Results Summary ===\n")
    
    if args.test == 'all':
        for test_name, test_result in results.items():
            if test_name not in ['timestamp', 'overall_success']:
                success = test_result.get('success', False) if isinstance(test_result, dict) else False
                print(f"{test_name}: {'PASSED' if success else 'FAILED'}")
        
        print(f"\nOverall Result: {'PASSED' if results.get('overall_success', False) else 'FAILED'}")
    else:
        success = results.get('success', False)
        print(f"Test Result: {'PASSED' if success else 'FAILED'}")
        
        if not success and 'error' in results:
            print(f"Error: {results['error']}")
    
    # Save results to file if requested
    if args.output:
        try:
            with open(args.output, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"\nTest results saved to {args.output}")
        except Exception as e:
            print(f"\nError saving test results: {e}")
    
    return 0 if (args.test == 'all' and results.get('overall_success', False)) or \
                (args.test != 'all' and results.get('success', False)) else 1


if __name__ == "__main__":
    sys.exit(main())