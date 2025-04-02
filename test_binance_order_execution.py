#!/usr/bin/env python3
"""
Binance Order Execution Test

This script tests the Binance SDK's order execution capabilities by placing 
real buy and sell orders using the Binance Trading Service. It will:

1. Create a small buy order for a test cryptocurrency
2. Verify the buy order was successful
3. Create a corresponding sell order to close the position
4. Verify the sell order was successful

This script carefully uses small amounts to minimize financial impact,
and it logs all actions clearly to assist with troubleshooting.
"""

import os
import sys
import json
import time
import logging
import urllib.parse
from datetime import datetime
from typing import Dict, Any, Optional
import dotenv

# Load environment variables from .env file
dotenv.load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger()

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Create a simple active_config module substitute
class Config:
    def __init__(self):
        # Load values from environment
        self.USE_TESTNET = os.environ.get('USE_TESTNET', 'false').lower() in ('true', '1', 'yes')
        self.USE_PROXY = os.environ.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
        self.PROXY_IP = os.environ.get('PROXY_IP', '')
        self.PROXY_PORT = os.environ.get('PROXY_PORT', '')
        self.PROXY_USERNAME = os.environ.get('PROXY_USERNAME', '')
        self.PROXY_PASSWORD = os.environ.get('PROXY_PASSWORD', '')
        self.PROXY_PROTOCOL = os.environ.get('PROXY_PROTOCOL', 'http')
        self.PROXY_ENCODING_METHOD = os.environ.get('PROXY_ENCODING_METHOD', 'quote_plus')
        self.FALLBACK_TO_DIRECT = os.environ.get('FALLBACK_TO_DIRECT', 'true').lower() in ('true', '1', 'yes')
        self.BINANCE_API_KEY = os.environ.get('BINANCE_API_KEY', '')
        self.BINANCE_SECRET_KEY = os.environ.get('BINANCE_SECRET_KEY', '')
        self.BINANCE_BASE_URL = 'https://api.binance.com'
        self.BINANCE_TEST_URL = 'https://testnet.binance.vision'
        
active_config = Config()

# Import Binance SDK directly
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

# Import local modules
try:
    from python_app.services.binance.trading_service import BinanceTradingService
    from python_app.services.binance.market_service import BinanceMarketService
except ImportError as e:
    logger.error(f"Failed to import Binance services: {e}")
    logger.info("Trying alternative import paths...")
    
    try:
        sys.path.append(os.path.join(current_dir, 'python_app'))
        from services.binance.trading_service import BinanceTradingService
        from services.binance.market_service import BinanceMarketService
    except ImportError as e2:
        logger.error(f"Alternative import also failed: {e2}")
        
        # Continue with direct SDK implementation as fallback
        logger.info("Will use direct Binance SDK implementation as fallback")

