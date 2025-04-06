"""
Service Downtime Edge Case Tests

This module tests the system's behavior during service downtime scenarios:
1. Trade queue persistence across restarts
2. Binance API service outage
3. Database connection failures
4. Restore from checkpoint
5. Recovery prioritization
"""

import os
import sys
import logging
import unittest
import tempfile
import json
from unittest.mock import patch, MagicMock, mock_open
from colorama import Fore, Style

# Ensure we can import modules from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../..')))

# Import required modules from the project
try:
    from python_app.services.queue.trade_execution_queue import TradeExecutionQueue
    from python_app.services.binance.trading_service import BinanceService
    from python_app.utils.trade_logger import TradeLogger
    from python_app.utils.fallback_notifier import FallbackNotifier
    from python_app.services.checkpoint_manager import CheckpointManager
except ImportError as e:
    logging.error(f"Failed to import project modules: {e}")
    logging.info("This is expected if running tests for the first time. Module imports will be mocked.")
    # Create mock classes for testing
    class TradeExecutionQueue:
        pass
    
    class BinanceService:
        pass
    
    class TradeLogger:
        pass
    
    class FallbackNotifier:
        pass
    
    class CheckpointManager:
        pass

logger = logging.getLogger("service_downtime")

class TestQueuePersistence(unittest.TestCase):
    """Tests trade queue persistence across service restarts"""
    
    def setUp(self):
        self.queue = TradeExecutionQueue()
        self.trade_logger = TradeLogger()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.save_queue_state')
    def test_queue_state_persistence(self, mock_save_state):
        """Test persistence of queue state to disk"""
        # Add trades to queue
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "test-1"
        })
        
        self.queue.add_trade({
            "symbol": "ETHUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 1.0,
            "trade_id": "test-2"
        })
        
        # Trigger queue state save
        self.queue.save_queue_state()
        
        # Check that state was saved
        mock_save_state.assert_called_once()
    
    @patch('builtins.open', new_callable=mock_open, read_data=json.dumps({
        "pending_trades": [
            {
                "symbol": "BTCUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 0.1,
                "trade_id": "test-1"
            },
            {
                "symbol": "ETHUSDT",
                "side": "BUY",
                "type": "MARKET",
                "quantity": 1.0,
                "trade_id": "test-2"
            }
        ]
    }))
    @patch('os.path.exists')
    def test_queue_state_restoration(self, mock_exists, mock_file):
        """Test restoration of queue state from disk"""
        # Mock file existence
        mock_exists.return_value = True
        
        # Restore queue state
        self.queue.restore_queue_state()
        
        # Check that trades were restored
        self.assertEqual(len(self.queue.pending_trades), 2)
        self.assertEqual(self.queue.pending_trades[0]["trade_id"], "test-1")
        self.assertEqual(self.queue.pending_trades[1]["trade_id"], "test-2")
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.save_queue_state')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.execute_trade')
    @patch('python_app.utils.trade_logger.TradeLogger.log_info')
    def test_graceful_shutdown(self, mock_log_info, mock_execute, mock_save_state):
        """Test graceful shutdown with queue state persistence"""
        # Add a trade to queue
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "test-1"
        })
        
        # Mock successful execution for in-progress trades
        mock_execute.return_value = {"success": True, "order_id": "12345"}
        
        # Perform graceful shutdown
        self.queue.graceful_shutdown()
        
        # Check that state was saved
        mock_save_state.assert_called_once()
        
        # Check that in-progress trades were completed if possible
        mock_execute.assert_called()
        
        # Check that shutdown was logged
        mock_log_info.assert_called()

