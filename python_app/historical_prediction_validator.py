#!/usr/bin/env python3
"""
Historical Prediction Validator

This script validates ML model predictions on historical market data by:
1. Loading historical OHLCV data for a given symbol and timeframe
2. Recalculating technical indicators as used in the training phase
3. Running predictions on each candle using a sliding window approach
4. Comparing predictions to actual outcomes
5. Generating a comprehensive CSV report of the results

Usage:
    python historical_prediction_validator.py --symbol=BTCUSDT --interval=1h --days=7

Arguments:
    --symbol: Trading pair to analyze (e.g., BTCUSDT)
    --interval: Time interval for candles (e.g., 5m, 15m, 1h, 4h, 1d)
    --days: Number of days of historical data to analyze
    --model: Model type to use (standard or balanced)
    --threshold: Minimum confidence threshold for predictions (0.0-1.0)
    --output: Custom output filename (optional)
"""

import os
import sys
import json
import time
import logging
import argparse
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Any, Optional, Union

# Add the parent directory to the path to import from python_app
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Configure logging
log_dir = os.path.join(os.path.dirname(current_dir), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'historical_prediction_validator.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

# Import required modules
try:
    from data.dataset_loader import load_symbol_data
    from predict_xgboost import XGBoostPredictor
    from services.binance.market_service import BinanceMarketService
except ImportError as e:
    # Try relative imports as a fallback
    try:
        logging.info("Attempting relative imports...")
        from .data.dataset_loader import load_symbol_data
        from .predict_xgboost import XGBoostPredictor
        from .services.binance.market_service import BinanceMarketService
    except ImportError as e2:
        logging.error(f"Error importing required modules: {e2}")
        print(f"Failed to import required modules: {e2}")
        print("Please make sure you're running this script from the python_app directory.")
        sys.exit(1)

class HistoricalPredictionValidator:
    """
    Validates ML model predictions against historical market data
    """
    
    def __init__(self, symbol: str, interval: str = '1h', model_type: str = 'balanced',
                 days: int = 7, confidence_threshold: float = 0.5):
        """
        Initialize the historical prediction validator.
        
        Args:
            symbol: Trading pair symbol (e.g., 'BTCUSDT')
            interval: Timeframe interval (e.g., '5m', '1h', '1d')
            model_type: Model type to use ('standard' or 'balanced')
            days: Number of days of historical data to analyze
            confidence_threshold: Minimum confidence threshold for predictions
        """
        self.symbol = symbol.upper()
        self.interval = interval
        self.model_type = model_type
        self.days = days
        self.confidence_threshold = confidence_threshold
        
        # Initialize market service for data fetching
        self.market_service = BinanceMarketService()
        
        # Initialize ML predictor
        self.predictor = XGBoostPredictor()
        self.load_model()
        
        # Results storage
        self.predictions = []
        self.report_df = None
        
        logging.info(f"Initialized validator for {symbol} on {interval} timeframe using {model_type} model")
        logging.info(f"Analyzing {days} days of historical data with confidence threshold {confidence_threshold}")
    
    def load_model(self) -> bool:
        """
        Load the prediction model.
        
        Returns:
            Boolean indicating if model was loaded successfully
        """
        success = self.predictor.load_model(self.symbol, self.model_type)
        if success:
            logging.info(f"Successfully loaded {self.model_type} model for {self.symbol}")
        else:
            logging.error(f"Failed to load {self.model_type} model for {self.symbol}")
        return success
    
    def fetch_historical_data(self) -> pd.DataFrame:
        """
        Fetch historical OHLCV data for the specified symbol and timeframe.
        
        Returns:
            DataFrame containing historical market data with technical indicators
        """
        logging.info(f"Fetching {self.days} days of historical {self.interval} data for {self.symbol}")
        
        # Determine the lookback period needed for calculating indicators
        # For a proper indicator calculation, we need extra data before our analysis period
        indicator_lookback = '14d'  # Extra data to ensure accurate indicator calculations
        
        # Use the dataset loader to fetch data with indicators
        df = load_symbol_data(
            symbol=self.symbol,
            interval=self.interval,
            lookback=f"{self.days}d",
            additional_lookback=indicator_lookback
        )
        
        if df is None or df.empty:
            logging.error(f"Failed to retrieve historical data for {self.symbol}")
            return pd.DataFrame()
        
        logging.info(f"Retrieved {len(df)} historical candles with {len(df.columns)} columns")
        return df
    
    def determine_actual_outcome(self, df: pd.DataFrame, current_idx: int) -> Dict[str, Any]:
        """
        Determine the actual market outcome after a prediction.
        
        Args:
            df: DataFrame containing historical data
            current_idx: Index of the current candle
        
        Returns:
            Dictionary with actual outcome information
        """
        # We need at least one more candle to determine the outcome
        if current_idx >= len(df) - 1:
            return {
                'actual_direction': 'UNKNOWN',
                'price_change_pct': 0.0,
                'was_correct': False
            }
        
        current_price = df.iloc[current_idx]['close']
        next_price = df.iloc[current_idx + 1]['close']
        
        # Calculate price change percentage
        price_change = next_price - current_price
        price_change_pct = (price_change / current_price) * 100.0
        
        # Determine direction
        # We use a small threshold (0.1%) to avoid considering very small movements
        if price_change_pct > 0.1:
            direction = 'BUY'  # Price went up, so "BUY" would have been correct
        elif price_change_pct < -0.1:
            direction = 'SELL'  # Price went down, so "SELL" would have been correct
        else:
            direction = 'HOLD'  # Price didn't move significantly, so "HOLD" would have been correct
        
        return {
            'actual_direction': direction,
            'price_change_pct': price_change_pct,
            'future_price': next_price
        }
    
    def is_prediction_correct(self, predicted: str, actual: str) -> bool:
        """
        Determine if a prediction was correct based on the actual outcome.
        
        Args:
            predicted: Predicted action ('BUY', 'HOLD', 'SELL')
            actual: Actual market direction ('BUY', 'HOLD', 'SELL')
        
        Returns:
            Boolean indicating if prediction was correct
        """
        if predicted == actual:
            return True
        
        # Special cases: HOLD is partially correct if the market moves only slightly
        if predicted == 'HOLD' and actual in ['BUY', 'SELL']:
            return False
        if predicted in ['BUY', 'SELL'] and actual == 'HOLD':
            return False
        
        # Completely wrong predictions
        if (predicted == 'BUY' and actual == 'SELL') or (predicted == 'SELL' and actual == 'BUY'):
            return False
        
        return False
    
    def run_validation(self) -> List[Dict[str, Any]]:
        """
        Run the validation process on historical data.
        
        Returns:
            List of prediction results with validation information
        """
        # Fetch historical data
        historical_data = self.fetch_historical_data()
        if historical_data.empty:
            return []
        
        # Use only the data for the days we want to analyze (remove the additional lookback)
        # We still want to keep enough history for technical indicators to be accurate
        min_lookback = 100  # Minimum number of candles needed for accurate indicators
        analyze_start_idx = max(len(historical_data) - (24 // int(self.interval[0]) * self.days), min_lookback)
        analyze_data = historical_data.iloc[analyze_start_idx:].copy()
        
        logging.info(f"Running prediction validation on {len(analyze_data)} candles")
        
        predictions = []
        
        # Iterate through each candle and make predictions
        for i in range(len(analyze_data) - 1):  # -1 because we need the next candle for validation
            current_time = analyze_data.index[i]
            
            try:
                # Prepare data for current candle
                candle_data = analyze_data.iloc[:i+1].copy()
                current_candle = candle_data.iloc[-1].to_dict()
                
                # Make prediction
                prediction = self.predictor.predict(current_candle, self.symbol, self.model_type)
                
                # Get actual outcome
                outcome = self.determine_actual_outcome(analyze_data, i)
                
                # Determine if prediction was correct
                was_correct = self.is_prediction_correct(
                    prediction.get('predicted_label', 'UNKNOWN'),
                    outcome.get('actual_direction', 'UNKNOWN')
                )
                
                # Create prediction record
                record = {
                    'timestamp': current_time,
                    'symbol': self.symbol,
                    'interval': self.interval,
                    'current_price': current_candle.get('close', 0.0),
                    'prediction': prediction.get('predicted_label', 'UNKNOWN'),
                    'confidence': prediction.get('confidence', 0.0),
                    'actual_direction': outcome.get('actual_direction', 'UNKNOWN'),
                    'price_change_pct': outcome.get('price_change_pct', 0.0),
                    'future_price': outcome.get('future_price', 0.0),
                    'was_correct': was_correct
                }
                
                # Add key indicators to the record for reference
                for indicator in ['rsi_14', 'macd', 'bb_upper', 'bb_lower', 'ema_20']:
                    if indicator in current_candle:
                        record[indicator] = current_candle[indicator]
                
                predictions.append(record)
                
                # Log progress every 20 predictions
                if (i + 1) % 20 == 0 or i == 0:
                    logging.info(f"Processed {i+1}/{len(analyze_data)-1} candles ({((i+1) / (len(analyze_data)-1)) * 100:.1f}%)")
            
            except Exception as e:
                logging.error(f"Error processing candle at {current_time}: {str(e)}")
        
        self.predictions = predictions
        logging.info(f"Completed validation with {len(predictions)} predictions")
        
        return predictions
    
    def create_report(self) -> pd.DataFrame:
        """
        Create a DataFrame report from the validation results.
        
        Returns:
            DataFrame containing all prediction and validation data
        """
        if not self.predictions:
            logging.error("No predictions available for report creation")
            return pd.DataFrame()
        
        # Convert predictions to DataFrame
        df = pd.DataFrame(self.predictions)
        
        # Add derived columns for analysis
        df['model_type'] = self.model_type
        
        # Apply confidence threshold filter if specified
        if self.confidence_threshold > 0:
            confident_predictions = df[df['confidence'] >= self.confidence_threshold].copy()
            low_confidence_count = len(df) - len(confident_predictions)
            if low_confidence_count > 0:
                logging.info(f"Filtered out {low_confidence_count} predictions below confidence threshold {self.confidence_threshold}")
                df = confident_predictions
        
        # Add accuracy metrics
        if not df.empty:
            accuracy = df['was_correct'].mean() * 100
            df['cumulative_accuracy'] = df['was_correct'].cumsum() / (df.index + 1) * 100
            
            logging.info(f"Overall prediction accuracy: {accuracy:.2f}%")
            logging.info(f"Total predictions: {len(df)}")
            
            # Add breakdown by prediction type
            for pred_type in ['BUY', 'HOLD', 'SELL']:
                type_df = df[df['prediction'] == pred_type]
                if not type_df.empty:
                    type_accuracy = type_df['was_correct'].mean() * 100
                    logging.info(f"{pred_type} predictions: {len(type_df)} with {type_accuracy:.2f}% accuracy")
        
        self.report_df = df
        return df
    
    def save_report(self, output_path: Optional[str] = None) -> str:
        """
        Save the validation report to a CSV file.
        
        Args:
            output_path: Custom path for the output file
            
        Returns:
            Path to the saved report file
        """
        if self.report_df is None or self.report_df.empty:
            if not self.predictions:
                self.run_validation()
            self.create_report()
            
            if self.report_df is None or self.report_df.empty:
                logging.error("No data available for report")
                return ""
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join(current_dir, 'validation_reports')
        os.makedirs(output_dir, exist_ok=True)
        
        # Create filename
        if output_path is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"prediction_validation_{self.symbol.lower()}_{self.interval}_{self.model_type}_{timestamp}.csv"
            output_path = os.path.join(output_dir, filename)
        
        # Save to CSV
        self.report_df.to_csv(output_path, index=False)
        logging.info(f"Report saved to {output_path}")
        
        # Create standard filename that will be overwritten with each run
        standard_filename = f"prediction_validation_{self.symbol.lower()}_{self.interval}_{self.model_type}.csv"
        standard_path = os.path.join(output_dir, standard_filename)
        self.report_df.to_csv(standard_path, index=False)
        
        return output_path
    
    def print_summary(self) -> None:
        """
        Print a summary of the validation results to the console.
        """
        if self.report_df is None or self.report_df.empty:
            print("No validation data available for summary")
            return
        
        print("\n" + "="*80)
        print(f"PREDICTION VALIDATION SUMMARY: {self.symbol} {self.interval} ({self.model_type} model)")
        print("="*80)
        
        # Basic stats
        total = len(self.report_df)
        correct = self.report_df['was_correct'].sum()
        accuracy = (correct / total) * 100 if total > 0 else 0
        
        print(f"\nTotal predictions: {total}")
        print(f"Correct predictions: {correct} ({accuracy:.2f}%)")
        print(f"Average confidence: {self.report_df['confidence'].mean():.4f}")
        
        # Breakdown by prediction type
        print("\nBreakdown by prediction type:")
        for pred_type in ['BUY', 'HOLD', 'SELL']:
            type_df = self.report_df[self.report_df['prediction'] == pred_type]
            count = len(type_df)
            if count > 0:
                type_correct = type_df['was_correct'].sum()
                type_accuracy = (type_correct / count) * 100
                print(f"  {pred_type}: {count} predictions, {type_correct} correct ({type_accuracy:.2f}%)")
            else:
                print(f"  {pred_type}: 0 predictions")
        
        # Profitability analysis (simulated)
        print("\nSimulated profitability:")
        # For profitable trades, we consider correct BUY and SELL predictions
        buy_df = self.report_df[(self.report_df['prediction'] == 'BUY') & (self.report_df['was_correct'])]
        sell_df = self.report_df[(self.report_df['prediction'] == 'SELL') & (self.report_df['was_correct'])]
        
        # Average profit for correct BUY signals (positive price change)
        avg_buy_profit = buy_df['price_change_pct'].mean() if not buy_df.empty else 0
        # Average profit for correct SELL signals (negative price change, but profit for short selling)
        avg_sell_profit = -sell_df['price_change_pct'].mean() if not sell_df.empty else 0
        
        print(f"  Avg. profit on correct BUY signals: {avg_buy_profit:.2f}%")
        print(f"  Avg. profit on correct SELL signals: {avg_sell_profit:.2f}%")
        
        # Calculate cumulative return if following all signals (simplified)
        profitable_trades = len(buy_df) + len(sell_df)
        avg_profit_per_trade = ((avg_buy_profit * len(buy_df)) + (avg_sell_profit * len(sell_df))) / profitable_trades if profitable_trades > 0 else 0
        
        print(f"  Profitable trades: {profitable_trades} ({(profitable_trades / total) * 100:.2f}% of all predictions)")
        print(f"  Average profit per profitable trade: {avg_profit_per_trade:.2f}%")
        
        # Print time range
        if not self.report_df.empty:
            start_time = self.report_df['timestamp'].min()
            end_time = self.report_df['timestamp'].max()
            print(f"\nTime range: {start_time} to {end_time}")
        
        print("="*80 + "\n")

def create_validation_dirs():
    """Create necessary directories for validation reports"""
    base_dir = os.path.dirname(os.path.abspath(__file__))
    validation_dir = os.path.join(base_dir, 'validation_reports')
    os.makedirs(validation_dir, exist_ok=True)
    return validation_dir

def main():
    """Main function to run the historical prediction validator"""
    parser = argparse.ArgumentParser(description='Validate ML model predictions on historical data')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', 
                        help='Trading pair symbol (e.g., BTCUSDT)')
    parser.add_argument('--interval', type=str, default='1h', 
                        help='Timeframe interval (e.g., 5m, 15m, 1h, 4h, 1d)')
    parser.add_argument('--days', type=int, default=7,
                        help='Number of days of historical data to analyze')
    parser.add_argument('--model', type=str, choices=['standard', 'balanced'], default='balanced',
                        help='Model type to use (standard or balanced)')
    parser.add_argument('--threshold', type=float, default=0.6,
                        help='Minimum confidence threshold for predictions (0.0-1.0)')
    parser.add_argument('--output', type=str, default=None,
                        help='Custom output filename')
    
    args = parser.parse_args()
    
    print(f"\n=== Historical Prediction Validator ===")
    print(f"Symbol: {args.symbol}")
    print(f"Interval: {args.interval}")
    print(f"Days to analyze: {args.days}")
    print(f"Model type: {args.model}")
    print(f"Confidence threshold: {args.threshold}")
    
    # Create necessary directories
    validation_dir = create_validation_dirs()
    
    # Initialize and run validator
    validator = HistoricalPredictionValidator(
        symbol=args.symbol,
        interval=args.interval,
        model_type=args.model,
        days=args.days,
        confidence_threshold=args.threshold
    )
    
    # Run validation
    validator.run_validation()
    
    # Create report
    validator.create_report()
    
    # Save report
    output_path = args.output
    if output_path and not os.path.isabs(output_path):
        output_path = os.path.join(validation_dir, output_path)
    
    report_path = validator.save_report(output_path)
    
    # Print summary
    validator.print_summary()
    
    if report_path:
        print(f"Validation report saved to: {report_path}")
        return 0
    else:
        print("Failed to generate validation report")
        return 1

if __name__ == "__main__":
    sys.exit(main())