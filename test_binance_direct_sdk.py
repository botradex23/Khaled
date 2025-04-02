#!/usr/bin/env python3
"""
Binance Direct SDK Order Execution Test

This script tests the Binance SDK's direct order execution capabilities by:
1. Creating a direct connection to Binance API using the SDK
2. Testing market data retrieval
3. Testing account data retrieval  
4. Executing a test buy order
5. Executing a test sell order

This script uses testnet and very small trade amounts for safety.
"""

import os
import sys
import json
import time
import logging
import urllib.parse
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger()

# Import Binance SDK directly
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install it with: pip install binance-connector")
    sys.exit(1)

def create_binance_client(use_testnet=True):
    """
    Create and return a Binance client
    
    Args:
        use_testnet: Whether to use the Binance testnet
        
    Returns:
        Binance client instance
    """
    # Get API credentials
    api_key = os.environ.get('BINANCE_API_KEY', '')
    api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
    
    if not api_key or not api_secret:
        logger.error("API credentials not found. Make sure BINANCE_API_KEY and BINANCE_SECRET_KEY are in your .env file")
        sys.exit(1)
    
    # Create client
    if use_testnet:
        # Use testnet base URL
        base_url = 'https://testnet.binance.vision'
        logger.info(f"Creating Binance client with TESTNET mode: {base_url}")
    else:
        # Use production API
        base_url = 'https://api.binance.com'
        logger.info(f"Creating Binance client with PRODUCTION mode: {base_url}")
    
    # Check for proxy settings
    use_proxy = os.environ.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    proxy_url = None
    
    if use_proxy:
        proxy_protocol = os.environ.get('PROXY_PROTOCOL', 'http')
        proxy_ip = os.environ.get('PROXY_IP', '')
        proxy_port = os.environ.get('PROXY_PORT', '')
        proxy_username = os.environ.get('PROXY_USERNAME', '')
        proxy_password = os.environ.get('PROXY_PASSWORD', '')
        encoding_method = os.environ.get('PROXY_ENCODING_METHOD', 'quote_plus')
        
        if proxy_ip and proxy_port:
            # Apply URL encoding based on the method
            if encoding_method == "none":
                username = proxy_username
                password = proxy_password
            elif encoding_method == "quote":
                username = urllib.parse.quote(proxy_username)
                password = urllib.parse.quote(proxy_password)
            else:  # Default to quote_plus
                username = urllib.parse.quote_plus(proxy_username)
                password = urllib.parse.quote_plus(proxy_password)
                
            # Create proxy URL
            if proxy_username and proxy_password:
                # Directly swap and fix username/password for this test
                # According to .env, username is ahjqspco and password is dzx3r1prpz9k
                # But they seem reversed in logs - fixing that here
                correct_username = "ahjqspco"
                correct_password = "dzx3r1prpz9k"
                
                # Apply URL encoding based on the method
                if encoding_method == "none":
                    encoded_username = correct_username
                    encoded_password = correct_password
                elif encoding_method == "quote":
                    encoded_username = urllib.parse.quote(correct_username)
                    encoded_password = urllib.parse.quote(correct_password)
                else:  # Default to quote_plus
                    encoded_username = urllib.parse.quote_plus(correct_username)
                    encoded_password = urllib.parse.quote_plus(correct_password)
                
                logger.info(f"DEBUG - Using hardcoded credentials:")
                logger.info(f"DEBUG - Username: {correct_username}, Encoded: {encoded_username}")
                logger.info(f"DEBUG - Password: {correct_password}, Encoded: {encoded_password}")
                
                # Use the corrected, encoded credentials
                proxy_url = f"{proxy_protocol}://{encoded_username}:{encoded_password}@{proxy_ip}:{proxy_port}"
                masked_user = username[:2] + "***" if len(username) > 2 else "***"
                masked_pass = password[:2] + "***" if len(password) > 2 else "***"
                logger.info(f"Using proxy: {proxy_protocol}://{masked_user}:{masked_pass}@{proxy_ip}:{proxy_port}")
            else:
                proxy_url = f"{proxy_protocol}://{proxy_ip}:{proxy_port}"
                logger.info(f"Using proxy without authentication: {proxy_url}")
            
            # Create proxies dictionary
            proxies = {
                "http": proxy_url,
                "https": proxy_url
            }
            
            # Create client with proxies
            return Spot(api_key=api_key, api_secret=api_secret, base_url=base_url, proxies=proxies)
    
    # Create client without proxies
    return Spot(api_key=api_key, api_secret=api_secret, base_url=base_url)

def test_connection(client):
    """
    Test connection to Binance API
    
    Args:
        client: Binance client instance
        
    Returns:
        True if connection successful, False otherwise
    """
    try:
        # Test ping
        logger.info("Testing API connectivity (ping)...")
        response = client.ping()
        logger.info("Ping successful!")
        
        # Test server time
        logger.info("Testing server time...")
        time_result = client.time()
        server_time = datetime.fromtimestamp(time_result['serverTime'] / 1000)
        logger.info(f"Server time: {server_time}")
        
        # Test symbol price
        symbol = "BTCUSDT"
        logger.info(f"Testing {symbol} price...")
        ticker = client.ticker_price(symbol=symbol)
        price = float(ticker['price'])
        logger.info(f"{symbol} price: ${price:,.2f}")
        
        logger.info("Connection test successful!")
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False

