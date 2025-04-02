"""
Binance API services package

This package contains services for interacting with the Binance API.
"""

try:
    from python_app.services.binance.market_service import BinanceMarketService, binance_market_service, get_binance_market_service
    from python_app.services.binance.trading_service import BinanceTradingService, binance_trading_service, get_binance_trading_service
except ImportError:
    try:
        from services.binance.market_service import BinanceMarketService, binance_market_service, get_binance_market_service
        from services.binance.trading_service import BinanceTradingService, binance_trading_service, get_binance_trading_service
    except ImportError:
        # Handle import errors gracefully
        import logging
        logging.getLogger('binance_services').warning("Could not import Binance services - functionality may be limited")