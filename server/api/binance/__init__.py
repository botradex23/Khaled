"""
Binance Market Price Service package
This package provides a Python implementation of the Binance Market Price Service
"""

from .binance_market_service import BinanceMarketPriceService

# Create a singleton instance of the service for use throughout the application
binance_market_service = BinanceMarketPriceService()