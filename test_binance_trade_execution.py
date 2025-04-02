#!/usr/bin/env python3
"""
Test Binance Trade Execution

This script tests the Binance trade execution functionality using the BinanceTradingService
and the provided test API credentials. It performs a small test order in the testnet environment.
"""

import os
import sys
import logging
import urllib.parse
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger()

# Add current directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# First, try to import the BinanceTradingService
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
        sys.exit(1)

def show_environment_settings():
    """Display current environment settings for diagnosis"""
    logger.info("=== Environment Settings ===")
    
    # Check API keys (masking for security)
    api_key = os.environ.get('BINANCE_API_KEY', '')
    api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
    
    logger.info(f"BINANCE_API_KEY: {'✓ Set' if api_key else '✗ Not set'}")
    if api_key:
        # Show masked version for verification
        masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "***"
        logger.info(f"API Key (masked): {masked_key}")
    
    logger.info(f"BINANCE_SECRET_KEY: {'✓ Set' if api_secret else '✗ Not set'}")
    
    # Check testnet setting
    use_testnet = os.environ.get('USE_TESTNET', 'false').lower() in ('true', '1', 'yes')
    logger.info(f"USE_TESTNET: {'✓ Enabled' if use_testnet else '✗ Disabled'}")
    
    # Check proxy settings
    use_proxy = os.environ.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    proxy_ip = os.environ.get('PROXY_IP', '')
    proxy_port = os.environ.get('PROXY_PORT', '')
    
    logger.info(f"USE_PROXY: {'✓ Enabled' if use_proxy else '✗ Disabled'}")
    if use_proxy:
        logger.info(f"PROXY_IP: {proxy_ip}")
        logger.info(f"PROXY_PORT: {proxy_port}")
    
    logger.info("")

def test_get_account(trading_service):
    """Test retrieving account information"""
    logger.info("Testing get_account...")
    
    try:
        account_info = trading_service.client.account()
        
        if account_info:
            balances = account_info.get('balances', [])
            non_zero_balances = [b for b in balances if float(b.get('free', 0)) > 0 or float(b.get('locked', 0)) > 0]
            
            logger.info(f"Successfully retrieved account info with {len(balances)} assets")
            logger.info(f"Number of non-zero balances: {len(non_zero_balances)}")
            
            # Show a few non-zero balances for verification
            for balance in non_zero_balances[:5]:  # Show up to 5 assets
                asset = balance.get('asset', '')
                free = float(balance.get('free', 0))
                locked = float(balance.get('locked', 0))
                logger.info(f"  {asset}: Free={free}, Locked={locked}")
            
            return True
        else:
            logger.error("Empty response from account info endpoint")
            return False
            
    except Exception as e:
        logger.error(f"Error retrieving account info: {e}")
        return False

def test_market_data(market_service):
    """Test retrieving market data"""
    logger.info("Testing market data retrieval...")
    
    try:
        # Get price for BTC and ETH
        btc_price = market_service.get_symbol_price('BTCUSDT')
        eth_price = market_service.get_symbol_price('ETHUSDT')
        
        if btc_price and 'price' in btc_price:
            logger.info(f"BTC price: ${float(btc_price['price']):.2f}")
        else:
            logger.warning("Failed to retrieve BTC price")
        
        if eth_price and 'price' in eth_price:
            logger.info(f"ETH price: ${float(eth_price['price']):.2f}")
        else:
            logger.warning("Failed to retrieve ETH price")
        
        # Get 24hr ticker for BTC
        btc_ticker = market_service.get_24hr_ticker('BTCUSDT')
        if btc_ticker:
            if isinstance(btc_ticker, list) and len(btc_ticker) > 0:
                btc_ticker = btc_ticker[0]
            
            logger.info(f"BTC 24hr change: {btc_ticker.get('priceChangePercent', 'N/A')}%")
            logger.info(f"BTC 24hr volume: {btc_ticker.get('volume', 'N/A')} BTC")
        else:
            logger.warning("Failed to retrieve BTC 24hr ticker")
        
        return True if btc_price and 'price' in btc_price else False
            
    except Exception as e:
        logger.error(f"Error retrieving market data: {e}")
        return False

def test_execute_paper_trade(trading_service):
    """Test executing a paper trade"""
    logger.info("Testing paper trade execution...")
    
    try:
        # Execute a paper trade (BUY small amount of BTC)
        result = trading_service.execute_trade(
            symbol='BTCUSDT',
            side='BUY',
            quantity=0.001,  # Very small amount
            order_type='MARKET'
        )
        
        if result.get('success', False):
            logger.info(f"Paper trade executed successfully: {result.get('message', '')}")
            
            # Check if the position is tracked
            if trading_service.positions:
                position = trading_service.positions[-1]
                logger.info(f"Position ID: {position.get('id')}")
                logger.info(f"Entry price: {position.get('entry_price')}")
                
                # Try to close the position
                position_id = position.get('id')
                if position_id:
                    close_result = trading_service.close_position(
                        symbol='BTCUSDT',
                        position_id=position_id,
                        reason="Test close"
                    )
                    
                    if close_result.get('success', False):
                        logger.info("Successfully closed paper position")
                    else:
                        logger.warning(f"Failed to close paper position: {close_result.get('message', '')}")
            
            return True
        else:
            logger.error(f"Failed to execute paper trade: {result.get('message', '')}")
            return False
            
    except Exception as e:
        logger.error(f"Error executing paper trade: {e}")
        return False

