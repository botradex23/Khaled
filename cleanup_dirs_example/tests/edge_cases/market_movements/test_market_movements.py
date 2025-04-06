"""
Market Movements Edge Case Tests

This module tests the system's behavior during rapid market movements:
1. Price slippage during order execution
2. Stop-loss/take-profit triggers during volatility
3. Order book depth issues during rapid price moves
4. Price feed lag detection
5. Order rejection due to price movement
"""

import os
import sys
import time
import logging
import unittest
from unittest.mock import patch, MagicMock
from colorama import Fore, Style

# Ensure we can import modules from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Import required modules from the project
try:
    from python_app.services.binance.trading_service import BinanceService
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue
    from python_app.utils.trade_logger import TradeLogger
    from python_app.services.risk_management.risk_service import RiskManagementService
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class BinanceService:
        pass
    
    class TradeExecutionQueue:
        pass
    
    class TradeLogger:
        pass
    
    class RiskManagementService:
        pass

logger = logging.getLogger("market_movements")

class TestPriceSlippage(unittest.TestCase):
    """Tests system behavior during price slippage scenarios"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_slippage_detection(self, mock_get_price, mock_place_order):
        """Test detection of significant price slippage"""
        # Mock price when trade is initiated
        mock_get_price.return_value = {"price": "50000.00"}
        
        # Mock order execution with slippage
        mock_place_order.return_value = {
            "orderId": "12345",
            "status": "FILLED",
            "fills": [
                {
                    "price": "50800.00",  # 1.6% higher than expected
                    "qty": "0.1",
                    "commission": "0.01"
                }
            ]
        }
        
        # Execute order with slippage protection
        result = self.binance_service.place_order_with_slippage_protection(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,
            max_slippage_percent=1.0  # Max allowed slippage (1%)
        )
        
        # Order should be cancelled or have slippage warning
        self.assertIn("slippage_warning", result)
        self.assertTrue(result["slippage_warning"])
        self.assertIn("slippage_percent", result)
        self.assertGreater(result["slippage_percent"], 1.0)
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.trade_logger.TradeLogger.log_warning')
    def test_acceptable_slippage(self, mock_log_warning, mock_place_order):
        """Test handling of acceptable slippage levels"""
        # Mock order execution with minor slippage
        mock_place_order.return_value = {
            "orderId": "12345",
            "status": "FILLED",
            "price": "50250.00",  # Only 0.5% higher than expected
            "fills": [
                {
                    "price": "50250.00",
                    "qty": "0.1",
                    "commission": "0.01"
                }
            ]
        }
        
        # Execute order with slippage protection
        result = self.binance_service.place_order_with_slippage_protection(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,
            expected_price=50000.00,
            max_slippage_percent=1.0  # Max allowed slippage (1%)
        )
        
        # Order should be executed normally with no warnings
        self.assertEqual(result.get("status"), "FILLED")
        self.assertEqual(result.get("orderId"), "12345")
        
        # Slippage should be calculated but under threshold
        self.assertIn("slippage_percent", result)
        self.assertLess(result["slippage_percent"], 1.0)
        self.assertFalse(result.get("slippage_warning", False))

class TestStopLossTakeProfit(unittest.TestCase):
    """Tests stop-loss and take-profit behavior during market volatility"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.risk_service = RiskManagementService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_stop_loss_trigger_volatility(self, mock_get_price, mock_place_order):
        """Test stop-loss trigger during price volatility"""
        # Create a sequence of prices to simulate volatility
        # Price drops sharply, then recovers slightly, then continues falling
        mock_get_price.side_effect = [
            {"price": "50000.00"},  # Initial price
            {"price": "49000.00"},  # First check - 2% drop
            {"price": "49500.00"},  # Second check - slight recovery
            {"price": "48800.00"},  # Third check - continued drop
            {"price": "48500.00"}   # Final check - further drop
        ]
        
        # Mock successful order placement for stop loss
        mock_place_order.return_value = {"orderId": "12345", "status": "FILLED"}
        
        # Start monitoring for stop loss (5% below entry)
        position = {
            "symbol": "BTCUSDT",
            "entry_price": 50000.00,
            "quantity": 0.1,
            "side": "BUY",
            "stop_loss_percent": 5.0,  # 5% below entry = $47,500
            "position_id": "pos-123"
        }
        
        # Monitor price movement (calls get_price multiple times)
        result = self.binance_service.monitor_stop_loss(
            position=position,
            check_interval=0.1,  # Very short interval for testing
            max_checks=4         # Maximum 4 price checks
        )
        
        # Stop loss should not be triggered as price drop (3%) is less than threshold (5%)
        self.assertFalse(result.get("stop_loss_triggered", False))
        self.assertGreater(result.get("current_price", 0), 47500)  # Price above stop loss
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_take_profit_trigger_spike(self, mock_get_price, mock_place_order):
        """Test take-profit trigger during price spike"""
        # Create a sequence of prices to simulate a spike
        mock_get_price.side_effect = [
            {"price": "50000.00"},  # Initial price
            {"price": "52000.00"},  # First check - 4% rise
            {"price": "51500.00"},  # Second check - slight pullback
            {"price": "52500.00"},  # Third check - new high
            {"price": "53000.00"}   # Final check - further rise
        ]
        
        # Mock successful order placement for take profit
        mock_place_order.return_value = {"orderId": "12345", "status": "FILLED"}
        
        # Start monitoring for take profit (5% above entry)
        position = {
            "symbol": "BTCUSDT",
            "entry_price": 50000.00,
            "quantity": 0.1,
            "side": "BUY",
            "take_profit_percent": 5.0,  # 5% above entry = $52,500
            "position_id": "pos-123"
        }
        
        # Monitor price movement (calls get_price multiple times)
        result = self.binance_service.monitor_take_profit(
            position=position,
            check_interval=0.1,  # Very short interval for testing
            max_checks=4         # Maximum 4 price checks
        )
        
        # Take profit should be triggered at the 3rd or 4th check
        self.assertTrue(result.get("take_profit_triggered", False))
        self.assertGreaterEqual(result.get("trigger_price", 0), 52500)  # Trigger at/above take profit
        
        # Order should be placed to close the position
        mock_place_order.assert_called_once()

