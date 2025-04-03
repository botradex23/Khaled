"""
Binance API Server

A standalone Flask server that connects to Binance API through proxies
and provides endpoints for cryptocurrency data.
"""

import os
import sys
import json
import time
import random
import logging
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS
from binance.spot import Spot
from binance.error import ClientError
from dotenv import load_dotenv
import urllib.parse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('api_server.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Flask application
app = Flask(__name__)
CORS(app)

# Global variables
WORKING_PROXIES = []
CURRENT_PROXY_INDEX = 0
MAX_RETRIES = 3
BINANCE_API_KEY = os.getenv('BINANCE_API_KEY')
BINANCE_SECRET_KEY = os.getenv('BINANCE_SECRET_KEY')
PROXY_IP = os.getenv('PROXY_IP')
PROXY_PORT = os.getenv('PROXY_PORT')
PROXY_USERNAME = os.getenv('PROXY_USERNAME')
PROXY_PASSWORD = os.getenv('PROXY_PASSWORD')

# Also support new proxy format
NEW_PROXY_IP = os.getenv('NEW_PROXY_IP')
NEW_PROXY_PORT = os.getenv('NEW_PROXY_PORT')
NEW_PROXY_USERNAME = os.getenv('NEW_PROXY_USERNAME')
NEW_PROXY_PASSWORD = os.getenv('NEW_PROXY_PASSWORD')

# Function to load proxies from a file
def load_proxies_from_file(file_path='attached_assets/Webshare 5 proxies.txt'):
    """Load proxies from a file"""
    proxies = []
    try:
        with open(file_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and ":" in line:
                    parts = line.split(':')
                    if len(parts) == 4:
                        proxy = {
                            'ip': parts[0],
                            'port': parts[1],
                            'username': parts[2],
                            'password': parts[3]
                        }
                        proxies.append(proxy)
        logger.info(f"Loaded {len(proxies)} proxies from {file_path}")
        return proxies
    except Exception as e:
        logger.error(f"Error loading proxies from file: {e}")
        return []

# Format proxy URL with authentication
def format_proxy_url(proxy):
    """Format proxy URL with proper authentication"""
    try:
        # URL encode the username and password
        username = urllib.parse.quote_plus(proxy['username'])
        password = urllib.parse.quote_plus(proxy['password'])
        
        proxy_url = f"http://{username}:{password}@{proxy['ip']}:{proxy['port']}"
        return proxy_url
    except Exception as e:
        logger.error(f"Error formatting proxy URL: {e}")
        return None

# Test if a proxy works with Binance API
def test_proxy(proxy):
    """Test if a proxy works with Binance API"""
    proxy_url = format_proxy_url(proxy)
    if not proxy_url:
        return False
    
    try:
        proxies = {
            'http': proxy_url,
            'https': proxy_url
        }
        
        response = requests.get('https://api.binance.com/api/v3/ping', 
                               proxies=proxies, 
                               timeout=5)
        
        if response.status_code == 200:
            logger.info(f"Proxy {proxy['ip']}:{proxy['port']} is working")
            return True
        else:
            logger.warning(f"Proxy {proxy['ip']}:{proxy['port']} failed with status code {response.status_code}")
            return False
    except Exception as e:
        logger.warning(f"Proxy {proxy['ip']}:{proxy['port']} failed: {e}")
        return False

# Find all working proxies
def find_working_proxies():
    """Find all working proxies"""
    global WORKING_PROXIES
    
    # First try to use environment variables if available
    if PROXY_IP and PROXY_PORT and PROXY_USERNAME and PROXY_PASSWORD:
        env_proxy = {
            'ip': PROXY_IP,
            'port': PROXY_PORT,
            'username': PROXY_USERNAME,
            'password': PROXY_PASSWORD
        }
        if test_proxy(env_proxy):
            WORKING_PROXIES.append(env_proxy)
    
    # Also try new proxy format if available
    if NEW_PROXY_IP and NEW_PROXY_PORT and NEW_PROXY_USERNAME and NEW_PROXY_PASSWORD:
        new_env_proxy = {
            'ip': NEW_PROXY_IP,
            'port': NEW_PROXY_PORT,
            'username': NEW_PROXY_USERNAME,
            'password': NEW_PROXY_PASSWORD
        }
        if test_proxy(new_env_proxy):
            WORKING_PROXIES.append(new_env_proxy)
    
    # Load and test proxies from file
    file_proxies = load_proxies_from_file()
    for proxy in file_proxies:
        if test_proxy(proxy) and proxy not in WORKING_PROXIES:
            WORKING_PROXIES.append(proxy)
    
    # Log the results
    logger.info(f"Found {len(WORKING_PROXIES)} working proxies")
    return WORKING_PROXIES

# Get the current proxy from the rotation
def get_current_proxy():
    """Get the current proxy from the rotation"""
    global WORKING_PROXIES, CURRENT_PROXY_INDEX
    
    if not WORKING_PROXIES:
        find_working_proxies()
        
    if not WORKING_PROXIES:
        logger.error("No working proxies available")
        return None
        
    proxy = WORKING_PROXIES[CURRENT_PROXY_INDEX]
    return proxy

# Rotate to the next proxy in the list
def rotate_proxy():
    """Rotate to the next proxy in the list"""
    global WORKING_PROXIES, CURRENT_PROXY_INDEX
    
    if not WORKING_PROXIES:
        find_working_proxies()
        
    if not WORKING_PROXIES:
        logger.error("No working proxies available")
        return None
        
    CURRENT_PROXY_INDEX = (CURRENT_PROXY_INDEX + 1) % len(WORKING_PROXIES)
    logger.info(f"Rotated to proxy {CURRENT_PROXY_INDEX + 1}/{len(WORKING_PROXIES)}")
    return WORKING_PROXIES[CURRENT_PROXY_INDEX]

# Make a request to Binance API with proxy
def make_binance_request(endpoint, params=None, max_retries=3):
    """Make a request to Binance API with proxy"""
    for i in range(max_retries):
        try:
            proxy = get_current_proxy()
            if not proxy:
                return {"error": "No working proxy available"}, 503
                
            proxy_url = format_proxy_url(proxy)
            
            # Create Binance client with proxy
            client = Spot(
                api_key=BINANCE_API_KEY,
                api_secret=BINANCE_SECRET_KEY,
                proxies={'http': proxy_url, 'https': proxy_url}
            )
            
            # Make the request based on the endpoint
            if endpoint == "ping":
                response = client.ping()
                return response, 200
            elif endpoint == "time":
                response = client.time()
                return response, 200
            elif endpoint == "ticker/price":
                if params and 'symbol' in params:
                    response = client.ticker_price(symbol=params['symbol'])
                else:
                    response = client.ticker_price()
                return response, 200
            elif endpoint == "klines":
                if not params or 'symbol' not in params:
                    return {"error": "Symbol parameter is required"}, 400
                    
                interval = params.get('interval', '1h')
                limit = int(params.get('limit', 100))
                
                response = client.klines(
                    symbol=params['symbol'],
                    interval=interval,
                    limit=limit
                )
                
                # Format klines response for easier consumption
                formatted_klines = []
                for kline in response:
                    formatted_klines.append({
                        "time": kline[0],
                        "open": float(kline[1]),
                        "high": float(kline[2]),
                        "low": float(kline[3]),
                        "close": float(kline[4]),
                        "volume": float(kline[5]),
                        "close_time": kline[6],
                        "quote_asset_volume": float(kline[7]),
                        "number_of_trades": kline[8],
                        "taker_buy_base_asset_volume": float(kline[9]),
                        "taker_buy_quote_asset_volume": float(kline[10])
                    })
                
                return formatted_klines, 200
            elif endpoint == "depth":
                if not params or 'symbol' not in params:
                    return {"error": "Symbol parameter is required"}, 400
                    
                limit = int(params.get('limit', 100))
                
                response = client.depth(
                    symbol=params['symbol'],
                    limit=limit
                )
                
                return response, 200
            else:
                return {"error": f"Unknown endpoint: {endpoint}"}, 400
                
        except ClientError as e:
            logger.error(f"Binance API error: {e}")
            
            # Check if we should rotate proxy and retry
            if i < max_retries - 1:
                rotate_proxy()
                time.sleep(1)  # Wait a bit before retrying
            else:
                return {"error": f"Binance API error: {str(e)}"}, 400
                
        except Exception as e:
            logger.error(f"Request error: {e}")
            
            # Check if we should rotate proxy and retry
            if i < max_retries - 1:
                rotate_proxy()
                time.sleep(1)  # Wait a bit before retrying
            else:
                return {"error": f"Request error: {str(e)}"}, 500

# API Routes

@app.route('/api/status', methods=['GET'])
def status():
    """Get server status"""
    proxy = get_current_proxy()
    proxy_info = {
        "ip": proxy['ip'],
        "port": proxy['port']
    } if proxy else None
    
    return jsonify({
        "status": "online",
        "timestamp": int(time.time()),
        "proxy": proxy_info,
        "working_proxies_count": len(WORKING_PROXIES),
        "binance_api_key_configured": bool(BINANCE_API_KEY),
        "version": "1.0.0"
    })

@app.route('/api/ping', methods=['GET'])
def ping():
    """Test connection to Binance API"""
    response, status_code = make_binance_request("ping")
    return jsonify(response), status_code

@app.route('/api/binance/status', methods=['GET'])
def binance_status():
    """Get detailed Binance API status"""
    ping_response, ping_status = make_binance_request("ping")
    time_response, time_status = make_binance_request("time")
    
    if ping_status == 200 and time_status == 200:
        status = "online"
    else:
        status = "offline"
        
    return jsonify({
        "status": status,
        "ping": ping_response,
        "time": time_response,
        "timestamp": int(time.time())
    })

@app.route('/api/ticker/<symbol>', methods=['GET'])
def ticker(symbol):
    """Get ticker price for a symbol"""
    response, status_code = make_binance_request("ticker/price", {"symbol": symbol.upper()})
    return jsonify(response), status_code

@app.route('/api/tickers', methods=['GET'])
def all_tickers():
    """Get all ticker prices"""
    response, status_code = make_binance_request("ticker/price")
    return jsonify(response), status_code

@app.route('/api/klines/<symbol>', methods=['GET'])
def klines(symbol):
    """Get klines/candlestick data for a symbol"""
    interval = request.args.get('interval', '1h')
    limit = request.args.get('limit', 100)
    
    params = {
        "symbol": symbol.upper(),
        "interval": interval,
        "limit": limit
    }
    
    response, status_code = make_binance_request("klines", params)
    return jsonify(response), status_code

@app.route('/api/depth/<symbol>', methods=['GET'])
def depth(symbol):
    """Get order book depth for a symbol"""
    limit = request.args.get('limit', 100)
    
    params = {
        "symbol": symbol.upper(),
        "limit": limit
    }
    
    response, status_code = make_binance_request("depth", params)
    return jsonify(response), status_code

@app.route('/api/ml/predict/<symbol>', methods=['GET'])
def ml_predict(symbol):
    """Fake ML prediction for a symbol (for demonstration purposes)"""
    # This is a placeholder for the actual ML prediction
    # In a real implementation, this would call a trained model
    
    current_price_response, status_code = make_binance_request(
        "ticker/price", 
        {"symbol": symbol.upper()}
    )
    
    if status_code != 200:
        return jsonify({"error": "Could not fetch current price"}), status_code
    
    current_price = float(current_price_response.get("price", 0))
    
    # Generate a random prediction with a slight upward bias
    prediction = {
        "symbol": symbol.upper(),
        "current_price": current_price,
        "price_prediction_24h": current_price * (1 + (random.random() * 0.1 - 0.04)),
        "confidence": random.uniform(0.65, 0.95),
        "recommendation": random.choice(["BUY", "HOLD", "SELL"]),
        "signals": {
            "trend": random.choice(["BULLISH", "BEARISH", "NEUTRAL"]),
            "momentum": random.uniform(-1, 1),
            "volatility": random.uniform(0, 0.2),
            "volume": random.choice(["HIGH", "MEDIUM", "LOW"])
        },
        "timestamp": int(time.time())
    }
    
    return jsonify(prediction)

# Initialize the server
def initialize():
    """Initialize the server"""
    # Find working proxies
    find_working_proxies()
    
    if not WORKING_PROXIES:
        logger.warning("No working proxies found. The API may not function correctly.")
    
    # Check API key configuration
    if not BINANCE_API_KEY or not BINANCE_SECRET_KEY:
        logger.warning("Binance API keys not configured. Some endpoints may not work.")

# Start the Flask server
def start_server():
    """Start the Flask server"""
    initialize()
    app.run(host='0.0.0.0', port=5001, debug=True)

if __name__ == '__main__':
    start_server()