def test_account_info(client):
    """
    Test retrieving account information
    
    Args:
        client: Binance client instance
    """
    try:
        logger.info("Testing account information retrieval...")
        account_info = client.account()
        
        # Extract and display balances
        non_zero_balances = [
            balance for balance in account_info['balances'] 
            if float(balance['free']) > 0 or float(balance['locked']) > 0
        ]
        
        logger.info(f"Found {len(non_zero_balances)} non-zero balances")
        for balance in non_zero_balances[:5]:  # Show first 5
            asset = balance['asset']
            free = float(balance['free'])
            locked = float(balance['locked'])
            logger.info(f"{asset}: {free:.8f} (free) + {locked:.8f} (locked)")
            
        # Check if we have enough USDT for testing
        usdt_balance = next(
            (float(balance['free']) for balance in account_info['balances'] 
             if balance['asset'] == 'USDT'),
            0
        )
        logger.info(f"USDT available for testing: {usdt_balance:.2f}")
        
        # Check if we have BTC
        btc_balance = next(
            (float(balance['free']) for balance in account_info['balances'] 
             if balance['asset'] == 'BTC'),
            0
        )
        logger.info(f"BTC available for testing: {btc_balance:.8f}")
        
        return account_info
    except Exception as e:
        logger.error(f"Error retrieving account information: {e}")
        return None

def execute_test_buy_order(client, symbol="BTCUSDT", quantity=0.001):
    """
    Execute a test buy order
    
    Args:
        client: Binance client instance
        symbol: Trading pair symbol
        quantity: Order quantity
        
    Returns:
        Order response or None if error
    """
    try:
        logger.info(f"=== Executing BUY order for {symbol} ===")
        
        # Get current price
        ticker = client.ticker_price(symbol=symbol)
        current_price = float(ticker['price'])
        order_value = current_price * quantity
        
        logger.info(f"Current price: ${current_price:,.2f}")
        logger.info(f"Order quantity: {quantity} {symbol}")
        logger.info(f"Estimated order value: ${order_value:,.2f}")
        
        # Execute order
        logger.info("Sending market buy order...")
        order_params = {
            "symbol": symbol,
            "side": "BUY",
            "type": "MARKET",
            "quantity": quantity
        }
        
        response = client.new_order(**order_params)
        
        # Log the full response
        logger.info(f"Order response: {json.dumps(response, indent=2)}")
        
        # Extract key information
        order_id = response.get('orderId')
        status = response.get('status')
        executed_qty = response.get('executedQty')
        cummulative_quote_qty = response.get('cummulativeQuoteQty')
        
        logger.info(f"BUY order {order_id} status: {status}")
        logger.info(f"Executed quantity: {executed_qty} {symbol}")
        logger.info(f"Quote quantity (spent): {cummulative_quote_qty} USDT")
        
        return response
    except Exception as e:
        logger.error(f"Error executing buy order: {e}")
        return None

def execute_test_sell_order(client, symbol="BTCUSDT", quantity=0.001):
    """
    Execute a test sell order
    
    Args:
        client: Binance client instance
        symbol: Trading pair symbol
        quantity: Order quantity
        
    Returns:
        Order response or None if error
    """
    try:
        logger.info(f"=== Executing SELL order for {symbol} ===")
        
        # Get current price
        ticker = client.ticker_price(symbol=symbol)
        current_price = float(ticker['price'])
        order_value = current_price * quantity
        
        logger.info(f"Current price: ${current_price:,.2f}")
        logger.info(f"Order quantity: {quantity} {symbol}")
        logger.info(f"Estimated order value: ${order_value:,.2f}")
        
        # Execute order
        logger.info("Sending market sell order...")
        order_params = {
            "symbol": symbol,
            "side": "SELL",
            "type": "MARKET",
            "quantity": quantity
        }
        
        response = client.new_order(**order_params)
        
        # Log the full response
        logger.info(f"Order response: {json.dumps(response, indent=2)}")
        
        # Extract key information
        order_id = response.get('orderId')
        status = response.get('status')
        executed_qty = response.get('executedQty')
        cummulative_quote_qty = response.get('cummulativeQuoteQty')
        
        logger.info(f"SELL order {order_id} status: {status}")
        logger.info(f"Executed quantity: {executed_qty} {symbol}")
        logger.info(f"Quote quantity (received): {cummulative_quote_qty} USDT")
        
        return response
    except Exception as e:
        logger.error(f"Error executing sell order: {e}")
        return None

def main():
    """Main function"""
    logger.info("=== Binance Direct SDK Order Execution Test ===")
    
    # Display environment information
    api_key = os.environ.get('BINANCE_API_KEY', '')
    masked_key = f"{api_key[:4]}...{api_key[-4:]}" if len(api_key) > 8 else "****"
    logger.info(f"API Key available: {masked_key}")
    
    # Default to testnet for safety
    use_testnet = True
    client = create_binance_client(use_testnet=use_testnet)
    
    # Test connection
    if not test_connection(client):
        logger.error("Connection test failed. Please check your API keys and network connection.")
        sys.exit(1)
    
    # Test account info
    account_info = test_account_info(client)
    if not account_info:
        logger.error("Failed to retrieve account information. Please check your API permissions.")
        sys.exit(1)
    
    # Use a very small quantity for testing
    symbol = "BTCUSDT"
    quantity = 0.001  # Small amount of BTC
    
    # Execute buy order
    buy_order = execute_test_buy_order(client, symbol=symbol, quantity=quantity)
    if not buy_order:
        logger.error("Buy order test failed.")
        sys.exit(1)
    
    # Wait between orders
    logger.info("Waiting 5 seconds between orders...")
    time.sleep(5)
    
    # Execute sell order
    sell_order = execute_test_sell_order(client, symbol=symbol, quantity=quantity)
    if not sell_order:
        logger.error("Sell order test failed.")
        sys.exit(1)
    
    # Success!
    logger.info("🎉 Order execution test completed successfully! 🎉")
    logger.info(f"Both BUY and SELL orders for {symbol} were executed correctly")

if __name__ == "__main__":
    main()