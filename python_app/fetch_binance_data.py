"""
Fetch historical OHLCV data from Binance using the official Binance SDK.

This script:
1. Connects to Binance API (no authentication required for public endpoints)
2. Fetches 5-minute candlestick data for BTCUSDT for the last 30 days
3. Saves the data to a DataFrame with proper column names
4. Handles chunking requests to deal with Binance API limits
"""

import os
import sys
import time
import math
import logging
from datetime import datetime, timedelta
import pandas as pd
from typing import List, Dict, Any, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Ensure we can import from parent directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from binance.spot import Spot
    from binance.error import ClientError, ServerError
except ImportError:
    logging.error("Binance connector SDK not found. Please install it using 'pip install binance-connector'")
    sys.exit(1)

class BinanceHistoricalDataFetcher:
    """Class to fetch historical data from Binance using official SDK."""

    def __init__(self, use_proxy: bool = False):
        """
        Initialize the fetcher.
        
        Args:
            use_proxy: Whether to use a proxy for API requests
        """
        self.base_url = 'https://api.binance.com'
        self.client_options = {
            'base_url': self.base_url,
            'timeout': 30  # Extended timeout for API requests
        }
        
        # Set up proxy if required
        if use_proxy:
            try:
                # Try to import config if available
                from config import active_config
                if active_config.USE_PROXY:
                    proxy_url = f"http://{active_config.PROXY_USERNAME}:{active_config.PROXY_PASSWORD}@{active_config.PROXY_IP}:{active_config.PROXY_PORT}"
                    proxies = {
                        "http": proxy_url,
                        "https": proxy_url
                    }
                    self.client_options['proxies'] = proxies
                    logging.info(f"Using proxy connection to Binance API")
            except ImportError:
                logging.warning("Config not found for proxy, proceeding without proxy")
        
        # Initialize client - no API keys needed for public data
        self.client = Spot(**self.client_options)
        logging.info(f"Initialized Binance client with base URL: {self.base_url}")

    def fetch_klines(
        self, 
        symbol: str, 
        interval: str, 
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        limit: int = 1000
    ) -> List[List]:
        """
        Fetch klines (candlestick) data from Binance API.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Candlestick interval (e.g., '5m', '15m', '1h', '1d')
            start_time: Optional start time in milliseconds
            end_time: Optional end time in milliseconds
            limit: Number of candles to fetch per request (max 1000)
            
        Returns:
            List of candlestick data
        """
        try:
            params = {
                'symbol': symbol,
                'interval': interval,
                'limit': limit
            }
            
            if start_time:
                params['startTime'] = start_time
            if end_time:
                params['endTime'] = end_time
                
            logging.info(f"Fetching {interval} klines for {symbol} from {datetime.fromtimestamp(start_time/1000) if start_time else 'now'}")
            klines = self.client.klines(**params)
            
            return klines
        
        except ClientError as e:
            logging.error(f"Binance API client error: {e}")
            raise
        except Exception as e:
            logging.error(f"Error fetching klines: {e}")
            raise

    def fetch_historical_data(
        self,
        symbol: str,
        interval: str,
        days: int = 30,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """
        Fetch historical data for a given number of days.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Candlestick interval (e.g., '5m', '15m', '1h', '1d')
            days: Number of days to fetch data for
            end_date: Optional end date (defaults to now)
            
        Returns:
            DataFrame with historical OHLCV data
        """
        # Calculate time parameters
        end_date = end_date or datetime.now()
        end_timestamp = int(end_date.timestamp() * 1000)
        start_date = end_date - timedelta(days=days)
        start_timestamp = int(start_date.timestamp() * 1000)
        
        logging.info(f"Fetching {days} days of {interval} data for {symbol} from {start_date} to {end_date}")
        
        # Calculate interval in milliseconds
        interval_ms = self._interval_to_milliseconds(interval)
        
        # Calculate how many candles we need to fetch in total
        total_candles = math.ceil((end_timestamp - start_timestamp) / interval_ms)
        logging.info(f"Need to fetch approximately {total_candles} candles")
        
        # Binance allows max 1000 candles per request, so we need to chunk
        all_klines = []
        current_start = start_timestamp
        
        while current_start < end_timestamp:
            current_end = min(current_start + (1000 * interval_ms), end_timestamp)
            
            # Fetch chunk of candles
            chunk = self.fetch_klines(
                symbol=symbol,
                interval=interval,
                start_time=current_start,
                end_time=current_end,
                limit=1000
            )
            
            all_klines.extend(chunk)
            
            if not chunk:
                logging.warning(f"No data returned for range {datetime.fromtimestamp(current_start/1000)} to {datetime.fromtimestamp(current_end/1000)}")
                break
                
            # Update start time for next chunk
            current_start = int(chunk[-1][0]) + 1  # Use timestamp of last candle + 1ms
            
            # Log progress
            progress = min(100, round((current_start - start_timestamp) / (end_timestamp - start_timestamp) * 100))
            logging.info(f"Fetched {len(all_klines)} candles so far ({progress}% complete)")
            
            # Rate limiting - be nice to the API
            time.sleep(0.5)
        
        logging.info(f"Successfully fetched {len(all_klines)} candles in total")
        
        # Convert to DataFrame
        return self._klines_to_dataframe(all_klines)

    def _interval_to_milliseconds(self, interval: str) -> int:
        """
        Convert interval string to milliseconds.
        
        Args:
            interval: Interval string (e.g., '5m', '1h', '1d')
            
        Returns:
            Interval in milliseconds
        """
        unit = interval[-1]
        value = int(interval[:-1])
        
        if unit == 'm':
            return value * 60 * 1000
        elif unit == 'h':
            return value * 60 * 60 * 1000
        elif unit == 'd':
            return value * 24 * 60 * 60 * 1000
        elif unit == 'w':
            return value * 7 * 24 * 60 * 60 * 1000
        else:
            raise ValueError(f"Unsupported interval unit: {unit}")

    def _klines_to_dataframe(self, klines: List[List]) -> pd.DataFrame:
        """
        Convert klines data to a pandas DataFrame.
        
        Args:
            klines: List of klines data from Binance API
            
        Returns:
            DataFrame with historical OHLCV data
        """
        df = pd.DataFrame(klines, columns=[
            'timestamp', 'open', 'high', 'low', 'close', 'volume',
            'close_time', 'quote_asset_volume', 'number_of_trades',
            'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore'
        ])
        
        # Select only the columns we want
        df = df[['timestamp', 'open', 'high', 'low', 'close', 'volume']]
        
        # Convert types
        df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
        for col in ['open', 'high', 'low', 'close', 'volume']:
            df[col] = df[col].astype(float)
        
        return df

def main():
    """Main function to fetch historical data."""
    # Parse command-line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Fetch historical OHLCV data from Binance')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', help='Trading pair symbol')
    parser.add_argument('--interval', type=str, default='5m', help='Candlestick interval')
    parser.add_argument('--days', type=int, default=7, help='Number of days to fetch data for')
    parser.add_argument('--output', type=str, default='data/binance_btcusdt_5m_data.csv', 
                        help='Output CSV file path')
    parser.add_argument('--use-proxy', action='store_true', default=True, help='Use proxy for API requests')
    parser.add_argument('--no-proxy', action='store_false', dest='use_proxy', help='Disable proxy for API requests')
    
    args = parser.parse_args()
    
    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    
    # Fetch data
    fetcher = BinanceHistoricalDataFetcher(use_proxy=args.use_proxy)
    df = fetcher.fetch_historical_data(
        symbol=args.symbol,
        interval=args.interval,
        days=args.days
    )
    
    # Save to CSV
    df.to_csv(args.output, index=False)
    logging.info(f"Saved {len(df)} rows of data to {args.output}")
    
    # Display first 5 rows
    logging.info(f"First 5 rows of data:")
    logging.info(f"\n{df.head()}")
    
    # Display data statistics
    logging.info(f"Data statistics:")
    logging.info(f"Time range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    logging.info(f"Total rows: {len(df)}")
    
    # Check for missing intervals
    timestamps = df['timestamp'].sort_values()
    expected_interval = pd.Timedelta(args.interval)
    
    diffs = timestamps.diff().dropna()
    if not all(diff == expected_interval for diff in diffs):
        unexpected_diffs = diffs[diffs != expected_interval]
        logging.warning(f"Found {len(unexpected_diffs)} unexpected time intervals")
        logging.warning(f"Sample unexpected intervals: {unexpected_diffs.head()}")
    else:
        logging.info("All time intervals match the expected interval - data is complete")
    
    return df

if __name__ == "__main__":
    df = main()
    print("\nFirst 5 rows of fetched data:")
    print(df.head())