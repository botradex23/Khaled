#!/usr/bin/env python3
"""
Cryptocurrency Trading Platform - All-in-One Server

This script provides a standalone Flask server that handles both the 
web interface and Binance API interactions through proxies.
"""

import os
import json
import time
import logging
import threading
import urllib.parse
from typing import Dict, List, Any, Optional
from datetime import datetime

# Flask for web server
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("crypto-trading-platform")

# Create Flask app
app = Flask(__name__, static_folder='./public')
CORS(app)  # Enable CORS for all routes

# Global variables
proxies = []
current_proxy_index = 0
WORKING_PROXIES_FILE = "working_proxies.json"

# Default proxy settings from environment variables
DEFAULT_PROXY_IP = os.environ.get('PROXY_IP', '')
DEFAULT_PROXY_PORT = os.environ.get('PROXY_PORT', '')
DEFAULT_PROXY_USERNAME = os.environ.get('PROXY_USERNAME', '')
DEFAULT_PROXY_PASSWORD = os.environ.get('PROXY_PASSWORD', '')

# Binance API credentials from environment variables
BINANCE_API_KEY = os.environ.get('BINANCE_API_KEY', '')
BINANCE_SECRET_KEY = os.environ.get('BINANCE_SECRET_KEY', '')

# Function to load proxies from file
def load_proxies_from_file(file_path='attached_assets/Webshare 5 proxies.txt'):
    """Load proxies from a file"""
    proxies_list = []
    
    try:
        with open(file_path, 'r') as f:
            for line in f:
                parts = line.strip().split(':')
                if len(parts) == 4:
                    proxy = {
                        'ip': parts[0],
                        'port': parts[1],
                        'username': parts[2],
                        'password': parts[3]
                    }
                    proxies_list.append(proxy)
        logger.info(f"Loaded {len(proxies_list)} proxies from {file_path}")
        return proxies_list
    except Exception as e:
        logger.error(f"Error loading proxies from file: {e}")
        # If file loading fails, use environment variables if available
        if DEFAULT_PROXY_IP and DEFAULT_PROXY_PORT:
            logger.info("Using proxy from environment variables")
            return [{
                'ip': DEFAULT_PROXY_IP,
                'port': DEFAULT_PROXY_PORT,
                'username': DEFAULT_PROXY_USERNAME,
                'password': DEFAULT_PROXY_PASSWORD
            }]
        return []

# Format proxy URL with proper authentication
def format_proxy_url(proxy):
    """Format proxy URL with proper authentication"""
    username = urllib.parse.quote_plus(proxy['username'])
    password = urllib.parse.quote_plus(proxy['password'])
    return f"http://{username}:{password}@{proxy['ip']}:{proxy['port']}"

# Test if a proxy works with Binance API
def test_proxy(proxy):
    """Test if a proxy works with Binance API"""
    import requests
    
    proxy_url = format_proxy_url(proxy)
    proxies_dict = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    try:
        logger.info(f"Testing proxy: {proxy['ip']}:{proxy['port']}")
        response = requests.get(
            'https://api.binance.com/api/v3/ping',
            proxies=proxies_dict,
            timeout=10
        )
        logger.info(f"Proxy test result: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Proxy test failed: {e}")
        return False

# Find all working proxies and save them
def find_working_proxies():
    """Find all working proxies and save them to file"""
    global proxies
    
    loaded_proxies = load_proxies_from_file()
    working_proxies = []
    
    for proxy in loaded_proxies:
        if test_proxy(proxy):
            working_proxies.append(proxy)
    
    # If no working proxies found, try direct connection
    if not working_proxies:
        logger.warning("No working proxies found. Trying direct connection.")
        # Empty proxy (direct connection)
        working_proxies.append({
            'ip': '',
            'port': '',
            'username': '',
            'password': ''
        })
    
    proxies = working_proxies
    logger.info(f"Found {len(proxies)} working proxies")
    
    # Save working proxies to file
    try:
        with open(WORKING_PROXIES_FILE, 'w') as f:
            json.dump(proxies, f)
    except Exception as e:
        logger.error(f"Error saving working proxies: {e}")
    
    return working_proxies

