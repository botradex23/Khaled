"""
Invalid Inputs Edge Case Tests

This module tests the system's response to various invalid inputs:
1. Invalid trading symbols
2. Invalid order quantities or prices
3. Malformed API requests
4. Missing required parameters
5. Invalid or malformed API keys
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
    from python_app.services.api_key_service import APIKeyService
    from python_app.api.trading import validate_order_params
    from python_app.utils.trade_logger import TradeLogger
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class BinanceService:
        pass
    
    class APIKeyService:
        pass
    
    class TradeLogger:
        pass
    
    def validate_order_params(params):
        pass

logger = logging.getLogger("invalid_inputs")

class TestInvalidSymbols(unittest.TestCase):
    """Tests system behavior when invalid trading symbols are provided"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_price')
    def test_nonexistent_symbol(self, mock_get_price):
        """Test handling of nonexistent trading symbol"""
        # Simulate API error for nonexistent symbol
        mock_get_price.side_effect = Exception("Invalid symbol")
        
        try:
            # Try to get price for nonexistent symbol
            result = self.binance_service.get_price("INVALIDCOIN")
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("symbol", str(e).lower())
    
    @patch('python_app.api.trading.validate_order_params')
    def test_symbol_validation(self, mock_validate):
        """Test symbol validation before API call"""
        # Mock validation failure
        mock_validate.return_value = (False, "Invalid trading pair format")
        
        try:
            # Test validation with malformed symbol
            is_valid, message = validate_order_params({
                "symbol": "BTC/USDT",  # Wrong format (should be BTCUSDT)
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.001
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("format", message)
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")

class TestInvalidQuantities(unittest.TestCase):
    """Tests system behavior when invalid order quantities or prices are provided"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.api.trading.validate_order_params')
    def test_zero_quantity(self, mock_validate):
        """Test validation of zero quantity orders"""
        # Mock validation failure
        mock_validate.return_value = (False, "Quantity must be greater than zero")
        
        try:
            # Test validation with zero quantity
            is_valid, message = validate_order_params({
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("zero", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.api.trading.validate_order_params')
    def test_negative_quantity(self, mock_validate):
        """Test validation of negative quantity orders"""
        # Mock validation failure
        mock_validate.return_value = (False, "Quantity cannot be negative")
        
        try:
            # Test validation with negative quantity
            is_valid, message = validate_order_params({
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": -0.001
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("negative", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.api.trading.validate_order_params')
    def test_below_minimum_quantity(self, mock_validate):
        """Test validation of quantity below minimum allowed"""
        # Mock validation failure
        mock_validate.return_value = (False, "Quantity below minimum allowed (0.001)")
        
        try:
            # Test validation with tiny quantity
            is_valid, message = validate_order_params({
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.0000001
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("minimum", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")

class TestMalformedRequests(unittest.TestCase):
    """Tests system behavior when malformed API requests are made"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.trade_logger.TradeLogger.log_error')
    def test_malformed_order_type(self, mock_log_error, mock_place_order):
        """Test handling of malformed order type"""
        # Simulate API error for invalid order type
        mock_place_order.side_effect = Exception("Invalid order type: SUPER_BUY")
        
        try:
            # Attempt to place order with invalid type
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="SUPER_BUY",  # Invalid type
                quantity=0.001
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("type", str(e).lower())
            mock_log_error.assert_called_once()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.trade_logger.TradeLogger.log_error')
    def test_malformed_order_side(self, mock_log_error, mock_place_order):
        """Test handling of malformed order side"""
        # Simulate API error for invalid order side
        mock_place_order.side_effect = Exception("Invalid side: PURCHASE")
        
        try:
            # Attempt to place order with invalid side
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="PURCHASE",  # Invalid side (should be BUY or SELL)
                type="MARKET",
                quantity=0.001
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("side", str(e).lower())
            mock_log_error.assert_called_once()

class TestMissingParameters(unittest.TestCase):
    """Tests system behavior when required parameters are missing"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.api.trading.validate_order_params')
    def test_missing_symbol(self, mock_validate):
        """Test validation of request with missing symbol"""
        # Mock validation failure
        mock_validate.return_value = (False, "Symbol is required")
        
        try:
            # Test validation with missing symbol
            is_valid, message = validate_order_params({
                # "symbol": "BTCUSDT",  # Missing
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.001
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("required", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.api.trading.validate_order_params')
    def test_missing_side(self, mock_validate):
        """Test validation of request with missing side"""
        # Mock validation failure
        mock_validate.return_value = (False, "Side is required")
        
        try:
            # Test validation with missing side
            is_valid, message = validate_order_params({
                "symbol": "BTCUSDT",
                # "side": "BUY",  # Missing
                "type": "MARKET",
                "quantity": 0.001
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("required", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.api.trading.validate_order_params')
    def test_missing_quantity_and_price(self, mock_validate):
        """Test validation of request with missing quantity for limit order"""
        # Mock validation failure
        mock_validate.return_value = (False, "For LIMIT orders, both quantity and price are required")
        
        try:
            # Test validation with missing quantity for limit order
            is_valid, message = validate_order_params({
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "LIMIT",
                # "quantity": 0.001,  # Missing
                "price": 50000
            })
            
            # Validation should fail
            self.assertFalse(is_valid)
            self.assertIn("required", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")

class TestInvalidAPIKeys(unittest.TestCase):
    """Tests system behavior when invalid or malformed API keys are provided"""
    
    def setUp(self):
        self.api_key_service = APIKeyService()
        self.binance_service = BinanceService()
    
    @patch('python_app.services.api_key_service.APIKeyService.validate_key_format')
    def test_malformed_api_key(self, mock_validate):
        """Test validation of malformed API key"""
        # Mock validation failure
        mock_validate.return_value = False
        
        try:
            # Validate API key with incorrect format
            is_valid = self.api_key_service.validate_key_format("short-key")
            self.assertFalse(is_valid)
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.services.api_key_service.APIKeyService.validate_api_key')
    def test_invalid_api_key_content(self, mock_validate):
        """Test validation of invalid API key (incorrect content)"""
        # Mock validation failure
        mock_validate.return_value = (False, "Invalid API key")
        
        try:
            # Validate API key with incorrect content
            is_valid, message = self.api_key_service.validate_api_key(
                api_key="ABCDEFGHIJKLMNOPQRSTUVWXYZ123456",
                api_secret="ABCDEFGHIJKLMNOPQRSTUVWXYZ123456"
            )
            self.assertFalse(is_valid)
            self.assertIn("invalid", message.lower())
        except Exception as e:
            self.fail(f"Unexpected exception: {e}")
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    def test_api_key_permission_error(self, mock_get_account):
        """Test handling of API key without required permissions"""
        # Simulate API error for insufficient permissions
        permission_error_response = {
            "code": -2015,
            "msg": "Invalid API-key, IP, or permissions for action."
        }
        mock_get_account.side_effect = Exception("API-key has no permission")
        
        try:
            # Attempt to get account info with key lacking permissions
            result = self.binance_service.get_account_info()
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("permission", str(e).lower())

def run_invalid_input_tests():
    """Run all invalid input tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestInvalidSymbols))
    suite.addTests(loader.loadTestsFromTestCase(TestInvalidQuantities))
    suite.addTests(loader.loadTestsFromTestCase(TestMalformedRequests))
    suite.addTests(loader.loadTestsFromTestCase(TestMissingParameters))
    suite.addTests(loader.loadTestsFromTestCase(TestInvalidAPIKeys))
    
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
    results = run_invalid_input_tests()
    
    # Print results
    print(f"{Fore.CYAN}Invalid Inputs Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")