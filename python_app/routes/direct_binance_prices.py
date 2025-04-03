#!/usr/bin/env python3
"""
Direct Binance Prices API

This module provides direct access to the Binance API using the official Binance SDK.
It exposes endpoints to get real-time price data with minimal processing and no fallbacks.
"""

import os
import sys
import json
import time
import logging
from typing import Dict, List, Any, Optional

try:
    from flask import Blueprint, request, jsonify
except ImportError:
    print("Flask not found, please install it with 'pip install flask'")
    sys.exit(1)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('direct_binance_prices')

# Create blueprint
direct_binance_prices_bp = Blueprint('direct_binance_prices', __name__, url_prefix='/api/direct-binance')

try:
    from binance.spot import Spot
    from binance.error import ClientError
except ImportError:
    logger.error("Binance SDK not found, please install it with 'pip install binance-connector'")
    sys.exit(1)

# Top cryptocurrency pairs to track
TOP_CRYPTO_PAIRS = [
    'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 
    'ADAUSDT', 'DOGEUSDT', 'DOTUSDT', 'MATICUSDT', 'LINKUSDT', 
    'AVAXUSDT', 'UNIUSDT', 'SHIBUSDT', 'LTCUSDT', 'ATOMUSDT',
    'NEARUSDT', 'BCHUSDT', 'FILUSDT', 'TRXUSDT', 'XLMUSDT'
]

# Initialize client once to avoid creating multiple connections
def get_binance_client() -> Spot:
    """
    Get a Binance client instance with the provided API keys
    
    Returns:
        Spot: Binance Spot client instance
    """
    # Get API keys from environment
    api_key = os.environ.get('BINANCE_API_KEY')
    api_secret = os.environ.get('BINANCE_SECRET_KEY')
    
    # Initialize client directly, without proxy
    logger.info("Initializing Binance client with direct connection (no proxy)")
    client = Spot(
        api_key=api_key,
        api_secret=api_secret,
        base_url='https://api.binance.com'  # Explicitly set the production API URL
    )
    
    return client

# Keep a global client instance
binance_client = None

def init_binance_client():
    """Initialize the Binance client if not already done"""
    global binance_client
    if binance_client is None:
        try:
            binance_client = get_binance_client()
            logger.info("Binance client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Binance client: {e}")
            return False
    return True

# API Routes

@direct_binance_prices_bp.route('/ping', methods=['GET'])
def ping():
    """Ping the Binance API to check connectivity"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    try:
        # Use server time endpoint as a ping
        result = binance_client.time()
        return jsonify({
            "success": True, 
            "message": "Connected to Binance API",
            "serverTime": result.get('serverTime'),
            "directConnection": True
        })
    except Exception as e:
        error_str = str(e)
        logger.error(f"Binance API ping failed: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "error": error_str
            }), 451
        else:
            return jsonify({
                "success": False, 
                "message": f"Failed to connect to Binance API: {error_str}"
            }), 500

@direct_binance_prices_bp.route('/prices', methods=['GET'])
def get_all_prices():
    """Get all current prices from Binance"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    try:
        start_time = time.time()
        ticker_prices = binance_client.ticker_price()
        end_time = time.time()
        
        logger.info(f"Retrieved {len(ticker_prices)} ticker prices in {end_time - start_time:.2f}s directly from Binance API")
        
        return jsonify({
            "success": True,
            "prices": ticker_prices,
            "count": len(ticker_prices),
            "elapsed": end_time - start_time,
            "directConnection": True,
            "timestamp": int(time.time() * 1000)
        })
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get all prices: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get prices: {error_str}"}), 500

