"""
Data models for Binance market data

This module contains the data models for Binance API responses and internal data structures.
"""

import time
from typing import Dict, List, Optional, Union, Any


class BinanceTickerPrice:
    """Class representing a ticker price from Binance"""
    def __init__(self, symbol: str, price: str):
        self.symbol = symbol
        self.price = price
        
    def to_dict(self) -> Dict[str, str]:
        return {
            'symbol': self.symbol,
            'price': self.price
        }


class Binance24hrTicker:
    """Class representing 24hr ticker statistics from Binance"""
    def __init__(self, data: Dict[str, Any]):
        self.symbol = data.get('symbol', '')
        self.priceChange = data.get('priceChange', '0')
        self.priceChangePercent = data.get('priceChangePercent', '0')
        self.weightedAvgPrice = data.get('weightedAvgPrice', '0')
        self.prevClosePrice = data.get('prevClosePrice', '0')
        self.lastPrice = data.get('lastPrice', '0')
        self.lastQty = data.get('lastQty', '0')
        self.bidPrice = data.get('bidPrice', '0')
        self.bidQty = data.get('bidQty', '0')
        self.askPrice = data.get('askPrice', '0')
        self.askQty = data.get('askQty', '0')
        self.openPrice = data.get('openPrice', '0')
        self.highPrice = data.get('highPrice', '0')
        self.lowPrice = data.get('lowPrice', '0')
        self.volume = data.get('volume', '0')
        self.quoteVolume = data.get('quoteVolume', '0')
        self.openTime = data.get('openTime', 0)
        self.closeTime = data.get('closeTime', 0)
        self.firstId = data.get('firstId', 0)
        self.lastId = data.get('lastId', 0)
        self.count = data.get('count', 0)
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'symbol': self.symbol,
            'priceChange': self.priceChange,
            'priceChangePercent': self.priceChangePercent,
            'weightedAvgPrice': self.weightedAvgPrice,
            'prevClosePrice': self.prevClosePrice,
            'lastPrice': self.lastPrice,
            'lastQty': self.lastQty,
            'bidPrice': self.bidPrice,
            'bidQty': self.bidQty,
            'askPrice': self.askPrice,
            'askQty': self.askQty,
            'openPrice': self.openPrice,
            'highPrice': self.highPrice,
            'lowPrice': self.lowPrice,
            'volume': self.volume,
            'quoteVolume': self.quoteVolume,
            'openTime': self.openTime,
            'closeTime': self.closeTime,
            'firstId': self.firstId,
            'lastId': self.lastId,
            'count': self.count
        }


class LivePriceUpdate:
    """Class representing a real-time price update"""
    def __init__(self, symbol: str, price: float, source: str = 'binance'):
        self.symbol = symbol
        self.price = price
        self.timestamp = int(time.time() * 1000)
        self.source = source
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            'symbol': self.symbol,
            'price': self.price,
            'timestamp': self.timestamp,
            'source': self.source
        }