#!/usr/bin/env python3
"""
Binance API Server

A standalone Flask server that connects to Binance API through proxies
and provides endpoints for cryptocurrency data.
"""

import os
import sys
import json
import time
import logging
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS
import requests
from urllib.parse import quote_plus
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
)
logger = logging.getLogger('binance_api_server')

# Global variables
app = Flask(__name__)
CORS(app)
proxies = []
current_proxy_index = 0
working_proxies = []

def load_proxies_from_file(file_path='attached_assets/Webshare 5 proxies.txt'):
    """Load proxies from a file"""
    global proxies
    proxies = []
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
                    proxies.append(proxy)
        logger.info(f"Loaded {len(proxies)} proxies from {file_path}")
    except Exception as e:
        logger.error(f"Failed to load proxies from file {file_path}: {e}")
    
    return proxies

def format_proxy_url(proxy):
    """Format proxy URL with proper authentication"""
    username = quote_plus(proxy['username'])
    password = quote_plus(proxy['password'])
    return f"http://{username}:{password}@{proxy['ip']}:{proxy['port']}"

def test_proxy(proxy):
    """Test if a proxy works with Binance API"""
    proxy_url = format_proxy_url(proxy)
    proxies_dict = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    try:
        # Test with Binance API
        response = requests.get('https://api.binance.com/api/v3/ping', 
                               proxies=proxies_dict,
                               timeout=10)
        
        return response.status_code == 200
    except Exception as e:
        logger.error(f"Error testing proxy {proxy['ip']}:{proxy['port']}: {e}")
        return False

def find_working_proxies():
    """Find all working proxies"""
    global working_proxies
    working_proxies = []
    
    for proxy in proxies:
        if test_proxy(proxy):
            working_proxies.append(proxy)
            logger.info(f"Found working proxy: {proxy['ip']}:{proxy['port']}")
    
    logger.info(f"Found {len(working_proxies)} working proxies out of {len(proxies)}")
    return working_proxies

def get_current_proxy():
    """Get the current proxy from the rotation"""
    global current_proxy_index, working_proxies
    
    if not working_proxies:
        return None
    
    proxy = working_proxies[current_proxy_index]
    return proxy

def rotate_proxy():
    """Rotate to the next proxy in the list"""
    global current_proxy_index, working_proxies
    
    if not working_proxies:
        return None
    
    current_proxy_index = (current_proxy_index + 1) % len(working_proxies)
    logger.info(f"Rotated to proxy #{current_proxy_index+1}: {working_proxies[current_proxy_index]['ip']}:{working_proxies[current_proxy_index]['port']}")
    return working_proxies[current_proxy_index]

def make_binance_request(endpoint, params=None, max_retries=3):
    """Make a request to Binance API with proxy"""
    global working_proxies
    
    if not working_proxies:
        return {'error': 'No working proxies available'}, 500
    
    proxy = get_current_proxy()
    proxy_url = format_proxy_url(proxy)
    proxies_dict = {
        'http': proxy_url,
        'https': proxy_url
    }
    
    url = f"https://api.binance.com{endpoint}"
    
    for i in range(max_retries):
        try:
            response = requests.get(url, 
                                   params=params,
                                   proxies=proxies_dict,
                                   timeout=10)
            
            if response.status_code == 200:
                return response.json(), 200
            
            # If we get a 429 (rate limit) or 418 (IP banned), rotate proxy and try again
            if response.status_code in (429, 418):
                logger.warning(f"Proxy rate limited (status {response.status_code}), rotating...")
                proxy = rotate_proxy()
                proxy_url = format_proxy_url(proxy)
                proxies_dict = {
                    'http': proxy_url,
                    'https': proxy_url
                }
                continue
                
            return {'error': f"Binance API error: {response.status_code}", 'details': response.text}, response.status_code
            
        except Exception as e:
            logger.error(f"Error making request to {url}: {e}")
            proxy = rotate_proxy()
            proxy_url = format_proxy_url(proxy)
            proxies_dict = {
                'http': proxy_url,
                'https': proxy_url
            }
    
    return {'error': 'Failed after max retries'}, 500

# API Routes
@app.route('/api/status', methods=['GET'])
def status():
    """Get server status"""
    proxy = get_current_proxy()
    
    return jsonify({
        'status': 'online',
        'timestamp': time.time(),
        'proxy': {
            'available': bool(working_proxies),
            'count': len(working_proxies),
            'current': f"{proxy['ip']}:{proxy['port']}" if proxy else None
        }
    })

@app.route('/api/binance/ping', methods=['GET'])
def ping():
    """Test connection to Binance API"""
    result, status_code = make_binance_request('/api/v3/ping')
    
    if status_code == 200:
        return jsonify({'success': True}), 200
    
    return jsonify(result), status_code

@app.route('/api/binance/status', methods=['GET'])
def binance_status():
    """Get detailed Binance API status"""
    result, status_code = make_binance_request('/api/v3/ping')
    
    proxy = get_current_proxy()
    
    return jsonify({
        'connected': status_code == 200,
        'hasApiKey': 'BINANCE_API_KEY' in os.environ,
        'hasSecretKey': 'BINANCE_SECRET_KEY' in os.environ,
        'usingProxy': bool(proxy),
        'proxyInfo': f"{proxy['ip']}:{proxy['port']}" if proxy else None,
        'workingProxies': len(working_proxies),
        'timestamp': time.time()
    })

