"""
Duplicate Orders Edge Case Tests

This module tests the system's behavior when handling duplicate orders or signals:
1. Duplicate trading signals
2. Rapidly repeated order requests
3. Concurrent identical orders
4. Multiple stop-loss/take-profit triggers
5. Idempotency handling
"""

import os
import sys
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
    from python_app.services.ai_signals.signal_validator import SignalValidator
    from python_app.utils.trade_logger import TradeLogger
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class BinanceService:
        pass
    
    class TradeExecutionQueue:
        pass
    
    class SignalValidator:
        pass
    
    class TradeLogger:
        pass

logger = logging.getLogger("duplicate_orders")

class TestDuplicateTradeSignals(unittest.TestCase):
    """Tests system behavior when receiving duplicate trading signals"""
    
    def setUp(self):
        self.signal_validator = SignalValidator()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.services.ai_signals.signal_validator.SignalValidator.check_duplicate_signal')
    @patch('python_app.services.ai_signals.signal_validator.SignalValidator.validate_signal')
    def test_duplicate_signal_detection(self, mock_validate, mock_check_duplicate):
        """Test detection of duplicate trading signals"""
        # Mock duplicate detection
        mock_check_duplicate.return_value = True
        
        # Mock other validation to pass
        mock_validate.return_value = (True, "Signal is valid")
        
        # Trade signal
        signal = {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "signal_id": "sig-123",
            "source": "ai_model",
            "timestamp": 1637012345678
        }
        
        # Validate signal
        is_valid, message = self.signal_validator.validate_signal(signal)
        
        # Validation should fail due to duplicate
        self.assertFalse(is_valid)
        self.assertIn("duplicate", message.lower())
        
        # Ensure duplicate check was called
        mock_check_duplicate.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.add_trade')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.is_duplicate_trade')
    def test_duplicate_signal_queuing_prevention(self, mock_is_duplicate, mock_add_trade):
        """Test prevention of duplicate signals being added to queue"""
        # Mock duplicate detection
        mock_is_duplicate.return_value = True
        
        # Trade to add
        trade = {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "trade-123",
            "source": "ai_model",
            "timestamp": 1637012345678
        }
        
        # Try to add trade to queue
        result = self.queue.add_trade(trade)
        
        # Should be rejected as duplicate
        self.assertFalse(result.get("success", False))
        self.assertIn("duplicate", result.get("message", "").lower())
        
        # Trade should not be added
        mock_add_trade.assert_not_called()

