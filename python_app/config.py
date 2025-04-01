"""
Configuration settings for the Flask application

This module contains all the configuration variables used throughout the application.
It loads values from environment variables when available.
"""

import os
from typing import Dict

# Flask application settings
class Config:
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.environ.get('FLASK_DEBUG', 'True').lower() in ('true', '1', 't')
    TESTING = os.environ.get('FLASK_TESTING', 'False').lower() in ('true', '1', 't')
    
    # Binance API settings
    BINANCE_BASE_URL = 'https://api.binance.com'
    BINANCE_TEST_URL = 'https://testnet.binancefuture.com'
    BINANCE_API_KEY = os.environ.get('BINANCE_API_KEY', '')
    BINANCE_SECRET_KEY = os.environ.get('BINANCE_SECRET_KEY', '')
    USE_BINANCE_TESTNET = os.environ.get('USE_BINANCE_TESTNET', 'False').lower() in ('true', '1', 't')
    
    # Proxy configuration for bypassing geo-restrictions
    USE_PROXY = os.environ.get('USE_PROXY', 'True').lower() in ('true', '1', 't')
    PROXY_USERNAME = os.environ.get('PROXY_USERNAME', 'ahjqspco')
    PROXY_PASSWORD = os.environ.get('PROXY_PASSWORD', 'dzx3r1prpz9k')
    PROXY_IP = os.environ.get('PROXY_IP', '185.199.228.220')
    PROXY_PORT = os.environ.get('PROXY_PORT', '7300')


# Development configuration
class DevelopmentConfig(Config):
    DEBUG = True


# Production configuration
class ProductionConfig(Config):
    DEBUG = False
    SECRET_KEY = os.environ.get('FLASK_SECRET_KEY')  # Must be set in production


# Testing configuration
class TestingConfig(Config):
    TESTING = True
    DEBUG = True


# Choose the configuration based on environment
config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}

# Default configuration is development
active_config = config_by_name[os.environ.get('FLASK_ENV', 'development')]