@app.route('/api/binance/ticker/<symbol>', methods=['GET'])
def ticker(symbol):
    """Get ticker price for a symbol"""
    result, status_code = make_binance_request('/api/v3/ticker/price', {'symbol': symbol.upper()})
    
    if status_code == 200:
        return jsonify(result), 200
    
    return jsonify(result), status_code

@app.route('/api/binance/ticker', methods=['GET'])
def all_tickers():
    """Get all ticker prices"""
    result, status_code = make_binance_request('/api/v3/ticker/price')
    
    if status_code == 200:
        return jsonify(result), 200
    
    return jsonify(result), status_code

@app.route('/api/binance/klines/<symbol>', methods=['GET'])
def klines(symbol):
    """Get klines/candlestick data for a symbol"""
    interval = request.args.get('interval', '1h')
    limit = request.args.get('limit', '100')
    
    params = {
        'symbol': symbol.upper(),
        'interval': interval,
        'limit': limit
    }
    
    result, status_code = make_binance_request('/api/v3/klines', params)
    
    if status_code == 200:
        # Format the response to be more user-friendly
        formatted_klines = []
        for k in result:
            formatted_klines.append({
                'time': k[0],
                'open': float(k[1]),
                'high': float(k[2]),
                'low': float(k[3]),
                'close': float(k[4]),
                'volume': float(k[5]),
                'closeTime': k[6],
                'quoteVolume': float(k[7]),
                'trades': k[8],
                'takerBuyBaseVolume': float(k[9]),
                'takerBuyQuoteVolume': float(k[10])
            })
        
        return jsonify(formatted_klines), 200
    
    return jsonify(result), status_code

@app.route('/api/binance/depth/<symbol>', methods=['GET'])
def depth(symbol):
    """Get order book depth for a symbol"""
    limit = request.args.get('limit', '100')
    
    params = {
        'symbol': symbol.upper(),
        'limit': limit
    }
    
    result, status_code = make_binance_request('/api/v3/depth', params)
    
    if status_code == 200:
        return jsonify(result), 200
    
    return jsonify(result), status_code

@app.route('/api/ml/predict/<symbol>', methods=['GET'])
def ml_predict(symbol):
    """Fake ML prediction for a symbol (for demonstration purposes)"""
    try:
        # Get real price data to make the prediction more realistic
        result, status_code = make_binance_request('/api/v3/ticker/price', {'symbol': symbol.upper()})
        
        if status_code != 200:
            return jsonify({'error': 'Failed to get price data for prediction'}), status_code
        
        # Parse the current price
        current_price = float(result['price'])
        
        # Generate a "prediction" (just for demo purposes)
        import random
        prediction_change = random.uniform(-0.05, 0.05)  # -5% to +5%
        predicted_price = current_price * (1 + prediction_change)
        
        # Determine direction
        direction = "up" if prediction_change > 0 else "down"
        
        # Generate random confidence
        confidence = random.uniform(0.6, 0.95)
        
        return jsonify({
            'symbol': symbol.upper(),
            'currentPrice': current_price,
            'predictedPrice': predicted_price,
            'change': prediction_change * 100,  # as percentage
            'direction': direction,
            'confidence': confidence,
            'timeframe': '24h',
            'timestamp': time.time()
        }), 200
    except Exception as e:
        logger.error(f"Error generating prediction for {symbol}: {e}")
        return jsonify({'error': f"Failed to generate prediction: {str(e)}"}), 500

def initialize():
    """Initialize the server"""
    global proxies, working_proxies
    
    # Load environment variables
    load_dotenv()
    
    # Load proxies from file
    proxies = load_proxies_from_file()
    
    # Find working proxies
    working_proxies = find_working_proxies()
    
    # If no working proxies found, try to load from environment variables
    if not working_proxies and 'PROXY_IP' in os.environ and 'PROXY_PORT' in os.environ:
        logger.info("No working proxies found in file, trying from environment variables...")
        proxy = {
            'ip': os.environ.get('PROXY_IP'),
            'port': os.environ.get('PROXY_PORT'),
            'username': os.environ.get('PROXY_USERNAME'),
            'password': os.environ.get('PROXY_PASSWORD')
        }
        
        if test_proxy(proxy):
            working_proxies = [proxy]
            logger.info(f"Found working proxy from environment variables: {proxy['ip']}:{proxy['port']}")
    
    # If still no working proxies, try the new proxy variables
    if not working_proxies and 'NEW_PROXY_IP' in os.environ and 'NEW_PROXY_PORT' in os.environ:
        logger.info("No working proxies found, trying from NEW_PROXY environment variables...")
        proxy = {
            'ip': os.environ.get('NEW_PROXY_IP'),
            'port': os.environ.get('NEW_PROXY_PORT'),
            'username': os.environ.get('NEW_PROXY_USERNAME'),
            'password': os.environ.get('NEW_PROXY_PASSWORD')
        }
        
        if test_proxy(proxy):
            working_proxies = [proxy]
            logger.info(f"Found working proxy from NEW_PROXY environment variables: {proxy['ip']}:{proxy['port']}")
    
    # Initialize is complete
    logger.info(f"Initialization complete. Found {len(working_proxies)} working proxies.")
    
    if not working_proxies:
        logger.warning("WARNING: No working proxies found. API requests will fail!")

def start_server():
    """Start the Flask server"""
    # Initialize the server
    initialize()
    
    # Start the server
    logger.info("Starting Binance API Server on port 5001...")
    app.run(host='0.0.0.0', port=5001, debug=False)

if __name__ == '__main__':
    start_server()