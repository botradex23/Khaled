"""
Permission Errors Edge Case Tests

This module tests the system's behavior when encountering permission-related issues:
1. Invalid API keys
2. API keys with insufficient permissions
3. API keys for wrong user
4. IP restriction errors
5. Cross-account access attempts
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
    from python_app.utils.trade_logger import TradeLogger
    from python_app.api.auth import authenticate_user, check_permissions
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
    
    def authenticate_user(request):
        pass
    
    def check_permissions(user_id, required_permission):
        pass

logger = logging.getLogger("permission_errors")

class TestInvalidAPIKeys(unittest.TestCase):
    """Tests system behavior with invalid API keys"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.api_key_service = APIKeyService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    @patch('python_app.utils.trade_logger.TradeLogger.log_error')
    def test_invalid_api_key_error(self, mock_log_error, mock_get_account):
        """Test handling of invalid API key error"""
        # Simulate API error for invalid key
        invalid_key_response = {
            "code": -2015,
            "msg": "Invalid API-key, IP, or permissions for action."
        }
        mock_get_account.side_effect = Exception("Invalid API-key")
        
        try:
            # Attempt to access account with invalid key
            result = self.binance_service.get_account_info()
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("api-key", str(e).lower())
            mock_log_error.assert_called_once()
    
    @patch('python_app.services.api_key_service.APIKeyService.validate_api_key_pair')
    def test_key_validation_failure(self, mock_validate):
        """Test validation of invalid API key pair"""
        # Mock validation failure
        mock_validate.return_value = (False, "API key validation failed")
        
        # Validate API key pair
        is_valid, message = self.api_key_service.validate_api_key_pair(
            api_key="invalid-api-key",
            api_secret="invalid-api-secret"
        )
        
        # Validation should fail
        self.assertFalse(is_valid)
        self.assertIn("failed", message.lower())
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    @patch('python_app.services.binance.trading_service.BinanceService.check_api_key_valid')
    @patch('python_app.services.binance.trading_service.BinanceService.initialize_client')
    def test_key_rotation_on_invalid(self, mock_initialize, mock_check_valid, mock_get_account):
        """Test key rotation when primary key becomes invalid"""
        # Mock key validation failure then success with backup
        mock_check_valid.side_effect = [False, True]
        
        # First call fails, second succeeds with backup key
        mock_get_account.side_effect = [
            Exception("Invalid API-key"),
            {"balances": [{"asset": "BTC", "free": "1.0"}]}
        ]
        
        # Try to get account info with automatic key rotation
        result = self.binance_service.get_account_info_with_key_rotation()
        
        # Should succeed with backup key
        self.assertIn("balances", result)
        
        # Should have initialized client twice (with different keys)
        self.assertEqual(mock_initialize.call_count, 2)

