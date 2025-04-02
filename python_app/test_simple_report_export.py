#!/usr/bin/env python3
"""
Simple Test for Validation Report Export Functionality

This script tests the report generation and export capabilities without relying on
external data sources. It creates a simplified validator with mock data.
"""

import os
import sys
import json
import logging
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Add the parent directory to the path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Configure logging
log_dir = os.path.join(os.path.dirname(current_dir), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'test_simple_report_export.log')
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

# Print startup message
print("Starting test_simple_report_export.py")
logging.info("Starting test_simple_report_export.py")


class SimpleValidator:
    """
    A simplified validator that generates reports from sample data
    """
    
    def __init__(self, symbol: str = 'BTCUSDT'):
        """
        Initialize the simple validator
        
        Args:
            symbol: Symbol for the test data
        """
        self.symbol = symbol
        self.interval = '1h'
        self.model_type = 'balanced'
        self.days = 1
        self.confidence_threshold = 0.6
        
        # Create sample data
        self.predictions = self._generate_sample_predictions()
        self.report_df = pd.DataFrame(self.predictions)
        
        logging.info(f"Initialized SimpleValidator with {len(self.predictions)} sample predictions")
    
    def _generate_sample_predictions(self, count: int = 20) -> List[Dict[str, Any]]:
        """
        Generate sample prediction data
        
        Args:
            count: Number of predictions to generate
            
        Returns:
            List of prediction dictionaries
        """
        predictions = []
        
        # Create a base timestamp
        base_time = datetime.now() - timedelta(days=1)
        
        # Prediction labels and their probabilities
        labels = ['BUY', 'HOLD', 'SELL']
        label_probs = {
            'BUY': [0.8, 0.15, 0.05],   # High confidence BUY
            'HOLD': [0.05, 0.9, 0.05],  # High confidence HOLD
            'SELL': [0.05, 0.1, 0.85]   # High confidence SELL
        }
        
        # Generate sample data
        for i in range(count):
            # Alternate between prediction types for variety
            pred_type = labels[i % 3]
            confidence = label_probs[pred_type][labels.index(pred_type)]
            
            # Determine if prediction was correct (70% chance of being correct)
            is_correct = (i % 10) < 7
            
            # For incorrect predictions, the actual direction is different from prediction
            actual_direction = pred_type
            if not is_correct:
                actual_direction = labels[(labels.index(pred_type) + 1) % 3]
            
            # Calculate a price change consistent with the actual direction
            price_change_pct = 0.0
            if actual_direction == 'BUY':
                price_change_pct = 0.5 + (i % 5) * 0.1  # 0.5% to 0.9% increase
            elif actual_direction == 'SELL':
                price_change_pct = -0.5 - (i % 5) * 0.1  # -0.5% to -0.9% decrease
            
            # Create timestamp and adjust for each record
            timestamp = base_time + timedelta(hours=i)
            
            # Create the prediction record
            prediction = {
                'timestamp': timestamp,
                'symbol': self.symbol,
                'interval': self.interval,
                'current_price': 50000 + (i * 10),  # Starting price with small changes
                'prediction': pred_type,
                'confidence': confidence,
                'actual_direction': actual_direction,
                'price_change_pct': price_change_pct,
                'future_price': 50000 + (i * 10) * (1 + price_change_pct/100),
                'was_correct': is_correct,
                'rsi_14': 50 + (i % 20) - 10,  # RSI between 40-60
                'macd': -10 + i % 20,  # MACD between -10 and 10
                'bb_upper': 50500 + (i * 10),
                'bb_lower': 49500 + (i * 10),
                'ema_20': 50000 + (i * 8)
            }
            
            predictions.append(prediction)
        
        return predictions
    
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
        
        # Recall calculations require identifying actual positives
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
    
    def save_report(self, output_path: str = None, format_type: str = 'both') -> Dict[str, str]:
        """
        Save the validation report to CSV and/or JSON files.
        
        Args:
            output_path: Custom path for the output file (without extension)
            format_type: Format type for the report ('csv', 'json', or 'both')
            
        Returns:
            Dictionary containing paths to saved report files
        """
        # Create output directory
        output_dir = os.path.join(current_dir, 'validation_reports')
        os.makedirs(output_dir, exist_ok=True)
        
        # Generate timestamp for filenames
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Prepare file paths
        paths = {"csv": "", "json": ""}
        
        # Create base file name without extension
        if output_path is None:
            base_filename = f"simple_validation_{self.symbol.lower()}_{timestamp}"
        else:
            # Remove extension if present
            base_filename = os.path.splitext(output_path)[0]
        
        # Generate report summary for JSON
        summary_data = self.generate_summary_data()
        
        # Save in requested format(s)
        if format_type in ['csv', 'both']:
            csv_path = os.path.join(output_dir, f"{base_filename}.csv")
            self.report_df.to_csv(csv_path, index=False)
            logging.info(f"CSV report saved to {csv_path}")
            paths["csv"] = csv_path
        
        if format_type in ['json', 'both']:
            # Create JSON report with summary data
            json_path = os.path.join(output_dir, f"{base_filename}.json")
            
            # Combine detailed report data with summary metrics
            json_data = {
                "metadata": {
                    "symbol": self.symbol,
                    "interval": self.interval,
                    "model_type": self.model_type,
                    "generated_at": datetime.now().isoformat()
                },
                "summary": summary_data,
                "predictions": self.predictions
            }
            
            # Write JSON report
            with open(json_path, 'w') as f:
                json.dump(json_data, f, indent=2, default=str)
            
            logging.info(f"JSON report saved to {json_path}")
            paths["json"] = json_path
        
        logging.info(f"Reports generated in format: {format_type}")
        return paths
    
    def print_summary(self) -> None:
        """
        Print a summary of the validation results to the console.
        """
        # Get the summary data
        summary = self.generate_summary_data()
        if not summary:
            print("Failed to generate summary data")
            return
            
        print("\n" + "="*80)
        print(f"VALIDATION SUMMARY: {self.symbol} ({self.model_type} model)")
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
        
        print("="*80 + "\n")