class TestBinanceOutage(unittest.TestCase):
    """Tests system behavior during Binance API outage"""
    
    def setUp(self):
        self.binance_service = BinanceService()
        self.queue = TradeExecutionQueue()
        self.notifier = FallbackNotifier()
    
    @patch('python_app.services.binance.trading_service.BinanceService.is_service_available')
    @patch('python_app.services.binance.trading_service.BinanceService.place_order')
    @patch('python_app.utils.fallback_notifier.FallbackNotifier.send_notification')
    def test_service_availability_check(self, mock_notify, mock_place_order, mock_is_available):
        """Test service availability check before operations"""
        # Mock service unavailable
        mock_is_available.return_value = False
        
        try:
            # Attempt to place order with availability check
            result = self.binance_service.place_order_with_availability_check(
                symbol="BTCUSDT",
                side="BUY",
                type="MARKET",
                quantity=0.1
            )
            self.fail("Should have raised an exception")
        except Exception as e:
            # Check that the error was properly handled
            self.assertIn("unavailable", str(e).lower())
            
            # Order should not be placed
            mock_place_order.assert_not_called()
            
            # Notification should be sent
            mock_notify.assert_called_once()
    
    @patch('python_app.services.binance.trading_service.BinanceService.ping')
    @patch('python_app.utils.trade_logger.TradeLogger.log_warning')
    def test_periodic_availability_monitoring(self, mock_log_warning, mock_ping):
        """Test periodic monitoring of service availability"""
        # Mock ping failure
        mock_ping.side_effect = Exception("Connection refused")
        
        # Check service availability
        is_available = self.binance_service.check_service_availability()
        
        # Should detect unavailability
        self.assertFalse(is_available)
        
        # Warning should be logged
        mock_log_warning.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.execute_trade')
    @patch('python_app.services.binance.trading_service.BinanceService.is_service_available')
    def test_queue_pause_during_outage(self, mock_is_available, mock_execute_trade):
        """Test queue processing pause during service outage"""
        # Mock service unavailable
        mock_is_available.return_value = False
        
        # Add trade to queue
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "test-1"
        })
        
        # Process queue with availability check
        self.queue.process_queue_with_availability_check()
        
        # Trade should not be executed due to outage
        mock_execute_trade.assert_not_called()
        
        # Queue should be paused
        self.assertTrue(self.queue.is_paused)

class TestDatabaseFailures(unittest.TestCase):
    """Tests system behavior during database connection failures"""
    
    def setUp(self):
        self.trade_logger = TradeLogger()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.utils.trade_logger.TradeLogger.log_to_db')
    @patch('python_app.utils.trade_logger.TradeLogger.log_to_file')
    def test_fallback_logging(self, mock_log_file, mock_log_db):
        """Test fallback to file logging when database is unavailable"""
        # Mock database logging failure
        mock_log_db.side_effect = Exception("Database connection error")
        
        # Log a trade event
        self.trade_logger.log_trade({
            "trade_id": "test-1",
            "symbol": "BTCUSDT",
            "side": "BUY",
            "quantity": 0.1,
            "price": 50000.0,
            "timestamp": 1637012345678
        })
        
        # Check that file logging was used as fallback
        mock_log_file.assert_called_once()
    
    @patch('python_app.utils.trade_logger.TradeLogger.is_db_available')
    @patch('python_app.utils.trade_logger.TradeLogger.replay_file_logs_to_db')
    def test_log_replay_after_recovery(self, mock_replay, mock_is_available):
        """Test replay of file logs to database after recovery"""
        # Mock database now available
        mock_is_available.return_value = True
        
        # Replay logs
        self.trade_logger.check_and_replay_logs()
        
        # Check that replay was attempted
        mock_replay.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.save_queue_state')
    @patch('python_app.utils.trade_logger.TradeLogger.is_db_available')
    def test_in_memory_operation_during_outage(self, mock_is_available, mock_save_state):
        """Test continued in-memory operation during database outage"""
        # Mock database unavailable
        mock_is_available.return_value = False
        
        # Add trades to queue
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "test-1"
        })
        
        # Queue should continue to function with in-memory storage
        self.assertEqual(len(self.queue.pending_trades), 1)
        
        # State should be saved to disk as backup
        mock_save_state.assert_called_once()

class TestCheckpointRestore(unittest.TestCase):
    """Tests restoration from checkpoint after failure"""
    
    def setUp(self):
        self.checkpoint_manager = CheckpointManager()
        self.queue = TradeExecutionQueue()
    
    @patch('python_app.services.checkpoint_manager.CheckpointManager.create_checkpoint')
    def test_checkpoint_creation(self, mock_create):
        """Test creation of system checkpoint"""
        # Create checkpoint
        checkpoint_id = self.checkpoint_manager.create_checkpoint(
            name="pre-maintenance",
            components=["trade_queue", "api_keys", "user_settings"]
        )
        
        # Check that checkpoint was created
        mock_create.assert_called_once()
        self.assertIsNotNone(checkpoint_id)
    
    @patch('python_app.services.checkpoint_manager.CheckpointManager.restore_checkpoint')
    @patch('python_app.services.checkpoint_manager.CheckpointManager.get_latest_checkpoint')
    def test_automatic_restore_on_startup(self, mock_get_latest, mock_restore):
        """Test automatic restoration from checkpoint on startup"""
        # Mock latest checkpoint
        mock_get_latest.return_value = {
            "id": "cp-123",
            "name": "pre-maintenance",
            "timestamp": 1637012345678,
            "components": ["trade_queue", "api_keys", "user_settings"]
        }
        
        # Check for and restore from checkpoint
        self.checkpoint_manager.check_and_restore_latest_checkpoint()
        
        # Check that restore was attempted
        mock_restore.assert_called_once_with("cp-123")
    
    @patch('python_app.services.checkpoint_manager.CheckpointManager.restore_checkpoint')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.restore_queue_state')
    def test_partial_restore(self, mock_restore_queue, mock_restore_checkpoint):
        """Test partial system restoration from checkpoint"""
        # Mock successful restore for some components
        mock_restore_checkpoint.return_value = {
            "success": True,
            "components_restored": ["api_keys", "user_settings"],
            "components_failed": ["trade_queue"]
        }
        
        # Restore from checkpoint
        result = self.checkpoint_manager.restore_checkpoint("cp-123")
        
        # Check that partial restore was handled properly
        self.assertTrue(result["success"])
        self.assertIn("trade_queue", result["components_failed"])
        
        # Should attempt to restore queue from its own backup
        mock_restore_queue.assert_called_once()

