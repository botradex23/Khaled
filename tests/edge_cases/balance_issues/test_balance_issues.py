"""
Balance Issues Edge Case Tests

This module tests the system's behavior when dealing with balance and leverage issues:
1. Insufficient funds
2. Exceeding max leverage
3. Exceeding position limits 
4. Risk management blocks (over-allocation)
5. Decimal precision handling
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
    from python_app.services.risk_management.risk_service import RiskManagementService
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue
    from python_app.utils.trade_logger import TradeLogger
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class BinanceService:
        pass
    
    class RiskManagementService:
        pass
    
    class TradeExecutionQueue:
        pass
    
    class TradeLogger:
        pass

logger = logging.getLogger("balance_issues")

class TestInsufficientFunds(unittest.TestCase):
    """Tests system behavior when attempting trades with insufficient funds"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.risk_service = RiskManagementService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.trade_logger.TradeLogger.log_error')
    def test_insufficient_balance_handling(self, mock_log_error, mock_place_order, mock_get_account):
        """Test handling of insufficient balance for order"""
        # Mock account info with low balance
        mock_get_account.return_value = {
            "balances": [
                {
                    "asset": "BTC",
                    "free": "0.0001",  # Very low balance
                    "locked": "0"
                },
                {
                    "asset": "USDT",
                    "free": "10.0",    # Low USDT balance
                    "locked": "0"
                }
            ]
        }
        
        # Simulate API error for insufficient funds
        insufficient_funds_response = {
            "code": -2010,
            "msg": "Account has insufficient balance for requested action."
        }
        mock_place_order.side_effect = Exception("Insufficient balance")
        
        try:
            # Attempt to place order with insufficient funds
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.01  # Requires more funds than available
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("insufficient", str(e).lower())
            mock_log_error.assert_called_once()
    
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.check_sufficient_balance')
    def test_balance_check_before_trade(self, mock_check_balance, mock_validate_trade):
        """Test pre-trade balance check to prevent API errors"""
        # Mock balance check failure
        mock_check_balance.return_value = (False, "Insufficient balance for trade")
        
        # Mock validate trade to pass other checks
        mock_validate_trade.return_value = (True, "Other checks passed")
        
        # Check if the trade would be blocked
        is_valid, message = self.risk_service.validate_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.01,
            "user_id": "test-user"
        })
        
        # Validation should fail due to insufficient balance
        self.assertFalse(is_valid)
        self.assertIn("balance", message.lower())
        
        # Ensure balance check was called
        mock_check_balance.assert_called_once()