class TestOrderBookDepth(unittest.TestCase):
    """Tests behavior with thin order books during rapid price movements"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_order_book')
    def test_thin_order_book_detection(self, mock_get_order_book):
        """Test detection of thin order book"""
        # Mock order book with thin depth
        mock_get_order_book.return_value = {
            "bids": [
                ["49900.00", "0.005"],  # Only 0.005 BTC at this price
                ["49850.00", "0.008"],
                ["49800.00", "0.01"]
            ],
            "asks": [
                ["50100.00", "0.003"],  # Only 0.003 BTC at this price
                ["50150.00", "0.007"],
                ["50200.00", "0.015"]
            ]
        }
        
        # Check order book depth for a trade
        depth_analysis = self.binance_service.analyze_order_book_depth(
            symbol="BTCUSDT",
            side="BUY",
            quantity=0.1  # Larger than available at best price
        )
        
        # Should detect thin order book
        self.assertTrue(depth_analysis.get("is_thin_order_book", False))
        self.assertLess(depth_analysis.get("best_price_quantity", 0), 0.1)
        self.assertIn("price_impact", depth_analysis)
        self.assertGreater(depth_analysis.get("price_impact", 0), 0)
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_order_book')
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_order_size_adjustment(self, mock_place_order, mock_get_order_book):
        """Test order size adjustment for thin markets"""
        # Mock order book with thin depth
        mock_get_order_book.return_value = {
            "bids": [
                ["49900.00", "0.005"],
                ["49850.00", "0.008"],
                ["49800.00", "0.01"]
            ],
            "asks": [
                ["50100.00", "0.003"],
                ["50150.00", "0.007"],
                ["50200.00", "0.015"]
            ]
        }
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12345", "status": "FILLED"}
        
        # Place order with thin market protection
        result = self.binance_service.place_order_with_market_depth_protection(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,
            max_price_impact_percent=1.0  # Max 1% price impact allowed
        )
        
        # Order should be modified (split or reduced)
        self.assertNotEqual(result.get("original_quantity", 0), result.get("executed_quantity", 0))
        self.assertIn("adjusted_for_depth", result)
        self.assertTrue(result.get("adjusted_for_depth", False))

class TestPriceFeedLag(unittest.TestCase):
    """Tests detection and handling of price feed lag"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_ticker')
    def test_price_lag_detection(self, mock_get_ticker):
        """Test detection of stale price data"""
        # Current time in milliseconds
        current_time = int(time.time() * 1000)
        
        # Mock ticker with old timestamp (30 seconds old)
        mock_get_ticker.return_value = {
            "symbol": "BTCUSDT",
            "price": "50000.00",
            "time": current_time - 30000  # 30s old
        }
        
        # Check for price feed lag
        result = self.binance_service.check_price_feed_freshness(
            symbol="BTCUSDT",
            max_age_seconds=10  # Max acceptable age is 10s
        )
        
        # Should detect lag
        self.assertTrue(result.get("is_stale", False))
        self.assertGreaterEqual(result.get("age_seconds", 0), 30)
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_ticker')
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_halt_trading_during_lag(self, mock_place_order, mock_get_ticker):
        """Test trading halt during price feed lag"""
        # Current time in milliseconds
        current_time = int(time.time() * 1000)
        
        # Mock ticker with old timestamp (30 seconds old)
        mock_get_ticker.return_value = {
            "symbol": "BTCUSDT",
            "price": "50000.00",
            "time": current_time - 30000  # 30s old
        }
        
        # Attempt to place order with freshness check
        try:
            result = self.binance_service.place_order_with_freshness_check(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.1,
                max_data_age_seconds=10  # Max acceptable age is 10s
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("stale", str(e).lower())
            
            # Order should not be placed
            mock_place_order.assert_not_called()

class TestOrderRejection(unittest.TestCase):
    """Tests handling of order rejections due to price movement"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_price_movement_rejection(self, mock_place_order):
        """Test handling of order rejection due to price change"""
        # Simulate API error for price movement
        filter_error_response = {
            "code": -2010,
            "msg": "Filter failure: PRICE_FILTER"
        }
        mock_place_order.side_effect = Exception("Filter failure: PRICE_FILTER")
        
        try:
            # Attempt to place limit order with outdated price
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="LIMIT",
                quantity=0.1,
                price=50000.00  # Price may have changed
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("filter", str(e).lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_limit_order_price_update(self, mock_get_price, mock_place_order):
        """Test automatic update of limit order price based on current market"""
        # Mock current price
        mock_get_price.return_value = {"price": "52000.00"}  # Current price is $52,000
        
        # First call fails with price filter error, second succeeds
        mock_place_order.side_effect = [
            Exception("Filter failure: PRICE_FILTER"),
            {"orderId": "12345", "status": "NEW"}
        ]
        
        # Try to place limit order with auto-update
        result = self.binance_service.place_limit_order_with_price_update(
            symbol="BTCUSDT",
            side="BUY",
            quantity=0.1,
            price=50000.00,  # Original price (outdated)
            auto_update_price=True
        )
        
        # Order should be placed with updated price
        self.assertEqual(result.get("status"), "NEW")
        self.assertEqual(result.get("orderId"), "12345")
        
        # Check that second call used updated price
        args, kwargs = mock_place_order.call_args_list[1]
        self.assertAlmostEqual(float(kwargs.get("price")), 52000.00, delta=100)

def run_market_movement_tests():
    """Run all market movement tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestPriceSlippage))
    suite.addTests(loader.loadTestsFromTestCase(TestStopLossTakeProfit))
    suite.addTests(loader.loadTestsFromTestCase(TestOrderBookDepth))
    suite.addTests(loader.loadTestsFromTestCase(TestPriceFeedLag))
    suite.addTests(loader.loadTestsFromTestCase(TestOrderRejection))
    
    # Run the tests
    runner = unittest.TextTestRunner(verbosity=0)
    results = runner.run(suite)
    
    # Collect results
    total = results.testsRun
    failed = len(results.failures) + len(results.errors)
    passed = total - failed
    skipped = len(results.skipped) if hasattr(results, 'skipped') else 0
    
    # Format failures for reporting
    failures = []
    for failure in results.failures:
        test_name = failure[0]._testMethodName
        failures.append(f"{test_name}: {failure[1]}")
    
    for error in results.errors:
        test_name = error[0]._testMethodName
        failures.append(f"{test_name} (ERROR): {error[1]}")
    
    return {
        "total": total,
        "passed": passed,
        "failed": failed,
        "skipped": skipped,
        "failures": failures
    }

if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Run tests
    results = run_market_movement_tests()
    
    # Print results
    print(f"{Fore.CYAN}Market Movement Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")