# Get the current proxy from the rotation
def get_current_proxy():
    """Get the current proxy from the rotation"""
    global proxies, current_proxy_index
    
    if not proxies:
        # Try to load from saved file first
        try:
            with open(WORKING_PROXIES_FILE, 'r') as f:
                proxies = json.load(f)
        except:
            # If loading fails, find working proxies
            proxies = find_working_proxies()
    
    if not proxies:
        logger.error("No working proxies available")
        return None
    
    return proxies[current_proxy_index]

# Rotate to the next proxy in the list
def rotate_proxy():
    """Rotate to the next proxy in the list"""
    global proxies, current_proxy_index
    
    if not proxies:
        return
    
    current_proxy_index = (current_proxy_index + 1) % len(proxies)
    logger.info(f"Rotated to proxy #{current_proxy_index}")

# Make a request to Binance API with proxy
def make_binance_request(endpoint, params=None, max_retries=3):
    """Make a request to Binance API with proxy"""
    import requests
    
    base_url = 'https://api.binance.com'
    url = f"{base_url}{endpoint}"
    
    for retry in range(max_retries):
        proxy = get_current_proxy()
        
        # Skip proxy for direct connection (empty proxy)
        if proxy and proxy['ip']:
            proxy_url = format_proxy_url(proxy)
            proxies_dict = {
                'http': proxy_url,
                'https': proxy_url
            }
        else:
            proxies_dict = None
        
        try:
            headers = {}
            if BINANCE_API_KEY:
                headers['X-MBX-APIKEY'] = BINANCE_API_KEY
            
            logger.info(f"Making request to {url} with proxy #{current_proxy_index}")
            response = requests.get(
                url,
                params=params,
                proxies=proxies_dict,
                headers=headers,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 451:  # Geo-restriction error
                logger.warning(f"Geo-restriction error with proxy #{current_proxy_index}")
                rotate_proxy()
            else:
                logger.error(f"Binance API error: {response.status_code} - {response.text}")
                rotate_proxy()
        except Exception as e:
            logger.error(f"Request error: {e}")
            rotate_proxy()
        
        # If we've tried all proxies and still failed, try with a delay
        if retry == max_retries - 1:
            time.sleep(1)  # Small delay before final retry
    
    # If all retries failed, return error response
    return {
        "error": "Failed to connect to Binance API after multiple retries",
        "status": "error"
    }

# Server status endpoint
@app.route('/api/status')
def status():
    """Get server status"""
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "server": "Cryptocurrency Trading Platform",
        "version": "0.1.0"
    })

# Ping endpoint to test connection
@app.route('/api/ping')
def ping():
    """Test connection to the server"""
    return jsonify({"status": "ok", "message": "pong"})

# Binance API status endpoint
@app.route('/api/binance/status')
def binance_status():
    """Get detailed Binance API status"""
    proxy = get_current_proxy()
    proxy_info = None
    
    if proxy and proxy['ip']:
        proxy_info = {
            "ip": proxy['ip'],
            "port": proxy['port'],
            "working": True
        }
    
    # Test connection to Binance API
    result = make_binance_request('/api/v3/ping')
    connection_working = 'error' not in result
    
    return jsonify({
        "status": "ok" if connection_working else "error",
        "api_connected": connection_working,
        "timestamp": datetime.now().isoformat(),
        "proxy": proxy_info,
        "credentials": {
            "api_key_configured": bool(BINANCE_API_KEY),
            "secret_key_configured": bool(BINANCE_SECRET_KEY)
        },
        "errors": [result.get("error")] if 'error' in result else []
    })

# Get ticker price for a symbol
@app.route('/api/binance/ticker/<symbol>')
def ticker(symbol):
    """Get ticker price for a symbol"""
    symbol = symbol.upper()
    result = make_binance_request('/api/v3/ticker/price', {'symbol': symbol})
    return jsonify(result)

# Get all ticker prices
@app.route('/api/binance/tickers')
def all_tickers():
    """Get all ticker prices"""
    result = make_binance_request('/api/v3/ticker/price')
    return jsonify(result)

