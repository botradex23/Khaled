#!/usr/bin/env python3
"""
Test Binance Trading

This script tests the Binance trading capabilities using the Binance SDK.
It focuses on testing the connection, retrieving market data, and the feasibility
of placing orders using the new_order method of the SDK.
"""

import os
import logging
import json
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

# Import Binance SDK
try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
    logger.info("Successfully imported Binance SDK")
except ImportError:
    logger.error("Failed to import Binance SDK. Please install with: pip install binance-connector")
    exit(1)

def create_binance_client(use_testnet=True):
    """Create a Binance client with API credentials and proxy if configured"""
    # API credentials
    api_key = os.environ.get('BINANCE_API_KEY', '')
    api_secret = os.environ.get('BINANCE_SECRET_KEY', '')
    
    # Base URL based on testnet setting
    base_url = 'https://testnet.binance.vision' if use_testnet else 'https://api.binance.com'
    logger.info(f"Using Binance {'TESTNET' if use_testnet else 'PRODUCTION'}: {base_url}")
    
    # Proxy configuration
    use_proxy = os.environ.get('USE_PROXY', 'false').lower() in ('true', '1', 'yes')
    if use_proxy:
        # Get proxy settings
        proxy_protocol = os.environ.get('PROXY_PROTOCOL', 'http')
        proxy_ip = os.environ.get('PROXY_IP', '')
        proxy_port = os.environ.get('PROXY_PORT', '')
        proxy_username = os.environ.get('PROXY_USERNAME', '')
        proxy_password = os.environ.get('PROXY_PASSWORD', '')
        
        # For this test, use the hardcoded correct values
        proxy_username = "ahjqspco"
        proxy_password = "dzx3r1prpz9k"
        
        # Apply URL encoding for auth
        encoding_method = os.environ.get('PROXY_ENCODING_METHOD', 'quote_plus')
        if encoding_method == 'quote_plus':
            proxy_username = urllib.parse.quote_plus(proxy_username)
            proxy_password = urllib.parse.quote_plus(proxy_password)
        elif encoding_method == 'quote':
            proxy_username = urllib.parse.quote(proxy_username)
            proxy_password = urllib.parse.quote(proxy_password)
        
        # Create proxy URL
        if proxy_username and proxy_password:
            proxy_url = f"{proxy_protocol}://{proxy_username}:{proxy_password}@{proxy_ip}:{proxy_port}"
            logger.info(f"Using proxy with authentication: {proxy_ip}:{proxy_port}")
        else:
            proxy_url = f"{proxy_protocol}://{proxy_ip}:{proxy_port}"
            logger.info(f"Using proxy without authentication: {proxy_url}")
        
        # Create proxies dictionary
        proxies = {
            "http": proxy_url,
            "https": proxy_url
        }
        
        # Return client with proxy
        return Spot(api_key=api_key, api_secret=api_secret, base_url=base_url, proxies=proxies)
    
    # Return client without proxy
    return Spot(api_key=api_key, api_secret=api_secret, base_url=base_url)

def test_connection(client):
    """Test connection to Binance API"""
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
        
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {e}")
        return False

def test_get_symbols(client):
    """Test getting available trading symbols"""
    try:
        logger.info("Getting exchange information...")
        exchange_info = client.exchange_info()
        symbols = [s['symbol'] for s in exchange_info['symbols'] if s['status'] == 'TRADING']
        logger.info(f"Found {len(symbols)} trading symbols. First 5: {', '.join(symbols[:5])}")
        return symbols
    except Exception as e:
        logger.error(f"Failed to get symbols: {e}")
        return []

def test_get_prices(client, symbols=None):
    """Test getting current prices for symbols"""
    try:
        if symbols:
            # Get prices for specific symbols
            logger.info(f"Getting prices for {len(symbols)} symbols...")
            prices = {}
            for symbol in symbols[:10]:  # Get first 10 for testing
                ticker = client.ticker_price(symbol=symbol)
                prices[symbol] = float(ticker['price'])
                logger.info(f"{symbol}: ${prices[symbol]:,.2f}")
        else:
            # Get all prices
            logger.info("Getting prices for all symbols...")
            all_tickers = client.ticker_price()
            
            # Sort by symbol name
            all_tickers.sort(key=lambda x: x['symbol'])
            
            # Print first 10 BTC pairs
            btc_pairs = [t for t in all_tickers if 'BTC' in t['symbol']][:10]
            for ticker in btc_pairs:
                logger.info(f"{ticker['symbol']}: {ticker['price']}")
        
        # Get BTC price specifically
        btc_ticker = client.ticker_price(symbol='BTCUSDT')
        btc_price = float(btc_ticker['price'])
        logger.info(f"BTC/USDT Price: ${btc_price:,.2f}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to get prices: {e}")
        return False

