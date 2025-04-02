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
    
    def save_report(self, output_path: Optional[str] = None, format_type: str = 'both') -> Dict[str, str]:
        """
        Save the validation report to CSV and/or JSON files.
        
        Args:
            output_path: Custom path for the output file (without extension)
            format_type: Format type for the report ('csv', 'json', or 'both')
            
        Returns:
            Dictionary containing paths to saved report files
        """
        if self.report_df is None or self.report_df.empty:
            if not self.predictions:
                self.run_validation()
            self.create_report()
            
            if self.report_df is None or self.report_df.empty:
                logging.error("No data available for report")
                return {"csv": "", "json": ""}
        
        # Create output directory if it doesn't exist
        output_dir = os.path.join(current_dir, 'validation_reports')
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate timestamp for filenames
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Prepare file paths
        paths = {"csv": "", "json": ""}
        
        # Create base file name without extension
        if output_path is None:
            base_filename = f"prediction_validation_{self.symbol.lower()}_{self.interval}_{self.model_type}_{timestamp}"
            standard_base_filename = f"prediction_validation_{self.symbol.lower()}_{self.interval}_{self.model_type}"
        else:
            # Remove extension if present
            base_filename = os.path.splitext(output_path)[0]
            standard_base_filename = base_filename
        
        # Generate report summary for JSON
        summary_data = self.generate_summary_data()
        
        # Save in requested format(s)
        if format_type in ['csv', 'both']:
            csv_path = os.path.join(output_dir, f"{base_filename}.csv")
            self.report_df.to_csv(csv_path, index=False)
            logging.info(f"CSV report saved to {csv_path}")
            paths["csv"] = csv_path
            
            # Create standard CSV filename that will be overwritten with each run
            standard_csv_path = os.path.join(output_dir, f"{standard_base_filename}.csv")
            self.report_df.to_csv(standard_csv_path, index=False)
        
        if format_type in ['json', 'both']:
            # Create JSON report with summary data
            json_path = os.path.join(output_dir, f"{base_filename}.json")
            
            # Combine detailed report data with summary metrics
            json_data = {
                "metadata": {
                    "symbol": self.symbol,
                    "interval": self.interval,
                    "model_type": self.model_type,
                    "days_analyzed": self.days,
                    "confidence_threshold": self.confidence_threshold,
                    "generated_at": datetime.now().isoformat()
                },
                "summary": summary_data,
                "predictions": self.predictions if len(self.predictions) <= 100 else self.predictions[:100]  # Limit to 100 records for JSON
            }
            
            # Write JSON report
            with open(json_path, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
            
            logging.info(f"JSON report saved to {json_path}")
            paths["json"] = json_path
            
            # Create standard JSON filename that will be overwritten with each run
            standard_json_path = os.path.join(output_dir, f"{standard_base_filename}.json")
            with open(standard_json_path, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
        
        logging.info(f"Reports generated in format: {format_type}")
        return paths
    
    def generate_summary_data(self) -> Dict[str, Any]:
        """
        Generate a structured summary of the validation results for reporting.
        
        Returns:
            Dictionary containing summary metrics
        """
        if self.report_df is None or self.report_df.empty:
            logging.error("No validation data available for summary generation")
            return {}
        
        # Basic stats
        total = len(self.report_df)
        correct = self.report_df['was_correct'].sum()
        accuracy = (correct / total) * 100 if total > 0 else 0
        avg_confidence = float(self.report_df['confidence'].mean())
        
        # Breakdown by prediction type
        class_metrics = {}
        for pred_type in ['BUY', 'HOLD', 'SELL']:
            type_df = self.report_df[self.report_df['prediction'] == pred_type]
            count = len(type_df)
            
            # Calculate accuracy for this class
            if count > 0:
                type_correct = type_df['was_correct'].sum()
                type_accuracy = (type_correct / count) * 100
            else:
                type_correct = 0
                type_accuracy = 0
                
            # Store class metrics
            class_metrics[pred_type] = {
                "count": int(count),
                "correct": int(type_correct),
                "accuracy": float(type_accuracy)
            }
        
        # Calculate precision, recall, and F1 scores for BUY and SELL predictions
        # First, prepare classification metrics data
        buy_predictions = self.report_df[self.report_df['prediction'] == 'BUY']
        sell_predictions = self.report_df[self.report_df['prediction'] == 'SELL']
        
        # Precision: True Positives / (True Positives + False Positives)
        buy_precision = (buy_predictions['was_correct'].sum() / len(buy_predictions)) if len(buy_predictions) > 0 else 0
        sell_precision = (sell_predictions['was_correct'].sum() / len(sell_predictions)) if len(sell_predictions) > 0 else 0
        
        # Recall calculations require identifying actual positives (when actual_direction matches prediction type)
        actual_buys = self.report_df[self.report_df['actual_direction'] == 'BUY']
        actual_sells = self.report_df[self.report_df['actual_direction'] == 'SELL']
        
        # True Positives
        buy_true_positives = self.report_df[(self.report_df['prediction'] == 'BUY') & 
                                          (self.report_df['was_correct'] == True)].shape[0]
        sell_true_positives = self.report_df[(self.report_df['prediction'] == 'SELL') & 
                                           (self.report_df['was_correct'] == True)].shape[0]
        
        # Recall: True Positives / (True Positives + False Negatives)
        buy_recall = buy_true_positives / len(actual_buys) if len(actual_buys) > 0 else 0
        sell_recall = sell_true_positives / len(actual_sells) if len(actual_sells) > 0 else 0
        
        # F1 Score: 2 * (precision * recall) / (precision + recall)
        buy_f1 = 2 * (buy_precision * buy_recall) / (buy_precision + buy_recall) if (buy_precision + buy_recall) > 0 else 0
        sell_f1 = 2 * (sell_precision * sell_recall) / (sell_precision + sell_recall) if (sell_precision + sell_recall) > 0 else 0
        
        # Profitability analysis (simulated)
        # For profitable trades, we consider correct BUY and SELL predictions
        buy_df = self.report_df[(self.report_df['prediction'] == 'BUY') & (self.report_df['was_correct'])]
        sell_df = self.report_df[(self.report_df['prediction'] == 'SELL') & (self.report_df['was_correct'])]
        
        # Average profit percentages
        avg_buy_profit = float(buy_df['price_change_pct'].mean()) if not buy_df.empty else 0
        avg_sell_profit = float(-sell_df['price_change_pct'].mean()) if not sell_df.empty else 0
        
        # Calculate win ratios
        buy_win_ratio = (len(buy_df) / len(buy_predictions)) * 100 if len(buy_predictions) > 0 else 0
        sell_win_ratio = (len(sell_df) / len(sell_predictions)) * 100 if len(sell_predictions) > 0 else 0
        
        # Calculate cumulative return (simplified model)
        profitable_trades = len(buy_df) + len(sell_df)
        avg_profit_per_trade = ((avg_buy_profit * len(buy_df)) + (avg_sell_profit * len(sell_df))) / profitable_trades if profitable_trades > 0 else 0
        
        # Rough estimate of cumulative return if we traded with equal capital on each signal
        # This is a simplified model and doesn't account for compounding, transaction fees, etc.
        cumulative_return = 0
        
        # For BUY signals, we add the price change
        if not buy_df.empty:
            cumulative_return += buy_df['price_change_pct'].sum()
        
        # For SELL signals, we add the negative price change (price drop = profit for short)
        if not sell_df.empty:
            cumulative_return += -sell_df['price_change_pct'].sum()
            
        # Get time range
        start_time = self.report_df['timestamp'].min() if not self.report_df.empty else None
        end_time = self.report_df['timestamp'].max() if not self.report_df.empty else None
            
        # Compile all metrics into a single dictionary
        summary = {
            "total_predictions": int(total),
            "correct_predictions": int(correct),
            "overall_accuracy": float(accuracy),
            "average_confidence": float(avg_confidence),
            "time_range": {
                "start": str(start_time),
                "end": str(end_time)
            },
            "class_breakdown": class_metrics,
            "classification_metrics": {
                "BUY": {
                    "precision": float(buy_precision),
                    "recall": float(buy_recall),
                    "f1_score": float(buy_f1),
                    "win_ratio": float(buy_win_ratio)
                },
                "SELL": {
                    "precision": float(sell_precision),
                    "recall": float(sell_recall),
                    "f1_score": float(sell_f1),
                    "win_ratio": float(sell_win_ratio)
                }
            },
            "profitability": {
                "profitable_trades": int(profitable_trades),
                "profitable_trades_percentage": float((profitable_trades / total) * 100) if total > 0 else 0,
                "avg_buy_profit_pct": float(avg_buy_profit),
                "avg_sell_profit_pct": float(avg_sell_profit),
                "avg_profit_per_trade": float(avg_profit_per_trade),
                "cumulative_return_pct": float(cumulative_return)
            }
        }
        
        return summary
    
    def print_summary(self) -> None:
        """
        Print a summary of the validation results to the console.
        """
        if self.report_df is None or self.report_df.empty:
            print("No validation data available for summary")
            return
        
        # Get the summary data
        summary = self.generate_summary_data()
        if not summary:
            print("Failed to generate summary data")
            return
            
        print("\n" + "="*80)
        print(f"PREDICTION VALIDATION SUMMARY: {self.symbol} {self.interval} ({self.model_type} model)")
        print("="*80)
        
        # Basic stats
        print(f"\nTotal predictions: {summary['total_predictions']}")
        print(f"Correct predictions: {summary['correct_predictions']} ({summary['overall_accuracy']:.2f}%)")
        print(f"Average confidence: {summary['average_confidence']:.4f}")
        
        # Breakdown by prediction type
        print("\nBreakdown by prediction type:")
        for pred_type in ['BUY', 'HOLD', 'SELL']:
            metrics = summary['class_breakdown'][pred_type]
            count = metrics['count']
            if count > 0:
                correct = metrics['correct']
                accuracy = metrics['accuracy']
                print(f"  {pred_type}: {count} predictions, {correct} correct ({accuracy:.2f}%)")
            else:
                print(f"  {pred_type}: 0 predictions")
                
        # Print detailed metrics for BUY and SELL
        print("\nDetailed metrics:")
        for pred_type in ['BUY', 'SELL']:
            metrics = summary['classification_metrics'][pred_type]
            print(f"  {pred_type}:")
            print(f"    Precision: {metrics['precision']:.4f}")
            print(f"    Recall: {metrics['recall']:.4f}")
            print(f"    F1 Score: {metrics['f1_score']:.4f}")
            print(f"    Win Ratio: {metrics['win_ratio']:.2f}%")
        
        # Profitability analysis
        prof = summary['profitability']
        print("\nSimulated profitability:")
        print(f"  Avg. profit on correct BUY signals: {prof['avg_buy_profit_pct']:.2f}%")
        print(f"  Avg. profit on correct SELL signals: {prof['avg_sell_profit_pct']:.2f}%")
        print(f"  Profitable trades: {prof['profitable_trades']} ({prof['profitable_trades_percentage']:.2f}% of all predictions)")
        print(f"  Average profit per profitable trade: {prof['avg_profit_per_trade']:.2f}%")
        print(f"  Cumulative return: {prof['cumulative_return_pct']:.2f}%")
        
        # Print time range
        if 'time_range' in summary and summary['time_range']['start']:
            print(f"\nTime range: {summary['time_range']['start']} to {summary['time_range']['end']}")
        
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
    parser.add_argument('--format', type=str, choices=['json', 'csv', 'both'], default='both',
                        help='Output format for the report (json, csv, or both)')
    
    args = parser.parse_args()
    
    print(f"\n=== Historical Prediction Validator ===")
    print(f"Symbol: {args.symbol}")
    print(f"Interval: {args.interval}")
    print(f"Days to analyze: {args.days}")
    print(f"Model type: {args.model}")
    print(f"Confidence threshold: {args.threshold}")
    print(f"Output format: {args.format}")
    
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
    
    report_paths = validator.save_report(output_path, args.format)
    
    # Print summary
    validator.print_summary()
    
    # Check if reports were generated
    if report_paths:
        if args.format == 'both':
            print(f"CSV report saved to: {report_paths['csv']}")
            print(f"JSON report saved to: {report_paths['json']}")
        elif args.format == 'csv':
            print(f"CSV report saved to: {report_paths['csv']}")
        elif args.format == 'json':
            print(f"JSON report saved to: {report_paths['json']}")
        return 0
    else:
        print("Failed to generate validation report")
        return 1

if __name__ == "__main__":
    sys.exit(main())