# Get klines/candlestick data for a symbol
@app.route('/api/binance/klines/<symbol>')
def klines(symbol):
    """Get klines/candlestick data for a symbol"""
    symbol = symbol.upper()
    interval = request.args.get('interval', '1h')
    limit = request.args.get('limit', '100')
    
    result = make_binance_request(
        '/api/v3/klines',
        {'symbol': symbol, 'interval': interval, 'limit': limit}
    )
    
    # Format the response
    formatted_result = []
    if isinstance(result, list):
        for candle in result:
            formatted_result.append({
                'open_time': candle[0],
                'open': float(candle[1]),
                'high': float(candle[2]),
                'low': float(candle[3]),
                'close': float(candle[4]),
                'volume': float(candle[5]),
                'close_time': candle[6]
            })
    
    return jsonify(formatted_result)

# Get order book depth for a symbol
@app.route('/api/binance/depth/<symbol>')
def depth(symbol):
    """Get order book depth for a symbol"""
    symbol = symbol.upper()
    limit = request.args.get('limit', '100')
    
    result = make_binance_request(
        '/api/v3/depth',
        {'symbol': symbol, 'limit': limit}
    )
    
    return jsonify(result)

# ML prediction endpoint (demo)
@app.route('/api/ml/predict/<symbol>')
def ml_predict(symbol):
    """Fake ML prediction for a symbol (for demonstration purposes)"""
    import random
    
    # Get real ticker data for the symbol
    ticker_data = make_binance_request('/api/v3/ticker/price', {'symbol': symbol.upper()})
    
    # If we have real data, build a prediction based on it
    current_price = float(ticker_data.get('price', 0)) if 'price' in ticker_data else 10000
    
    # Generate random prediction
    prediction = {
        "symbol": symbol.upper(),
        "current_price": current_price,
        "prediction_24h": current_price * (1 + (random.uniform(-0.05, 0.08))),
        "prediction_7d": current_price * (1 + (random.uniform(-0.15, 0.20))),
        "confidence": random.uniform(0.65, 0.95),
        "trend": random.choice(["bullish", "bearish", "neutral", "strongly_bullish"]),
        "recommendation": random.choice([
            "strong_buy", "buy", "hold", "sell", "strong_sell"
        ]),
        "signals": {
            "rsi": random.uniform(30, 70),
            "macd": random.choice(["positive", "negative"]),
            "moving_averages": random.choice(["above", "below", "crossing"]),
            "volume": random.choice(["increasing", "decreasing", "stable"])
        },
        "timestamp": datetime.now().isoformat()
    }
    
    return jsonify(prediction)

# API documentation
@app.route('/api/docs')
def api_docs():
    """API documentation"""
    return jsonify({
        "name": "Cryptocurrency Trading Platform API",
        "version": "0.1.0",
        "endpoints": [
            {
                "path": "/api/status",
                "method": "GET",
                "description": "Get server status"
            },
            {
                "path": "/api/ping",
                "method": "GET",
                "description": "Test connection to the server"
            },
            {
                "path": "/api/binance/status",
                "method": "GET",
                "description": "Get Binance API connection status and details"
            },
            {
                "path": "/api/binance/ticker/{symbol}",
                "method": "GET",
                "description": "Get current price for a trading pair (e.g., BTCUSDT)"
            },
            {
                "path": "/api/binance/tickers",
                "method": "GET",
                "description": "Get prices for all trading pairs"
            },
            {
                "path": "/api/binance/klines/{symbol}",
                "method": "GET",
                "description": "Get candlestick data for a trading pair",
                "params": [
                    {"name": "interval", "default": "1h"},
                    {"name": "limit", "default": "100"}
                ]
            },
            {
                "path": "/api/binance/depth/{symbol}",
                "method": "GET",
                "description": "Get order book depth for a trading pair",
                "params": [
                    {"name": "limit", "default": "100"}
                ]
            },
            {
                "path": "/api/ml/predict/{symbol}",
                "method": "GET",
                "description": "Get ML prediction for a trading pair"
            }
        ]
    })

# Root endpoint - serve static files
@app.route('/', defaults={'path': 'index.html'})
@app.route('/<path:path>')
def serve_static(path):
    """Serve static files from the public directory"""
    return send_from_directory(app.static_folder, path)

# Initialize the server
def initialize():
    """Initialize the server"""
    logger.info("Initializing Cryptocurrency Trading Platform server")
    
    # Find working proxies
    threading.Thread(target=find_working_proxies).start()

# Main entry point
if __name__ == '__main__':
    initialize()
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)