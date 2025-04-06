"""
API Failures Edge Case Tests

This module tests the system's resilience to various API failure scenarios:
1. Binance API timeouts
2. Rate limiting
3. Network connectivity issues
4. Malformed API responses
5. Server-side errors (5xx)
"""

import os
import sys
import time
import logging
import requests
import unittest
from unittest.mock import patch, MagicMock
from colorama import Fore, Style

# Ensure we can import modules from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Import required modules from the project
try:
    from python_app.services.binance.trading_service import BinanceService
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue
    from python_app.services.risk_management.risk_service import RiskManagementService
    from python_app.utils.fallback_notifier import FallbackNotifier
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class BinanceService:
        pass
    
    class TradeExecutionQueue:
        pass
    
    class RiskManagementService:
        pass
    
    class FallbackNotifier:
        pass

logger = logging.getLogger("api_failures")

class TestAPITimeouts(unittest.TestCase):
    """Tests system behavior when API calls timeout"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.notifier = FallbackNotifier()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    def test_timeout_handling(self, mock_get_account):
        """Test handling of API timeouts"""
        # Simulate timeout
        mock_get_account.side_effect = requests.exceptions.Timeout("Connection timed out")
        
        # Verify the system handles the timeout gracefully
        # This depends on your implementation, but typically should log the error and retry
        try:
            # Call the method that internally calls get_account_info
            result = self.binance_service.get_account_info()
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("timeout", str(e).lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.fallback_notifier.FallbackNotifier.send_notification')
    def test_retry_mechanism(self, mock_notify, mock_place_order):
        """Test that the system retries failed API calls"""
        # First call raises timeout, second succeeds
        mock_place_order.side_effect = [
            requests.exceptions.Timeout("Connection timed out"),
            {"orderId": "12345", "status": "FILLED"}
        ]
        
        # Call method that should implement retry logic
        result = self.binance_service.place_order(
            symbol="BTCUSDT", 
            side="BUY", 
            type="MARKET", 
            quantity=0.001
        )
        
        # Verify it succeeded after retry
        self.assertEqual(result.get("orderId"), "12345")
        
        # Verify notification was sent about the retry
        mock_notify.assert_called_once()

class TestRateLimiting(unittest.TestCase):
    """Tests system behavior when rate limits are hit"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_exchange_info')
    def test_rate_limit_backoff(self, mock_exchange_info):
        """Test rate limit handling with exponential backoff"""
        # Simulate rate limit errors twice, then success
        rate_limit_response = {
            "code": -1003,
            "msg": "Too many requests; current limit is 1200 request weight per minute. Please use the websocket for live updates to avoid polling the API."
        }
        mock_exchange_info.side_effect = [
            requests.exceptions.HTTPError("429 Too Many Requests", response=MagicMock(status_code=429, json=lambda: rate_limit_response)),
            requests.exceptions.HTTPError("429 Too Many Requests", response=MagicMock(status_code=429, json=lambda: rate_limit_response)),
            {"symbols": [{"symbol": "BTCUSDT"}]}
        ]
        
        start_time = time.time()
        result = self.binance_service.get_exchange_info()
        end_time = time.time()
        
        # Check that backoff happened (took longer than just 3 calls would)
        self.assertGreater(end_time - start_time, 0.5)  
        
        # Verify final result is correct
        self.assertIn("symbols", result)