@direct_binance_prices_bp.route('/price/<symbol>', methods=['GET'])
def get_symbol_price(symbol):
    """Get the current price for a specific symbol"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    symbol = symbol.upper()  # Ensure symbol is uppercase
    
    try:
        # Get price for specific symbol
        result = binance_client.ticker_price(symbol=symbol)
        return jsonify({
            "success": True,
            "price": result
        })
    except ClientError as e:
        error_str = str(e)
        logger.error(f"Binance API error for symbol {symbol}: {e}")
        return jsonify({
            "success": False, 
            "message": f"Binance API error: {e.error_code} - {e.error_message}",
            "error_code": e.error_code
        }), 400
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get price for {symbol}: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "symbol": symbol,
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get price: {error_str}"}), 500

@direct_binance_prices_bp.route('/ticker/24hr', methods=['GET'])
def get_24hr_ticker():
    """Get 24hr ticker data for one or all symbols"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    symbol = request.args.get('symbol')
    
    try:
        # Get 24hr ticker for specific symbol or all symbols
        if symbol:
            symbol = symbol.upper()
            result = binance_client.ticker_24hr(symbol=symbol)
        else:
            result = binance_client.ticker_24hr()
        
        return jsonify({
            "success": True,
            "data": result
        })
    except ClientError as e:
        error_str = str(e)
        logger.error(f"Binance API error for 24hr ticker: {e}")
        return jsonify({
            "success": False, 
            "message": f"Binance API error: {e.error_code} - {e.error_message}",
            "error_code": e.error_code
        }), 400
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get 24hr ticker: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "symbol": symbol if symbol else "all",
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get 24hr ticker: {error_str}"}), 500

@direct_binance_prices_bp.route('/raw/prices', methods=['GET'])
def get_raw_prices():
    """Get raw price data with minimal processing"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    try:
        # Get all ticker prices directly
        result = binance_client.ticker_price()
        return jsonify(result)
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get raw prices: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get raw prices: {error_str}"}), 500

@direct_binance_prices_bp.route('/raw/price/<symbol>', methods=['GET'])
def get_raw_symbol_price(symbol):
    """Get raw price data for a specific symbol with minimal processing"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    symbol = symbol.upper()  # Ensure symbol is uppercase
    
    try:
        # Get price for specific symbol directly
        result = binance_client.ticker_price(symbol=symbol)
        return jsonify(result)
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get raw price for {symbol}: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "symbol": symbol,
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get raw price: {error_str}"}), 500

@direct_binance_prices_bp.route('/top-pairs', methods=['GET'])
def get_top_pairs():
    """Get price data for top cryptocurrency pairs"""
    if not init_binance_client():
        return jsonify({"success": False, "message": "Failed to initialize Binance client"}), 500
    
    try:
        start_time = time.time()
        # Get all ticker prices
        all_tickers = binance_client.ticker_price()
        
        # Filter for only the top pairs we're interested in
        top_pairs = []
        symbols_map = {ticker['symbol']: ticker for ticker in all_tickers}
        
        for symbol in TOP_CRYPTO_PAIRS:
            if symbol in symbols_map:
                top_pairs.append(symbols_map[symbol])
            else:
                # Try to get the individual price if not found in the bulk response
                try:
                    ticker = binance_client.ticker_price(symbol=symbol)
                    top_pairs.append(ticker)
                except Exception as e:
                    logger.warning(f"Could not get price for {symbol}: {e}")
        
        end_time = time.time()
        
        logger.info(f"Retrieved {len(top_pairs)} top ticker prices in {end_time - start_time:.2f}s directly from Binance API")
        
        return jsonify({
            "success": True,
            "prices": top_pairs,
            "count": len(top_pairs),
            "elapsed": end_time - start_time,
            "directConnection": True,
            "timestamp": int(time.time() * 1000)
        })
    except Exception as e:
        error_str = str(e)
        logger.error(f"Failed to get top pairs prices: {e}")
        
        # Check for geo-restriction error (HTTP 451)
        if "451" in error_str and "restricted location" in error_str:
            return jsonify({
                "success": False, 
                "geo_restricted": True,
                "message": "Binance API access is restricted in this region.",
                "error": error_str
            }), 451
        else:
            return jsonify({"success": False, "message": f"Failed to get top pairs prices: {error_str}"}), 500