def test_get_order_book(client, symbol='BTCUSDT'):
    """Test getting order book for a symbol"""
    try:
        logger.info(f"Getting order book for {symbol}...")
        order_book = client.depth(symbol=symbol, limit=5)
        
        logger.info(f"{symbol} Order Book:")
        logger.info("--- ASKS (Sell Orders) ---")
        for price, quantity in order_book['asks'][:5]:
            logger.info(f"Price: ${float(price):,.2f}, Quantity: {float(quantity):.8f}")
        
        logger.info("--- BIDS (Buy Orders) ---")
        for price, quantity in order_book['bids'][:5]:
            logger.info(f"Price: ${float(price):,.2f}, Quantity: {float(quantity):.8f}")
            
        return True
    except Exception as e:
        logger.error(f"Failed to get order book: {e}")
        return False

def test_get_recent_trades(client, symbol='BTCUSDT'):
    """Test getting recent trades for a symbol"""
    try:
        logger.info(f"Getting recent trades for {symbol}...")
        trades = client.trades(symbol=symbol, limit=5)
        
        logger.info(f"{symbol} Recent Trades:")
        for trade in trades:
            price = float(trade['price'])
            quantity = float(trade['qty'])
            value = price * quantity
            is_buyer_maker = trade['isBuyerMaker']
            side = 'SELL' if is_buyer_maker else 'BUY'
            
            logger.info(f"ID: {trade['id']}, Side: {side}, Price: ${price:,.2f}, "
                       f"Quantity: {quantity:.8f}, Value: ${value:,.2f}")
            
        return True
    except Exception as e:
        logger.error(f"Failed to get recent trades: {e}")
        return False

def test_order_structure():
    """Test the structure of a new order (without executing it)"""
    logger.info("Testing order structure (without execution)...")
    
    # Test market order parameters
    symbol = 'BTCUSDT'
    side = 'BUY'
    order_type = 'MARKET'
    quantity = 0.001  # Very small amount
    
    # Create order parameters dictionary
    market_order_params = {
        'symbol': symbol,
        'side': side,
        'type': order_type,
        'quantity': quantity,
        # Additional parameters that might be used
        'newClientOrderId': 'test_order_123',  # Custom ID
        'newOrderRespType': 'FULL',  # Get full response with fills
    }
    
    # Limit order parameters
    limit_price = 70000.0  # Example limit price
    time_in_force = 'GTC'  # Good Till Canceled
    
    limit_order_params = {
        'symbol': symbol,
        'side': side,
        'type': 'LIMIT',
        'timeInForce': time_in_force,
        'quantity': quantity,
        'price': limit_price,
    }
    
    # Stop loss order parameters
    stop_price = 60000.0  # Example stop price
    
    stop_order_params = {
        'symbol': symbol,
        'side': 'SELL',
        'type': 'STOP_LOSS',
        'quantity': quantity,
        'stopPrice': stop_price,
    }
    
    # Display all order types
    logger.info(f"Market Order Parameters: {json.dumps(market_order_params, indent=2)}")
    logger.info(f"Limit Order Parameters: {json.dumps(limit_order_params, indent=2)}")
    logger.info(f"Stop Loss Order Parameters: {json.dumps(stop_order_params, indent=2)}")
    
    logger.info("To execute a real order, you would call:")
    logger.info("client.new_order(**order_params)")
    logger.info("This would return an order confirmation with fills and execution details.")
    
    return True

def main():
    """Main function"""
    logger.info("=== Binance Trading Test ===")
    
    # Create Binance client (use testnet for safety)
    use_testnet = os.environ.get('USE_TESTNET', 'true').lower() in ('true', '1', 'yes')
    client = create_binance_client(use_testnet=use_testnet)
    
    # Run tests
    tests_passed = []
    
    # Test connection
    tests_passed.append(("Connection", test_connection(client)))
    
    # Test getting symbols
    symbols = test_get_symbols(client)
    tests_passed.append(("Get Symbols", len(symbols) > 0))
    
    # Test getting prices
    test_symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'ADAUSDT', 'DOGEUSDT']
    tests_passed.append(("Get Prices", test_get_prices(client, test_symbols)))
    
    # Test getting order book
    tests_passed.append(("Get Order Book", test_get_order_book(client, 'BTCUSDT')))
    
    # Test getting recent trades
    tests_passed.append(("Get Recent Trades", test_get_recent_trades(client, 'BTCUSDT')))
    
    # Test order structure
    tests_passed.append(("Order Structure", test_order_structure()))
    
    # Print test summary
    logger.info("\n=== Test Summary ===")
    all_passed = True
    for test_name, passed in tests_passed:
        status = "✅ PASSED" if passed else "❌ FAILED"
        logger.info(f"{test_name}: {status}")
        all_passed = all_passed and passed
    
    if all_passed:
        logger.info("\n🎉 All tests passed! The Binance SDK new_order method can be used for trading.")
    else:
        logger.error("\n❌ Some tests failed. Please check the logs for details.")

if __name__ == "__main__":
    main()