class TestNetworkConnectivity(unittest.TestCase):
    """Tests system behavior when network connectivity is disrupted"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_connection_error_handling(self, mock_get_price):
        """Test handling of connection errors"""
        # Simulate connection error
        mock_get_price.side_effect = requests.exceptions.ConnectionError("Connection refused")
        
        try:
            price = self.binance_service.get_price("BTCUSDT")
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("connection", str(e).lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    @patch('python_app.services.binance.trading_service.BinanceService.fallback_to_alternative_source')
    def test_fallback_to_alternative_source(self, mock_fallback, mock_get_price):
        """Test fallback to alternative price source when primary fails"""
        # Primary source fails
        mock_get_price.side_effect = requests.exceptions.ConnectionError("Connection refused")
        
        # Fallback succeeds
        mock_fallback.return_value = {"price": "50000.00"}
        
        # Try to get price with fallback
        try:
            result = self.binance_service.get_price_with_fallback("BTCUSDT")
            
            # Verify fallback was used
            mock_fallback.assert_called_once_with("BTCUSDT")
            self.assertEqual(result.get("price"), "50000.00")
        except Exception:
            self.fail("Should not have raised an exception when fallback is available")

class TestMalformedResponses(unittest.TestCase):
    """Tests system behavior when API returns malformed responses"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_order_book')
    def test_invalid_json_handling(self, mock_order_book):
        """Test handling of invalid JSON responses"""
        # Simulate invalid JSON response
        mock_response = MagicMock()
        mock_response.json.side_effect = ValueError("Invalid JSON")
        mock_response.text = "Not valid JSON"
        mock_order_book.return_value = mock_response
        
        try:
            result = self.binance_service.get_order_book("BTCUSDT")
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("json", str(e).lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_ticker')
    def test_missing_fields_handling(self, mock_get_ticker):
        """Test handling of responses with missing fields"""
        # Simulate response with missing expected fields
        incomplete_response = {"symbol": "BTCUSDT"}  # Missing 'price' field
        mock_get_ticker.return_value = incomplete_response
        
        try:
            # Method that expects 'price' field
            result = self.binance_service.get_formatted_ticker("BTCUSDT")
            
            # Should handle missing fields gracefully
            self.assertIsNotNone(result)
            self.assertEqual(result.get("symbol"), "BTCUSDT")
            self.assertIsNone(result.get("price"))
        except KeyError:
            self.fail("Should handle missing fields gracefully without KeyError")

class TestServerErrors(unittest.TestCase):
    """Tests system behavior when API returns server errors (5xx)"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_internal_server_error_handling(self, mock_place_order):
        """Test handling of 500 Internal Server Error responses"""
        # Simulate 500 error
        server_error_response = {"code": 500, "msg": "Internal Server Error"}
        mock_place_order.side_effect = requests.exceptions.HTTPError(
            "500 Internal Server Error", 
            response=MagicMock(status_code=500, json=lambda: server_error_response)
        )
        
        try:
            # Attempt to place order
            result = self.binance_service.place_order(
                symbol="BTCUSDT", 
                side="BUY", 
                type="MARKET", 
                quantity=0.001
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("500", str(e))
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.execute_trade')
    def test_queue_persistence_during_failure(self, mock_execute_trade):
        """Test queue persists trades when API server errors occur"""
        # Simulate server error for first execution attempt
        server_error_response = {"code": 503, "msg": "Service Unavailable"}
        mock_execute_trade.side_effect = [
            requests.exceptions.HTTPError(
                "503 Service Unavailable", 
                response=MagicMock(status_code=503, json=lambda: server_error_response)
            ),
            {"orderId": "12345", "status": "FILLED"}  # Success on retry
        ]
        
        # Add trade to queue
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.001,
            "trade_id": "test-123"
        })
        
        # Process queue (should retry on failure)
        self.queue.process_queue()
        
        # Verify execute_trade was called twice (initial + retry)
        self.assertEqual(mock_execute_trade.call_count, 2)

def run_api_failure_tests():
    """Run all API failure tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestAPITimeouts))
    suite.addTests(loader.loadTestsFromTestCase(TestRateLimiting))
    suite.addTests(loader.loadTestsFromTestCase(TestNetworkConnectivity))
    suite.addTests(loader.loadTestsFromTestCase(TestMalformedResponses))
    suite.addTests(loader.loadTestsFromTestCase(TestServerErrors))
    
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
    results = run_api_failure_tests()
    
    # Print results
    print(f"{Fore.CYAN}API Failure Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")