class TestInsufficientPermissions(unittest.TestCase):
    """Tests system behavior with keys having insufficient permissions"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.trade_logger.TradeLogger.log_error')
    def test_trading_permission_error(self, mock_log_error, mock_place_order):
        """Test handling of API key without trading permission"""
        # Simulate API error for insufficient permissions
        permission_error_response = {
            "code": -2015,
            "msg": "Invalid API-key, IP, or permissions for action."
        }
        mock_place_order.side_effect = Exception("API key does not have permission for SPOT Trading")
        
        try:
            # Attempt to place order with key lacking trading permission
            result = self.binance_service.place_order(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.1
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled/logged
            self.assertIn("permission", str(e).lower())
            mock_log_error.assert_called_once()
    
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.services.binance.trading_service.BinanceService.check_api_key_permissions')
    def test_permission_check_before_order(self, mock_check_permissions, mock_place_order):
        """Test permission check before placing order"""
        # Mock permission check failure
        mock_check_permissions.return_value = (False, "API key does not have trading permission")
        
        # Mock successful order placement (should never be called)
        mock_place_order.return_value = {"orderId": "12345", "status": "FILLED"}
        
        try:
            # Attempt to place order with permission check
            result = self.binance_service.place_order_with_permission_check(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.1
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error contains permission info
            self.assertIn("permission", str(e).lower())
            
            # Order should not be placed
            mock_place_order.assert_not_called()

class TestUserMismatch(unittest.TestCase):
    """Tests system behavior with API keys belonging to wrong user"""
    
    def setUp(self):
        self.api_key_service = APIKeyService()
        self.binance_service = BinanceService()
    
    @patch('python_app.services.api_key_service.APIKeyService.get_api_key_for_user')
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    def test_user_key_mismatch(self, mock_get_account, mock_get_key):
        """Test detection of user-key mismatch"""
        # Mock getting API key for user
        mock_get_key.return_value = {
            "api_key": "user-api-key",
            "api_secret": "user-api-secret",
            "user_id": "user-123"
        }
        
        # Mock account info response with different account
        mock_get_account.return_value = {
            "accountType": "SPOT",
            "balances": [{"asset": "BTC", "free": "1.0"}],
            "accountId": "different-account"  # Different from expected
        }
        
        # Try to verify account ownership
        is_valid = self.api_key_service.verify_user_account_ownership(
            user_id="user-123",
            expected_account_id="user-account"
        )
        
        # Verification should fail
        self.assertFalse(is_valid)
    
    @patch('python_app.services.api_key_service.APIKeyService.get_api_key_for_user')
    @patch('python_app.services.api_key_service.APIKeyService.set_api_key_for_user')
    def test_attempt_set_another_users_key(self, mock_set_key, mock_get_key):
        """Test prevention of setting another user's key"""
        # Mock getting existing API key for target user
        mock_get_key.return_value = {
            "api_key": "existing-api-key",
            "api_secret": "existing-api-secret",
            "user_id": "target-user",
            "key_id": "key-456"
        }
        
        # Try to set API key for another user
        try:
            result = self.api_key_service.update_api_key_for_user(
                user_id="attacker-user",
                target_user_id="target-user",
                api_key="new-api-key",
                api_secret="new-api-secret"
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("unauthorized", str(e).lower())
            
            # Key should not be set
            mock_set_key.assert_not_called()

class TestIPRestrictions(unittest.TestCase):
    """Tests system behavior with IP-restricted API keys"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.api_key_service = APIKeyService()
    
    @patch('python_app.services.binance.trading_service.BinanceService.get_account_info')
    def test_ip_restriction_error(self, mock_get_account):
        """Test handling of IP restriction error"""
        # Simulate API error for IP restriction
        ip_error_response = {
            "code": -2015,
            "msg": "Invalid API-key, IP, or permissions for action."
        }
        mock_get_account.side_effect = Exception("This IP is not allowed")
        
        try:
            # Attempt to access account from restricted IP
            result = self.binance_service.get_account_info()
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("ip", str(e).lower())
    
    @patch('python_app.services.api_key_service.APIKeyService.validate_api_key_pair')
    @patch('python_app.services.api_key_service.APIKeyService.is_ip_allowed')
    def test_ip_validation_before_use(self, mock_check_ip, mock_validate_key):
        """Test IP validation before using API key"""
        # Mock IP check failure
        mock_check_ip.return_value = False
        
        # Mock key validation success
        mock_validate_key.return_value = (True, "API key is valid")
        
        # Try to use API key with IP check
        result = self.api_key_service.validate_api_key_for_current_ip(
            api_key="test-api-key",
            api_secret="test-api-secret",
            client_ip="192.168.1.1"
        )
        
        # Validation should fail due to IP restriction
        self.assertFalse(result.get("is_valid", False))
        self.assertIn("ip", result.get("message", "").lower())

class TestCrossAccountAccess(unittest.TestCase):
    """Tests system behavior with attempts to access other accounts"""
    
    def setUp(self):
        self.trade_logger = TradeLogger()
    
    @patch('python_app.api.auth.authenticate_user')
    @patch('python_app.api.auth.check_permissions')
    @patch('python_app.utils.trade_logger.TradeLogger.log_security_event')
    def test_unauthorized_access_attempt(self, mock_log_security, mock_check_permissions, mock_authenticate):
        """Test handling of unauthorized access attempt"""
        # Mock authentication to succeed but with wrong user
        mock_authenticate.return_value = {
            "authenticated": True,
            "user_id": "user-123"
        }
        
        # Mock permission check to fail
        mock_check_permissions.return_value = False
        
        # Create request with different user ID
        request = {
            "headers": {"Authorization": "Bearer test-token"},
            "params": {"user_id": "user-456"}  # Different from authenticated user
        }
        
        # Try to access other user's data
        try:
            # Call auth function that checks user match
            user = authenticate_user(request)
            
            # Check if user has permission for resource
            if user.get("user_id") != request["params"]["user_id"]:
                if not check_permissions(user.get("user_id"), "admin"):
                    raise Exception("Unauthorized: Cannot access another user's data")
            
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("unauthorized", str(e).lower())
            
            # Security event should be logged
            mock_log_security.assert_called_once()
    
    @patch('python_app.api.auth.authenticate_user')
    @patch('python_app.api.auth.check_permissions')
    def test_admin_cross_account_access(self, mock_check_permissions, mock_authenticate):
        """Test authorized cross-account access by admin"""
        # Mock authentication to succeed
        mock_authenticate.return_value = {
            "authenticated": True,
            "user_id": "admin-user",
            "roles": ["admin"]
        }
        
        # Mock permission check to succeed for admin
        mock_check_permissions.return_value = True
        
        # Create request with different user ID
        request = {
            "headers": {"Authorization": "Bearer admin-token"},
            "params": {"user_id": "regular-user"}  # Different from authenticated user
        }
        
        # Try to access other user's data as admin
        user = authenticate_user(request)
        
        # Check if user has permission for resource
        has_permission = True
        if user.get("user_id") != request["params"]["user_id"]:
            has_permission = check_permissions(user.get("user_id"), "admin")
        
        # Admin should have permission
        self.assertTrue(has_permission)

def run_permission_error_tests():
    """Run all permission error tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestInvalidAPIKeys))
    suite.addTests(loader.loadTestsFromTestCase(TestInsufficientPermissions))
    suite.addTests(loader.loadTestsFromTestCase(TestUserMismatch))
    suite.addTests(loader.loadTestsFromTestCase(TestIPRestrictions))
    suite.addTests(loader.loadTestsFromTestCase(TestCrossAccountAccess))
    
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
    results = run_permission_error_tests()
    
    # Print results
    print(f"{Fore.CYAN}Permission Error Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")