def verify_csv_report(path: str) -> Dict[str, Any]:
    """
    Verify the structure and content of a CSV validation report.
    
    Args:
        path: Path to the CSV report file
        
    Returns:
        Dictionary with verification results
    """
    logging.info(f"Verifying CSV report: {path}")
    
    if not os.path.exists(path):
        logging.error(f"CSV report not found at {path}")
        return {'success': False, 'error': 'File not found'}
    
    try:
        df = pd.read_csv(path)
        verification_results = {
            'success': True,
            'row_count': len(df),
            'column_count': len(df.columns),
            'columns': list(df.columns),
            'has_required_columns': all(col in df.columns for col in [
                'timestamp', 'symbol', 'prediction', 'confidence', 
                'actual_direction', 'was_correct'
            ])
        }
        
        # Check for missing values in critical columns
        critical_columns = ['prediction', 'confidence', 'actual_direction', 'was_correct']
        missing_values = {col: df[col].isnull().sum() for col in critical_columns if col in df.columns}
        verification_results['missing_values'] = missing_values
        
        logging.info(f"CSV verification results: {verification_results}")
        return verification_results
    
    except Exception as e:
        logging.error(f"Error verifying CSV report: {e}")
        return {'success': False, 'error': str(e)}


def verify_json_report(path: str) -> Dict[str, Any]:
    """
    Verify the structure and content of a JSON validation report.
    
    Args:
        path: Path to the JSON report file
        
    Returns:
        Dictionary with verification results
    """
    logging.info(f"Verifying JSON report: {path}")
    
    if not os.path.exists(path):
        logging.error(f"JSON report not found at {path}")
        return {'success': False, 'error': 'File not found'}
    
    try:
        with open(path, 'r') as f:
            data = json.load(f)
        
        # Check required sections
        verification_results = {
            'success': True,
            'has_metadata': 'metadata' in data,
            'has_summary': 'summary' in data,
            'has_predictions': 'predictions' in data
        }
        
        # Check required fields in summary section
        if 'summary' in data:
            summary = data['summary']
            required_summary_fields = [
                'total_predictions', 'correct_predictions', 'overall_accuracy',
                'average_confidence', 'class_breakdown', 'classification_metrics',
                'profitability'
            ]
            verification_results['summary_has_required_fields'] = all(
                field in summary for field in required_summary_fields
            )
            
            # Verify classification metrics for BUY and SELL
            if 'classification_metrics' in summary:
                metrics = summary['classification_metrics']
                verification_results['has_buy_metrics'] = 'BUY' in metrics
                verification_results['has_sell_metrics'] = 'SELL' in metrics
                
                for trade_type in ['BUY', 'SELL']:
                    if trade_type in metrics:
                        required_metric_fields = ['precision', 'recall', 'f1_score', 'win_ratio']
                        verification_results[f'{trade_type.lower()}_metrics_complete'] = all(
                            field in metrics[trade_type] for field in required_metric_fields
                        )
        
        logging.info(f"JSON verification results: {verification_results}")
        return verification_results
    
    except Exception as e:
        logging.error(f"Error verifying JSON report: {e}")
        return {'success': False, 'error': str(e)}


