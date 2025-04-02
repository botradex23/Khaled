#!/usr/bin/env python3
"""
Test script for validation report export functionality

This script tests the enhanced historical prediction validator's ability to:
1. Generate reports in different formats (CSV, JSON, both)
2. Include comprehensive validation metrics
3. Verify the structure and content of generated reports

Usage:
    python test_validation_report_export.py

The script uses a minimal dataset to quickly validate functionality.
"""

import os
import sys
import json
import logging
import pandas as pd
from datetime import datetime
from typing import Dict, Any

# Add the parent directory to the path to import from python_app
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Configure logging
log_dir = os.path.join(os.path.dirname(current_dir), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'test_validation_report_export.log')
logging.basicConfig(
    level=logging.DEBUG,  # Set to DEBUG for more detailed logging
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

# Print startup message to help with debugging
print("Starting test_validation_report_export.py")
logging.info("Starting test_validation_report_export.py")

try:
    from historical_prediction_validator import HistoricalPredictionValidator, create_validation_dirs
except ImportError as e:
    logging.error(f"Failed to import required modules: {e}")
    print(f"Error: {e}")
    print("Please make sure you're running this script from the python_app directory.")
    sys.exit(1)


def run_small_validation(symbol: str = 'BTCUSDT', interval: str = '1h', days: int = 1) -> Dict[str, Any]:
    """
    Run a small validation test to verify report generation.
    
    Args:
        symbol: Trading pair symbol
        interval: Timeframe interval
        days: Number of days to analyze
        
    Returns:
        Dictionary with test results
    """
    output_dir = create_validation_dirs()
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    test_output_base = f"test_validation_{symbol.lower()}_{interval}_{timestamp}"
    
    logging.info(f"Starting validation test with {symbol} {interval} data for {days} day(s)")
    
    # Create validator instance with minimal data
    validator = HistoricalPredictionValidator(
        symbol=symbol,
        interval=interval,
        model_type='balanced',
        days=days,
        confidence_threshold=0.5
    )
    
    # Run validation
    validator.run_validation()
    validator.create_report()
    
    # Test different output formats
    formats = ['csv', 'json', 'both']
    results = {}
    
    for format_type in formats:
        output_filename = f"{test_output_base}_{format_type}"
        report_paths = validator.save_report(output_filename, format_type)
        results[format_type] = report_paths
        logging.info(f"Generated {format_type} report: {report_paths}")
    
    return results


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
    print("\n===== Validation Report Export Test =====")
    print("Testing with minimal dataset for quick verification")
    
    try:
        # Run validation with small dataset
        results = run_small_validation(days=1)
        print("\nReport generation results:")
        for format_type, paths in results.items():
            print(f"  {format_type.upper()} report paths: {paths}")
        
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
                
                if any(csv_verification['missing_values'].values()):
                    print("  Warning: Missing values detected in critical columns")
                    for col, count in csv_verification['missing_values'].items():
                        if count > 0:
                            print(f"    {col}: {count} missing values")
        
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
                    print(f"  BUY metrics complete: {json_verification.get('buy_metrics_complete', False)}")
                    print(f"  SELL metrics complete: {json_verification.get('sell_metrics_complete', False)}")
        
        print("\nTest completed successfully")
        return 0
    
    except Exception as e:
        logging.error(f"Test failed with error: {e}")
        print(f"\nTest failed with error: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())