class TestRepeatedOrderRequests(unittest.TestCase):
    """Tests system behavior with rapidly repeated order requests"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_recent_orders')
    @patch('python_app.utils.trade_logger.TradeLogger.log_warning')
    def test_throttling_mechanism(self, mock_log_warning, mock_get_recent, mock_place_order):
        """Test request throttling for rapid identical orders"""
        # Mock recent orders to show identical recent order
        mock_get_recent.return_value = [
            {
                "symbol": "BTCUSDT",
                "orderId": "12345",
                "side": "BUY", 
                "type": "MARKET",
                "origQty": "0.1",
                "time": 1637012345678  # Very recent (mock time)
            }
        ]
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12346", "status": "FILLED"}
        
        # Place order with throttling protection
        result = self.binance_service.place_order_with_throttling(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,
            min_time_between_orders_ms=5000  # Minimum 5 seconds between orders
        )
        
        # Order should be throttled
        self.assertIn("throttled", result)
        self.assertTrue(result["throttled"])
        
        # Order should not be placed
        mock_place_order.assert_not_called()
        
        # Warning should be logged
        mock_log_warning.assert_called_once()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_recent_orders')
    def test_similar_but_different_orders(self, mock_get_recent, mock_place_order):
        """Test that similar but non-identical orders are allowed"""
        # Mock recent orders with slightly different quantity
        mock_get_recent.return_value = [
            {
                "symbol": "BTCUSDT",
                "orderId": "12345",
                "side": "BUY", 
                "type": "MARKET",
                "origQty": "0.05",  # Different quantity
                "time": 1637012345678
            }
        ]
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12346", "status": "FILLED"}
        
        # Place order with throttling protection
        result = self.binance_service.place_order_with_throttling(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,  # Different from recent order
            min_time_between_orders_ms=5000
        )
        
        # Order should not be throttled (quantity differs)
        self.assertNotIn("throttled", result)
        self.assertEqual(result.get("status"), "FILLED")
        
        # Order should be placed
        mock_place_order.assert_called_once()

class TestConcurrentIdenticalOrders(unittest.TestCase):
    """Tests system behavior with concurrent identical orders"""
    
    def setUp(self):
        self.queue = TradeExecutionQueue()
        self.binance_service = BinanceService()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.is_same_order_in_progress')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.add_trade')
    def test_concurrent_order_detection(self, mock_add_trade, mock_check_in_progress):
        """Test detection of concurrent identical orders"""
        # Mock in-progress check to find concurrent order
        mock_check_in_progress.return_value = True
        
        # Trade to add
        trade = {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "trade-123"
        }
        
        # Try to add trade to queue
        result = self.queue.add_trade_safe(trade)
        
        # Should be rejected due to concurrent order
        self.assertFalse(result.get("success", False))
        self.assertIn("progress", result.get("message", "").lower())
        
        # Trade should not be added
        mock_add_trade.assert_not_called()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.get_in_progress_trades')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.add_trade')
    def test_batching_of_similar_orders(self, mock_add_trade, mock_get_in_progress):
        """Test batching of similar concurrent orders"""
        # Mock in-progress trades
        mock_get_in_progress.return_value = [
            {
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.05,
                "trade_id": "trade-122",
                "status": "pending"
            }
        ]
        
        # Mock successful add
        mock_add_trade.return_value = {"success": True, "trade_id": "trade-123-batch"}
        
        # Trade to add (similar to in-progress)
        trade = {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "trade-123"
        }
        
        # Try to add trade with batching option
        result = self.queue.add_trade_with_batching(trade)
        
        # Should be batched with existing order
        self.assertTrue(result.get("success", False))
        self.assertTrue(result.get("batched", False))
        self.assertIn("batch_id", result)

class TestMultipleStopLossTriggers(unittest.TestCase):
    """Tests handling of multiple stop-loss/take-profit triggers"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_open_orders')
    def test_stop_loss_deduplication(self, mock_get_open, mock_place_order):
        """Test deduplication of stop-loss orders"""
        # Mock open orders to include existing stop loss
        mock_get_open.return_value = [
            {
                "symbol": "BTCUSDT",
                "orderId": "12345",
                "side": "SELL",  # Opposite of position side
                "type": "STOP_LOSS_LIMIT",
                "origQty": "0.1",
                "stopPrice": "48000.00",
                "price": "47900.00"
            }
        ]
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12346", "status": "NEW"}
        
        # Try to place stop loss
        result = self.binance_service.place_stop_loss_with_deduplication(
            symbol="BTCUSDT",
            position_side="BUY",
            quantity=0.1,
            stop_price=48000.00,
            price=47900.00
        )
        
        # Should detect existing stop loss and not place new one
        self.assertIn("duplicate_detected", result)
        self.assertTrue(result["duplicate_detected"])
        self.assertEqual(result.get("existing_order_id"), "12345")
        
        # New order should not be placed
        mock_place_order.assert_not_called()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_open_orders')
    def test_take_profit_update(self, mock_get_open, mock_place_order):
        """Test updating take-profit order when better price is possible"""
        # Mock open orders to include existing take profit
        mock_get_open.return_value = [
            {
                "symbol": "BTCUSDT",
                "orderId": "12345",
                "side": "SELL",
                "type": "LIMIT",
                "origQty": "0.1",
                "price": "52000.00"  # Lower than new take profit
            }
        ]
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12346", "status": "NEW"}
        
        # Try to place better take profit
        result = self.binance_service.place_or_update_take_profit(
            symbol="BTCUSDT",
            position_side="BUY",
            quantity=0.1,
            price=53000.00  # Better price
        )
        
        # Should detect existing take profit and update it
        self.assertIn("updated", result)
        self.assertTrue(result["updated"])
        self.assertEqual(result.get("old_order_id"), "12345")
        self.assertEqual(result.get("new_order_id"), "12346")
        
        # New order should be placed (after cancelling old one)
        mock_place_order.assert_called_once()

class TestIdempotencyHandling(unittest.TestCase):
    """Tests system's idempotency handling for order operations"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_order')
    def test_idempotent_order_placement(self, mock_get_order, mock_place_order):
        """Test idempotent order placement with client order ID"""
        # Mock order lookup to find existing order
        mock_get_order.return_value = {
            "symbol": "BTCUSDT",
            "orderId": "12345",
            "clientOrderId": "test-client-id-123",
            "status": "FILLED",
            "executedQty": "0.1"
        }
        
        # Place order with idempotency key
        result = self.binance_service.place_order_idempotent(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.1,
            client_order_id="test-client-id-123"
        )
        
        # Should return existing order without placing new one
        self.assertEqual(result.get("orderId"), "12345")
        self.assertEqual(result.get("status"), "FILLED")
        
        # New order should not be placed
        mock_place_order.assert_not_called()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.get_trade_by_id')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.add_trade')
    def test_queue_idempotency(self, mock_add_trade, mock_get_trade):
        """Test idempotent trade queue operations"""
        # Mock trade lookup to find existing trade
        mock_get_trade.return_value = {
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "idempotent-trade-123",
            "status": "executed",
            "order_id": "12345"
        }
        
        # Add trade with same ID
        result = self.queue.add_trade_idempotent({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "idempotent-trade-123"
        })
        
        # Should return existing trade information
        self.assertTrue(result.get("success", False))
        self.assertTrue(result.get("idempotent_match", False))
        self.assertEqual(result.get("status"), "executed")
        self.assertEqual(result.get("order_id"), "12345")
        
        # New trade should not be added
        mock_add_trade.assert_not_called()

def run_duplicate_order_tests():
    """Run all duplicate order tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestDuplicateTradeSignals))
    suite.addTests(loader.loadTestsFromTestCase(TestRepeatedOrderRequests))
    suite.addTests(loader.loadTestsFromTestCase(TestConcurrentIdenticalOrders))
    suite.addTests(loader.loadTestsFromTestCase(TestMultipleStopLossTriggers))
    suite.addTests(loader.loadTestsFromTestCase(TestIdempotencyHandling))
    
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
    results = run_duplicate_order_tests()
    
    # Print results
    print(f"{Fore.CYAN}Duplicate Order Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")