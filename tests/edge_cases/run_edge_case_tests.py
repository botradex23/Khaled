"""
Edge Case Testing Framework for Cryptocurrency Trading Platform

This script orchestrates the execution of various edge case tests to ensure
the platform handles exceptional conditions gracefully.

Test categories:
1. API Failures
2. Invalid Inputs
3. Balance/Leverage Issues
4. Rapid Market Movements
5. Duplicate Orders/Signals
6. User Permission Errors
7. Service Downtime
"""

import os
import sys
import time
import json
import logging
import datetime
import argparse
from colorama import init, Fore, Style

# Initialize colorama for cross-platform colored terminal output
init()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("tests/edge_cases/edge_case_tests.log"),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("edge_case_tests")

# Ensure we can import modules from the project root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

# Import test modules for each category
try:
    from tests.edge_cases.api_failures import run_api_failure_tests
    from tests.edge_cases.invalid_inputs import run_invalid_input_tests
    from tests.edge_cases.balance_issues import run_balance_issue_tests
    from tests.edge_cases.market_movements import run_market_movement_tests
    from tests.edge_cases.duplicate_orders import run_duplicate_order_tests
    from tests.edge_cases.permission_errors import run_permission_error_tests
    from tests.edge_cases.service_downtime import run_service_downtime_tests
except ImportError as e:
    logger.error(f"Failed to import test modules: {e}")
    logger.info("These modules will be created as part of the implementation.")
    # Define placeholder functions to avoid errors
    def run_api_failure_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_invalid_input_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_balance_issue_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_market_movement_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_duplicate_order_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_permission_error_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}
    def run_service_downtime_tests(): return {"passed": 0, "failed": 0, "skipped": 0, "total": 0, "failures": []}

class EdgeCaseTestRunner:
    """Orchestrates the execution of all edge case tests"""
    
    def __init__(self):
        self.results = {
            "timestamp": datetime.datetime.now().isoformat(),
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0
            },
            "categories": {}
        }
    
    def run_all_tests(self):
        """Run all test categories"""
        logger.info(f"{Fore.CYAN}Starting Edge Case Test Suite{Style.RESET_ALL}")
        
        test_categories = [
            ("API Failures", run_api_failure_tests),
            ("Invalid Inputs", run_invalid_input_tests),
            ("Balance/Leverage Issues", run_balance_issue_tests),
            ("Rapid Market Movements", run_market_movement_tests),
            ("Duplicate Orders/Signals", run_duplicate_order_tests),
            ("User Permission Errors", run_permission_error_tests),
            ("Service Downtime", run_service_downtime_tests)
        ]
        
        for category_name, test_func in test_categories:
            self._run_test_category(category_name, test_func)
        
        self._summarize_results()
        self._save_results()
        
        return self.results
    
    def run_category(self, category):
        """Run tests for a specific category"""
        category_map = {
            "api": ("API Failures", run_api_failure_tests),
            "inputs": ("Invalid Inputs", run_invalid_input_tests),
            "balance": ("Balance/Leverage Issues", run_balance_issue_tests),
            "market": ("Rapid Market Movements", run_market_movement_tests),
            "duplicate": ("Duplicate Orders/Signals", run_duplicate_order_tests),
            "permission": ("User Permission Errors", run_permission_error_tests),
            "downtime": ("Service Downtime", run_service_downtime_tests)
        }
        
        if category not in category_map:
            logger.error(f"Unknown category: {category}")
            return
        
        category_name, test_func = category_map[category]
        self._run_test_category(category_name, test_func)
        self._summarize_results()
        self._save_results()
        
        return self.results
    
    def _run_test_category(self, category_name, test_func):
        """Run a specific test category and collect results"""
        logger.info(f"\n{Fore.YELLOW}Running {category_name} Tests{Style.RESET_ALL}")
        
        try:
            start_time = time.time()
            results = test_func()
            end_time = time.time()
            
            self.results["categories"][category_name] = {
                "passed": results["passed"],
                "failed": results["failed"],
                "skipped": results["skipped"],
                "total": results["total"],
                "duration": round(end_time - start_time, 2),
                "failures": results.get("failures", [])
            }
            
            self.results["summary"]["total_tests"] += results["total"]
            self.results["summary"]["passed"] += results["passed"]
            self.results["summary"]["failed"] += results["failed"]
            self.results["summary"]["skipped"] += results["skipped"]
            
            # Print category summary
            pass_rate = results["passed"] / results["total"] * 100 if results["total"] > 0 else 0
            logger.info(f"{category_name} Tests: {results['passed']}/{results['total']} passed ({pass_rate:.1f}%)")
            
            if results["failed"] > 0:
                logger.warning(f"{Fore.RED}Failed {results['failed']} tests in {category_name}{Style.RESET_ALL}")
                for failure in results.get("failures", []):
                    logger.warning(f"  - {failure}")
        
        except Exception as e:
            logger.error(f"Error running {category_name} tests: {e}")
            self.results["categories"][category_name] = {
                "error": str(e),
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "total": 0
            }
    
    def _summarize_results(self):
        """Print overall test summary"""
        total = self.results["summary"]["total_tests"]
        passed = self.results["summary"]["passed"]
        failed = self.results["summary"]["failed"]
        skipped = self.results["summary"]["skipped"]
        
        pass_rate = passed / total * 100 if total > 0 else 0
        
        logger.info(f"\n{Fore.CYAN}Edge Case Test Results Summary:{Style.RESET_ALL}")
        logger.info(f"Total Tests: {total}")
        logger.info(f"Passed: {Fore.GREEN}{passed}{Style.RESET_ALL} ({pass_rate:.1f}%)")
        logger.info(f"Failed: {Fore.RED}{failed}{Style.RESET_ALL}")
        logger.info(f"Skipped: {Fore.YELLOW}{skipped}{Style.RESET_ALL}")
        
        if failed > 0:
            logger.warning(f"\n{Fore.RED}The following tests failed:{Style.RESET_ALL}")
            for category, results in self.results["categories"].items():
                if results.get("failed", 0) > 0:
                    logger.warning(f"{Fore.YELLOW}{category}:{Style.RESET_ALL}")
                    for failure in results.get("failures", []):
                        logger.warning(f"  - {failure}")
    
    def _save_results(self):
        """Save test results to a JSON file"""
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"tests/edge_cases/results/edge_case_results_{timestamp}.json"
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w') as f:
            json.dump(self.results, f, indent=2)
        
        logger.info(f"Results saved to {filename}")

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description="Run edge case tests for the trading platform")
    parser.add_argument("--category", 
                        choices=["api", "inputs", "balance", "market", "duplicate", "permission", "downtime"],
                        help="Run tests for a specific category only")
    return parser.parse_args()

if __name__ == "__main__":
    args = parse_args()
    runner = EdgeCaseTestRunner()
    
    if args.category:
        runner.run_category(args.category)
    else:
        runner.run_all_tests()