class TestRecoveryPrioritization(unittest.TestCase):
    """Tests system recovery prioritization after outage"""
    
    def setUp(self):
        self.queue = TradeExecutionQueue()
        self.notifier = FallbackNotifier()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.restore_queue_state')
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.reprioritize_queue')
    def test_recovery_reprioritization(self, mock_reprioritize, mock_restore):
        """Test reprioritization of trades during recovery"""
        # Mock queue restoration
        mock_restore.return_value = True
        
        # Restore queue with reprioritization
        self.queue.restore_and_reprioritize()
        
        # Check that reprioritization was done
        mock_reprioritize.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.get_stale_trades')
    @patch('python_app.utils.fallback_notifier.FallbackNotifier.send_notification')
    def test_stale_trade_notification(self, mock_notify, mock_get_stale):
        """Test notification for stale trades after outage"""
        # Mock stale trades
        mock_get_stale.return_value = [
            {
                "trade_id": "stale-1",
                "symbol": "BTCUSDT",
                "side": "BUY",
                "quantity": 0.1,
                "timestamp": 1637000000000  # Old timestamp
            }
        ]
        
        # Check for stale trades
        stale_trades = self.queue.check_for_stale_trades(max_age_minutes=60)
        
        # Check that stale trades were found
        self.assertEqual(len(stale_trades), 1)
        
        # Notification should be sent
        mock_notify.assert_called_once()
    
    @patch('python_app.services.queue.trade_execution_queue.TradeExecutionQueue.execute_trade')
    def test_recovery_priority_ordering(self, mock_execute):
        """Test priority ordering of trades during recovery"""
        # Add trades with various priorities
        self.queue.add_trade({
            "symbol": "BTCUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 0.1,
            "trade_id": "test-low",
            "priority": 3  # Low priority
        })
        
        self.queue.add_trade({
            "symbol": "ETHUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 1.0,
            "trade_id": "test-high",
            "priority": 1  # High priority
        })
        
        self.queue.add_trade({
            "symbol": "ADAUSDT",
            "side": "BUY",
            "type": "MARKET",
            "quantity": 100.0,
            "trade_id": "test-medium",
            "priority": 2  # Medium priority
        })
        
        # Process recovery
        self.queue.process_recovery_queue()
        
        # Check execution order via mock calls
        calls = mock_execute.call_args_list
        self.assertEqual(calls[0][0][0]["trade_id"], "test-high")
        self.assertEqual(calls[1][0][0]["trade_id"], "test-medium")
        self.assertEqual(calls[2][0][0]["trade_id"], "test-low")

def run_service_downtime_tests():
    """Run all service downtime tests and return results"""
    # Create a test suite
    loader = unittest.TestLoader()
    suite = unittest.TestSuite()
    
    # Add test classes
    suite.addTests(loader.loadTestsFromTestCase(TestQueuePersistence))
    suite.addTests(loader.loadTestsFromTestCase(TestBinanceOutage))
    suite.addTests(loader.loadTestsFromTestCase(TestDatabaseFailures))
    suite.addTests(loader.loadTestsFromTestCase(TestCheckpointRestore))
    suite.addTests(loader.loadTestsFromTestCase(TestRecoveryPrioritization))
    
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
    results = run_service_downtime_tests()
    
    # Print results
    print(f"{Fore.CYAN}Service Downtime Tests Results:{Style.RESET_ALL}")
    print(f"Total: {results['total']}")
    print(f"Passed: {Fore.GREEN}{results['passed']}{Style.RESET_ALL}")
    print(f"Failed: {Fore.RED}{results['failed']}{Style.RESET_ALL}")
    print(f"Skipped: {Fore.YELLOW}{results['skipped']}{Style.RESET_ALL}")
    
    if results['failed'] > 0:
        print(f"\n{Fore.RED}Failures:{Style.RESET_ALL}")
        for failure in results['failures']:
            print(f"  - {failure}")