def main():
    print("\n===== Simple Validation Report Export Test =====")
    print("Using mock data to test report generation")
    
    try:
        # Create validator with mock data
        validator = SimpleValidator()
        
        # Print sample summary
        validator.print_summary()
        
        # Test different output formats
        formats = ['csv', 'json', 'both']
        results = {}
        
        for format_type in formats:
            output_filename = f"simple_test_{format_type}"
            report_paths = validator.save_report(output_filename, format_type)
            results[format_type] = report_paths
            print(f"Generated {format_type.upper()} report: {report_paths}")
        
        # Verify CSV report
        csv_path = None
        if 'csv' in results and results['csv'] and isinstance(results['csv'], dict) and 'csv' in results['csv']:
            csv_path = results['csv']['csv']
        elif 'csv' in results and isinstance(results['csv'], str) and results['csv']:
            csv_path = results['csv']
            
        if csv_path:
            logging.info(f"Verifying CSV report: {csv_path}")
            csv_verification = verify_csv_report(csv_path)
            print(f"\nCSV Verification: {'PASSED' if csv_verification['success'] else 'FAILED'}")
            if csv_verification['success']:
                print(f"  Rows: {csv_verification['row_count']}")
                print(f"  Columns: {csv_verification['column_count']}")
                print(f"  Required columns present: {csv_verification['has_required_columns']}")
        
        # Verify JSON report
        json_path = None
        if 'json' in results and results['json'] and isinstance(results['json'], dict) and 'json' in results['json']:
            json_path = results['json']['json']
        elif 'json' in results and isinstance(results['json'], str) and results['json']:
            json_path = results['json']
            
        if json_path:
            logging.info(f"Verifying JSON report: {json_path}")
            json_verification = verify_json_report(json_path)
            print(f"\nJSON Verification: {'PASSED' if json_verification['success'] else 'FAILED'}")
            if json_verification['success']:
                print(f"  Metadata section present: {json_verification['has_metadata']}")
                print(f"  Summary section present: {json_verification['has_summary']}")
                print(f"  Predictions section present: {json_verification['has_predictions']}")
                
                if json_verification.get('summary_has_required_fields'):
                    print("  Summary section contains all required fields")
        
        print("\nTest completed successfully")
        return 0
    
    except Exception as e:
        logging.error(f"Test failed with error: {e}")
        print(f"\nTest failed with error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())