def test_small_real_trade(trading_service):
    """
    Test executing a small real trade in testnet
    
    IMPORTANT: This will only work in testnet mode with valid API credentials.
    It places a real order using the Binance SDK but only in the testnet environment.
    """
    if trading_service.paper_mode:
        logger.warning("Skipping real trade test - service is in paper mode")
        return False
    
    if not trading_service.use_testnet:
        logger.warning("Skipping real trade test - not using testnet")
        return False
    
    logger.info("Testing small real trade execution in testnet...")
    
    try:
        # First, check if we have enough balance
        try:
            account_info = trading_service.client.account()
            usdt_balance = next((float(b['free']) for b in account_info.get('balances', []) 
                               if b['asset'] == 'USDT'), 0)
            
            logger.info(f"USDT balance: {usdt_balance}")
            
            if usdt_balance < 10:
                logger.warning("Insufficient USDT balance for test order")
                return False
                
        except Exception as e:
            logger.error(f"Could not check balance: {e}")
            return False
        
        # Execute a market order to buy a very small amount of BTC
        # For testnet, we'll use a smaller quantity to avoid insufficient balance issues
        order_result = trading_service.client.new_order(
            symbol='BTCUSDT',
            side='BUY',
            type='MARKET',
            quantity=0.001  # Very small amount
        )
        
        if order_result:
            logger.info("Successfully placed real test order in testnet!")
            logger.info(f"Order ID: {order_result.get('orderId')}")
            logger.info(f"Status: {order_result.get('status')}")
            
            if 'fills' in order_result:
                for fill in order_result['fills']:
                    logger.info(f"Fill price: {fill.get('price')}, Quantity: {fill.get('qty')}")
            
            # Let's place a sell order to close the position
            try:
                sell_result = trading_service.client.new_order(
                    symbol='BTCUSDT',
                    side='SELL',
                    type='MARKET',
                    quantity=0.001  # Same as buy quantity
                )
                
                if sell_result:
                    logger.info("Successfully closed the test position!")
                    logger.info(f"Sell order ID: {sell_result.get('orderId')}")
                
            except Exception as se:
                logger.warning(f"Could not place sell order: {se}")
            
            return True
        else:
            logger.error("Empty response from order placement")
            return False
            
    except Exception as e:
        logger.error(f"Error placing real test order: {e}")
        return False

def main():
    """Run all tests"""
    logger.info("=== Binance Trade Execution Test ===")
    
    # Force environment variables for proxy
    os.environ['USE_PROXY'] = 'true'
    os.environ['FALLBACK_TO_DIRECT'] = 'false'
    os.environ['USE_TESTNET'] = 'true'
    
    # Show environment settings
    show_environment_settings()
    
    # Create a market service instance with environment variables
    market_service = BinanceMarketService(use_testnet=True)
    
    # Test market data retrieval
    market_success = test_market_data(market_service)
    if not market_success:
        logger.warning("Market data test failed, but continuing...")
    
    # First test with paper trading mode (safest)
    logger.info("\n--- Testing with Paper Trading Mode ---")
    paper_trading_service = BinanceTradingService(
        use_testnet=True,
        paper_mode=True
    )
    
    # Test account info
    account_success = test_get_account(paper_trading_service)
    if not account_success:
        logger.warning("Account info test failed, but continuing...")
    
    # Test paper trade execution
    paper_trade_success = test_execute_paper_trade(paper_trading_service)
    
    # Now test real trading with testnet (only if explicitly allowed)
    use_testnet = os.environ.get('USE_TESTNET', 'false').lower() in ('true', '1', 'yes')
    allow_real_test = os.environ.get('ALLOW_REAL_TEST', 'false').lower() in ('true', '1', 'yes')
    
    real_trade_success = False
    if use_testnet and allow_real_test:
        logger.info("\n--- Testing with Real Trading Mode (Testnet) ---")
        real_trading_service = BinanceTradingService(
            use_testnet=True,
            paper_mode=False
        )
        
        # Test small real trade
        real_trade_success = test_small_real_trade(real_trading_service)
    else:
        logger.info("\nSkipping real trade test - testnet not enabled or real testing not allowed")
        logger.info("Set both USE_TESTNET=true and ALLOW_REAL_TEST=true to enable")
    
    # Display results
    logger.info("\n=== Test Results ===")
    logger.info(f"Market Data Test:   {'✓ PASSED' if market_success else '✗ FAILED'}")
    logger.info(f"Account Info Test:  {'✓ PASSED' if account_success else '✗ FAILED'}")
    logger.info(f"Paper Trade Test:   {'✓ PASSED' if paper_trade_success else '✗ FAILED'}")
    
    if use_testnet and allow_real_test:
        logger.info(f"Real Trade Test:    {'✓ PASSED' if real_trade_success else '✗ FAILED'}")
    else:
        logger.info("Real Trade Test:    ⚠ SKIPPED")
    
    # Summary
    logger.info("\nTests completed!")

if __name__ == "__main__":
    main()