#!/usr/bin/env python3
"""
Configuration for the ML Trading System

This module contains all configuration settings for the ML trading system,
including API keys, endpoints, and proxy configuration.
"""

import os
from typing import Dict, Any

class Config:
    """Base configuration class"""
    
    # Binance API settings
    BINANCE_API_KEY = os.environ.get('BINANCE_API_KEY', '')
    BINANCE_SECRET_KEY = os.environ.get('BINANCE_SECRET_KEY', '')
    BINANCE_BASE_URL = 'https://api.binance.com'
    BINANCE_TEST_URL = 'https://testnet.binance.vision'
    
    # Use production environment by default
    USE_TESTNET = os.environ.get('USE_TESTNET', 'false').lower() in ('true', '1', 'yes')
    
    # Proxy settings
    USE_PROXY = os.environ.get('USE_PROXY', 'true').lower() in ('true', '1', 'yes')
    PROXY_IP = os.environ.get('PROXY_IP', '')  # Will be provided by user
    PROXY_PORT = os.environ.get('PROXY_PORT', '')  # Will be provided by user
    PROXY_USERNAME = os.environ.get('PROXY_USERNAME', '')  # Will be provided by user
    PROXY_PASSWORD = os.environ.get('PROXY_PASSWORD', '')  # Will be provided by user
    
    # Fallback mechanism for when proxy is not available
    FALLBACK_TO_DIRECT = os.environ.get('FALLBACK_TO_DIRECT', 'false').lower() in ('true', '1', 'yes')
    PROXY_ENCODING_METHOD = os.environ.get('PROXY_ENCODING_METHOD', 'quote_plus')  # URL encoding method for proxy auth
    
    # ML model settings
    DEFAULT_MODEL_TYPE = 'xgboost'
    CONFIDENCE_THRESHOLD = 0.75
    
    # Paper trading settings
    DEFAULT_PAPER_BALANCE = 10000.0  # USD
    
    # Trading settings
    DEFAULT_TRADE_QUANTITY = {
        'BTCUSDT': 0.001,  # 0.001 BTC
        'ETHUSDT': 0.01,   # 0.01 ETH
        'BNBUSDT': 0.1,    # 0.1 BNB
        'DEFAULT': 10.0     # Default quantity for other pairs
    }
    
    # Risk management settings
    MAX_POSITIONS = 10
    MAX_LEVERAGE = 1  # No leverage by default (spot trading)
    DEFAULT_STOP_LOSS_PERCENT = 2.0
    DEFAULT_TAKE_PROFIT_PERCENT = 4.0
    
    # Data settings
    HISTORICAL_DATA_PATH = 'data/historical'
    INDICATORS_DATA_PATH = 'data/indicators'
    MODELS_PATH = 'data/models'
    
    def as_dict(self) -> Dict[str, Any]:
        """Return configuration as dictionary"""
        return {k: v for k, v in self.__dict__.items() 
                if not k.startswith('_') and k.isupper()}


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    LOGGING_LEVEL = 'DEBUG'


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    LOGGING_LEVEL = 'INFO'
    
    # Override with production settings
    def __init__(self):
        super().__init__()
        # Use specific production settings if needed


# Select active configuration
active_config = DevelopmentConfig()

if os.environ.get('ENVIRONMENT', 'development').lower() == 'production':
    active_config = ProductionConfig()


# Simple test function
if __name__ == "__main__":
    import json
    
    print("\n=== ML Trading System Configuration ===")
    
    # Print active configuration
    config_dict = {k: v for k, v in active_config.__class__.__dict__.items() 
                   if not k.startswith('_') and k.isupper()}
    
    # Add instance attributes
    for k in dir(active_config):
        if not k.startswith('_') and k.isupper() and k not in config_dict:
            config_dict[k] = getattr(active_config, k)
    
    # Mask sensitive data
    masked_config = config_dict.copy()
    for key in masked_config:
        if any(sensitive in key.lower() for sensitive in ['key', 'secret', 'password', 'token']):
            if masked_config[key] and isinstance(masked_config[key], str):
                masked_config[key] = masked_config[key][:3] + '****' if masked_config[key] else 'Not set'
    
    print(json.dumps(masked_config, indent=2))
    
    print(f"\nProxies enabled: {active_config.USE_PROXY}")
    if active_config.USE_PROXY:
        print(f"Proxy: {active_config.PROXY_IP}:{active_config.PROXY_PORT}")
    
    print(f"\nAPI keys configured: {bool(active_config.BINANCE_API_KEY and active_config.BINANCE_SECRET_KEY)}")
    
    print("\nConfig loaded successfully!")