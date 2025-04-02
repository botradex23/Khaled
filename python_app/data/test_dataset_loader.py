#!/usr/bin/env python3
"""
Unit tests for the dataset loader module.

These tests verify that the DatasetLoader can correctly:
1. Fetch historical data from Binance
2. Apply technical indicators
3. Process data for different symbols and timeframes
"""

import os
import sys
import unittest
import pandas as pd
from datetime import datetime, timedelta

# Add parent directory to path to allow imports
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(os.path.dirname(current_dir))
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

# Import the module to test
from python_app.data.dataset_loader import DatasetLoader, load_symbol_data


class TestDatasetLoader(unittest.TestCase):
    """Test cases for DatasetLoader class"""
    
    def setUp(self):
        """Set up test fixtures"""
        self.loader = DatasetLoader()
        self.symbol = "BTCUSDT"
        self.interval = "5m"
        # Use a very small lookback to keep tests fast
        self.lookback = "1h"
    
    def test_fetch_historical_data(self):
        """Test fetching historical data"""
        df = self.loader.fetch_historical_data(
            symbol=self.symbol,
            interval=self.interval,
            lookback=self.lookback
        )
        
        # Check that we got some data
        self.assertFalse(df.empty, "DataFrame should not be empty")
        
        # Check that we have the expected columns
        expected_columns = ['open', 'high', 'low', 'close', 'volume', 
                          'close_time', 'quote_asset_volume', 'number_of_trades',
                          'taker_buy_base_asset_volume', 'taker_buy_quote_asset_volume', 'ignore']
        for col in expected_columns:
            self.assertIn(col, df.columns, f"DataFrame should contain column '{col}'")
        
        # Check that the index is datetime
        self.assertEqual(df.index.name, 'open_time', "Index should be named 'open_time'")
        self.assertTrue(pd.api.types.is_datetime64_any_dtype(df.index), "Index should be datetime type")
        
        # Check that we have approximately the right number of rows
        # For 5m interval and 1h lookback, we should have around 12 rows (1 * 60 / 5)
        # Allow some flexibility due to potential API delays or missing data
        min_expected_rows = 10  # Lower bound (allow for some missing data)
        self.assertGreaterEqual(len(df), min_expected_rows, 
                              f"DataFrame should have at least {min_expected_rows} rows")
    
    def test_apply_indicators(self):
        """Test applying technical indicators"""
        # First get some data
        df = self.loader.fetch_historical_data(
            symbol=self.symbol,
            interval=self.interval,
            lookback=self.lookback
        )
        
        # Apply indicators with drop_na=False (default)
        processed_df = self.loader.apply_indicators(df)
        
        # Check that we still have data
        self.assertFalse(processed_df.empty, "Processed DataFrame should not be empty")
        
        # Check that the indicators were added
        expected_indicators = ['sma_5', 'sma_10', 'sma_20', 'ema_5', 'ema_10', 'rsi_14', 
                             'macd', 'macd_signal', 'bb_upper', 'bb_lower', 'atr_14',
                             'future_price', 'price_change_pct']
        for indicator in expected_indicators:
            self.assertIn(indicator, processed_df.columns, 
                        f"Processed DataFrame should contain indicator '{indicator}'")
        
        # The new implementation should have filled any NaN values
        self.assertFalse(processed_df.isnull().any().any(), 
                       "Processed DataFrame should not contain NaN values with NaN filling")
        
        # Try with drop_na=True to ensure that behavior still works
        processed_df_dropped = self.loader.apply_indicators(df, drop_na=True)
        
        # Check that we still have at least some data
        self.assertFalse(processed_df_dropped.empty, 
                        "Processed DataFrame with drop_na=True should not be completely empty")
        
        # The number of rows in the dropped version should be less than or equal to the filled version
        self.assertLessEqual(len(processed_df_dropped), len(processed_df),
                          "DataFrame with drop_na=True should have fewer or equal rows")
    
    def test_load_symbol_data(self):
        """Test the main load_symbol_data function"""
        # Test the instance method
        df1 = self.loader.load_symbol_data(
            symbol=self.symbol,
            interval=self.interval,
            lookback=self.lookback
        )
        
        # Check that we got data
        self.assertFalse(df1.empty, "load_symbol_data should return non-empty DataFrame")
        
        # Check that all needed indicators are present
        expected_columns = ['open', 'high', 'low', 'close', 'volume', 
                          'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                          'bb_upper', 'bb_lower', 'atr_14',
                          'future_price', 'price_change_pct']
        for col in expected_columns:
            self.assertIn(col, df1.columns, f"DataFrame should contain column '{col}'")
        
        # Now test the convenience function
        df2 = load_symbol_data(
            symbol=self.symbol,
            interval=self.interval,
            lookback=self.lookback
        )
        
        # Check that we got data
        self.assertFalse(df2.empty, "load_symbol_data should return non-empty DataFrame")
        
        # The two DataFrames should have the same shape
        self.assertEqual(df1.shape, df2.shape, 
                       "Instance method and convenience function should return same-shaped DataFrames")
    
    def test_different_symbol(self):
        """Test loading data for a different symbol"""
        alternate_symbol = "ETHUSDT"
        
        df = load_symbol_data(
            symbol=alternate_symbol,
            interval=self.interval,
            lookback=self.lookback
        )
        
        # Check that we got data
        self.assertFalse(df.empty, f"Should be able to load data for {alternate_symbol}")
        
        # Check that we have the expected columns
        expected_columns = ['open', 'high', 'low', 'close', 'volume', 
                          'rsi_14', 'macd', 'macd_signal', 'macd_hist',
                          'bb_upper', 'bb_lower', 'atr_14',
                          'future_price', 'price_change_pct']
        for col in expected_columns:
            self.assertIn(col, df.columns, f"DataFrame should contain column '{col}'")
    
    def test_different_timeframe(self):
        """Test loading data for a different timeframe"""
        alternate_interval = "15m"
        
        df = load_symbol_data(
            symbol=self.symbol,
            interval=alternate_interval,
            lookback=self.lookback
        )
        
        # Check that we got data
        self.assertFalse(df.empty, f"Should be able to load data for {alternate_interval} interval")
        
        # For 15m interval and 1h lookback, we should have around 4 rows (1 * 60 / 15)
        # Allow some flexibility due to potential API delays or missing data
        min_expected_rows = 3  # Lower bound
        self.assertGreaterEqual(len(df), min_expected_rows, 
                              f"DataFrame should have at least {min_expected_rows} rows")


if __name__ == "__main__":
    unittest.main()