class BinanceOrderTester:
    """
    Test class for executing and verifying Binance orders via SDK
    """
    
    def __init__(self, use_testnet: bool = True, paper_mode: bool = False):
        """
        Initialize the tester
        
        Args:
            use_testnet: Whether to use Binance testnet (sandbox)
            paper_mode: Whether to simulate trades instead of executing them
        """
        self.use_testnet = use_testnet
        self.paper_mode = paper_mode
        
        # Print environment info
        self._print_environment_info()
        
        # Initialize services
        logger.info(f"Initializing with testnet={use_testnet}, paper_mode={paper_mode}")
        self.trading_service = self._create_trading_service()
        self.market_service = self._create_market_service()
        
        # Test symbols and parameters
        self.test_symbol = "BTCUSDT"  # Test with BTC/USDT pair
        self.test_quantity = 0.001    # Very small BTC amount (~ $80)
        self.buy_order = None
        self.sell_order = None
    
    def _print_environment_info(self):
        """Display current environment settings"""
        logger.info("=== Environment Settings ===")
        logger.info(f"TESTNET enabled: {os.environ.get('USE_TESTNET', 'false')}")
        logger.info(f"PROXY enabled: {os.environ.get('USE_PROXY', 'false')}")
        
        # Check API key (without revealing it)
        api_key = os.environ.get('BINANCE_API_KEY', '')
        if api_key:
            # Show just first few and last few characters
            masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
            logger.info(f"API Key available: Yes ({masked_key})")
        else:
            logger.info("API Key available: No")
        
        # Check secret key (without revealing it)
        secret_key = os.environ.get('BINANCE_SECRET_KEY', '')
        logger.info(f"Secret Key available: {'Yes' if secret_key else 'No'}")
    
    def _create_trading_service(self) -> BinanceTradingService:
        """Create and return a Binance trading service"""
        try:
            service = BinanceTradingService(
                use_testnet=self.use_testnet,
                paper_mode=self.paper_mode,
                max_retries=3
            )
            logger.info(f"Binance Trading Service initialized (paper_mode={service.paper_mode})")
            return service
        except Exception as e:
            logger.error(f"Failed to create trading service: {e}")
            sys.exit(1)
    
    def _create_market_service(self) -> BinanceMarketService:
        """Create and return a Binance market service"""
        try:
            service = BinanceMarketService(
                use_testnet=self.use_testnet,
                max_retries=3
            )
            logger.info("Binance Market Service initialized")
            return service
        except Exception as e:
            logger.error(f"Failed to create market service: {e}")
            sys.exit(1)
    
    def check_account_balance(self) -> Dict[str, Any]:
        """
        Check account balance to verify API connectivity
        
        Returns:
            Dict with balance information
        """
        logger.info("Checking account balance...")
        try:
            account_info = self.trading_service.get_account_info()
            
            if self.paper_mode:
                logger.info("Using simulated paper trading account")
                return account_info
            
            # Extract and display balances
            if account_info and 'balances' in account_info:
                # Filter out zero balances
                non_zero_balances = [
                    balance for balance in account_info['balances'] 
                    if float(balance.get('free', 0)) > 0 or float(balance.get('locked', 0)) > 0
                ]
                
                # Display balances
                logger.info(f"Found {len(non_zero_balances)} non-zero balances")
                for balance in non_zero_balances[:5]:  # Show first 5
                    asset = balance.get('asset', '')
                    free = float(balance.get('free', 0))
                    locked = float(balance.get('locked', 0))
                    logger.info(f"{asset}: {free:.8f} (free) + {locked:.8f} (locked)")
                
                # Check if we have enough USDT for the test
                usdt_balance = next(
                    (float(balance.get('free', 0)) for balance in account_info['balances'] 
                     if balance.get('asset') == 'USDT'),
                    0
                )
                logger.info(f"USDT available for testing: {usdt_balance:.2f}")
                
                # Check if we have BTC to sell
                btc_balance = next(
                    (float(balance.get('free', 0)) for balance in account_info['balances'] 
                     if balance.get('asset') == 'BTC'),
                    0
                )
                logger.info(f"BTC available for testing: {btc_balance:.8f}")
                
                return account_info
            else:
                logger.warning("Could not retrieve balance information")
                return {}
                
        except Exception as e:
            logger.error(f"Error checking account balance: {e}")
            return {}
    
    def get_current_price(self, symbol: str) -> Optional[float]:
        """
        Get current price for a symbol
        
        Args:
            symbol: Trading pair symbol
            
        Returns:
            Current price or None if error
        """
        try:
            ticker = self.market_service.get_ticker_price(symbol)
            price = float(ticker['price']) if ticker and 'price' in ticker else None
            
            if price:
                logger.info(f"Current {symbol} price: ${price:,.2f}")
            else:
                logger.warning(f"Could not get current price for {symbol}")
            
            return price
        except Exception as e:
            logger.error(f"Error getting {symbol} price: {e}")
            return None
    
    def execute_buy_order(self) -> bool:
        """
        Execute a small buy order for the test symbol
        
        Returns:
            True if order was successful, False otherwise
        """
        logger.info(f"=== Executing BUY order for {self.test_symbol} ===")
        
        # Get current price to estimate order value
        current_price = self.get_current_price(self.test_symbol)
        if not current_price:
            logger.error("Cannot proceed without current price")
            return False
        
        # Calculate order value
        order_value = current_price * self.test_quantity
        logger.info(f"Order value: ${order_value:.2f} ({self.test_quantity} {self.test_symbol})")
        
        # Execute the buy order
        try:
            result = self.trading_service.execute_trade(
                symbol=self.test_symbol,
                side="BUY",
                quantity=self.test_quantity,
                order_type="MARKET"
            )
            
            # Log the full result as JSON
            logger.info(f"Order result: {json.dumps(result, indent=2)}")
            
            # Check for success
            if result.get('success', False):
                logger.info(f"BUY order executed successfully")
                # Store order info for selling later
                self.buy_order = result
                return True
            else:
                logger.error(f"BUY order failed: {result.get('message', 'Unknown error')}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing BUY order: {e}")
            return False
    
    def execute_sell_order(self) -> bool:
        """
        Execute a sell order to close the position from the buy order
        
        Returns:
            True if order was successful, False otherwise
        """
        logger.info(f"=== Executing SELL order for {self.test_symbol} ===")
        
        # Get current price
        current_price = self.get_current_price(self.test_symbol)
        if not current_price:
            logger.error("Cannot proceed without current price")
            return False
        
        # If we have a buy position, use its info
        position_id = self.buy_order.get('position_id') if self.buy_order else None
        
        # Execute the sell order
        try:
            result = self.trading_service.execute_trade(
                symbol=self.test_symbol,
                side="SELL",
                quantity=self.test_quantity,
                order_type="MARKET",
                position_id=position_id
            )
            
            # Log the full result as JSON
            logger.info(f"Order result: {json.dumps(result, indent=2)}")
            
            # Check for success
            if result.get('success', False):
                logger.info(f"SELL order executed successfully")
                # Store order info
                self.sell_order = result
                return True
            else:
                logger.error(f"SELL order failed: {result.get('message', 'Unknown error')}")
                return False
                
        except Exception as e:
            logger.error(f"Error executing SELL order: {e}")
            return False
    
    def run_order_test(self) -> bool:
        """
        Run the complete order test (buy and sell)
        
        Returns:
            True if all tests passed, False otherwise
        """
        logger.info("Starting Binance order execution test...")
        
        # Check account first
        account_info = self.check_account_balance()
        if not account_info:
            logger.error("Cannot proceed without account information")
            return False
        
        # Execute buy order
        if not self.execute_buy_order():
            logger.error("BUY order test failed")
            return False
        
        # Wait a moment between orders
        logger.info("Waiting 3 seconds between orders...")
        time.sleep(3)
        
        # Execute sell order
        if not self.execute_sell_order():
            logger.error("SELL order test failed")
            return False
        
        # Success!
        logger.info("🎉 Order execution test completed successfully! 🎉")
        logger.info(f"BUY and SELL orders for {self.test_symbol} executed correctly")
        
        return True

def main():
    """Main function"""
    logger.info("=== Binance Order Execution Test ===")
    
    # Parse command-line arguments
    use_testnet = True  # Default to testnet for safety
    paper_mode = False  # Default to real orders for proper testing
    
    # Create and run the tester
    tester = BinanceOrderTester(use_testnet=use_testnet, paper_mode=paper_mode)
    tester.run_order_test()
    
if __name__ == "__main__":
    main()