class TestLeverageLimits(unittest.TestCase):
    """Tests system behavior when attempting to exceed leverage limits"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.risk_service = RiskManagementService()
    
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.check_leverage_limit')
    def test_leverage_limit_validation(self, mock_check_leverage, mock_validate_trade):
        """Test validation of trades exceeding max leverage"""
        # Mock leverage check failure
        mock_check_leverage.return_value = (False, "Exceeds maximum allowed leverage (10x)")
        
        # Mock validate trade to pass other checks
        mock_validate_trade.return_value = (True, "Other checks passed")
        
        # Check if the trade would be blocked
        is_valid, message = self.risk_service.validate_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "leverage": 20,  # Exceeds max leverage
            "user_id": "test-user"
        })
        
        # Validation should fail due to excessive leverage
        self.assertFalse(is_valid)
        self.assertIn("leverage", message.lower())
        
        # Ensure leverage check was called
        mock_check_leverage.assert_called_once()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_api_leverage_limit_rejection(self, mock_place_order):
        """Test handling of API rejection for leverage limit"""
        # Simulate API error for excessive leverage
        leverage_error_response = {
            "code": -4110,
            "msg": "Margin is insufficient."
        }
        mock_place_order.side_effect = Exception("Margin is insufficient")
        
        try:
            # Attempt to place leveraged order
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.1,
                leverage=25  # Excessive leverage
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("margin", str(e).lower())

class TestPositionLimits(unittest.TestCase):
    """Tests system behavior when attempting to exceed position limits"""
    
    def setUp(self):
        self.risk_service = RiskManagementService()
        self.binance_service = BinanceService()
    
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.check_position_limit')
    def test_position_size_limit(self, mock_check_position, mock_validate_trade):
        """Test validation of trades exceeding max position size"""
        # Mock position check failure
        mock_check_position.return_value = (False, "Exceeds maximum position size (1 BTC)")
        
        # Mock validate trade to pass other checks
        mock_validate_trade.return_value = (True, "Other checks passed")
        
        # Check if the trade would be blocked
        is_valid, message = self.risk_service.validate_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 2.5,  # Very large position
            "user_id": "test-user"
        })
        
        # Validation should fail due to excessive position size
        self.assertFalse(is_valid)
        self.assertIn("position", message.lower())
        
        # Ensure position check was called
        mock_check_position.assert_called_once()
    
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.check_open_positions_limit')
    def test_max_open_positions(self, mock_check_open_positions, mock_validate_trade):
        """Test validation of exceeding maximum number of open positions"""
        # Mock open positions check failure
        mock_check_open_positions.return_value = (False, "Exceeds maximum number of open positions (10)")
        
        # Mock validate trade to pass other checks
        mock_validate_trade.return_value = (True, "Other checks passed")
        
        # Check if the trade would be blocked
        is_valid, message = self.risk_service.validate_trade({
            "symbol": "ATOMUSDT",  # New position symbol
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "user_id": "test-user"
        })
        
        # Validation should fail due to too many open positions
        self.assertFalse(is_valid)
        self.assertIn("positions", message.lower())
        
        # Ensure open positions check was called
        mock_check_open_positions.assert_called_once()

class TestRiskManagementBlocks(unittest.TestCase):
    """Tests system behavior when risk management blocks trades"""
    
    def setUp(self):
        self.risk_service = RiskManagementService()
        self.queue = TradeExecutionQueue()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.check_portfolio_allocation')
    @patch('python_app.utils.trade_logger.TradeLogger.log_risk_rejection')
    def test_portfolio_allocation_limit(self, mock_log_rejection, mock_check_allocation, mock_validate_trade):
        """Test validation of trades exceeding portfolio allocation limits"""
        # Mock allocation check failure
        mock_check_allocation.return_value = (False, "Exceeds maximum portfolio allocation (20%) for single asset")
        
        # Mock validate trade to pass other checks
        mock_validate_trade.return_value = (True, "Other checks passed")
        
        # Check if the trade would be blocked
        is_valid, message = self.risk_service.validate_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.5,  # Large position relative to portfolio
            "user_id": "test-user"
        })
        
        # Validation should fail due to excessive allocation
        self.assertFalse(is_valid)
        self.assertIn("allocation", message.lower())
        
        # Ensure allocation check was called
        mock_check_allocation.assert_called_once()
        
        # Ensure rejection was logged
        mock_log_rejection.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.add_trade')
    @patch('python_app.services.risk_management.risk_service.RiskManagementService.validate_trade')
    def test_queue_rejection_on_risk_failure(self, mock_validate_trade, mock_add_trade):
        """Test that trade queue rejects orders that fail risk validation"""
        # Mock risk validation failure
        mock_validate_trade.return_value = (False, "Risk check failed: Exceeds daily loss limit")
        
        trade = {
            "symbol": "ETHUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "user_id": "test-user",
            "trade_id": "test-123"
        }
        
        # Attempt to add trade to queue
        result = self.queue.add_trade(trade)
        
        # Should be rejected
        self.assertFalse(result.get("success", False))
        self.assertIn("risk", result.get("message", "").lower())
        
        # Queue should not have added the trade
        mock_add_trade.assert_not_called()

class TestDecimalPrecision(unittest.TestCase):
    """Tests system behavior with decimal precision edge cases"""
    
    def setUp(self):
        self.binance_service = BinanceService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    def test_excess_decimal_precision(self, mock_place_order):
        """Test handling of quantity with excessive decimal precision"""
        # Simulate API error for decimal precision
        precision_error_response = {
            "code": -1111,
            "msg": "Precision is over the maximum defined for this asset."
        }
        mock_place_order.side_effect = Exception("Precision is over the maximum")
        
        try:
            # Attempt to place order with too many decimal places
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.0123456789  # Too many decimal places
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("precision", str(e).lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.get_symbol_info')
    def test_decimal_precision_correction(self, mock_get_symbol, mock_place_order):
        """Test automatic correction of decimal precision before API call"""
        # Mock symbol info with precision limits
        mock_get_symbol.return_value = {
            "symbol": "BTCUSDT",
            "baseAssetPrecision": 6,  # Max 6 decimal places for BTC
            "quotePrecision": 2       # Max 2 decimal places for USDT
        }
        
        # Mock successful order placement
        mock_place_order.return_value = {"orderId": "12345", "status": "FILLED"}
        
        # Place order with excess precision that should be corrected
        result = self.binance_service.place_order_with_precision_check(
            symbol="BTCUSDT",
            side="BUY",
            type="MARKET",
            quantity=0.0123456789  # Should be truncated to 0.012345
        )
        
        # Check that order was placed with corrected precision
        args, kwargs = mock_place_order.call_args
        self.assertEqual(kwargs.get("quantity"), 0.012345)
        self.assertEqual(result.get("orderId"), "12345")

def run_balance_issue_tests():
    """Run all balance issue tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestInsufficientFunds))
    suite.addTests(loader.loadTestsFromTestCase(TestLeverageLimits))
    suite.addTests(loader.loadTestsFromTestCase(TestPositionLimits))
    suite.addTests(loader.loadTestsFromTestCase(TestRiskManagementBlocks))
    suite.addTests(loader.loadTestsFromTestCase(TestDecimalPrecision))
    
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
    results = run_balance_issue_tests()
    
    # Print results
    print(f"{Fore.CYAN}Balance Issue Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")