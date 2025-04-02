#!/usr/bin/env python3
"""
Test script for the Historical Prediction Validator

This script runs the historical prediction validator on a sample dataset
to verify it works properly.
"""

import os
import sys
import time
from datetime import datetime

# Add parent directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# Import the validator
from historical_prediction_validator import HistoricalPredictionValidator

def run_test():
    """Run a basic test of the historical prediction validator"""
    print("=" * 80)
    print(f"TESTING HISTORICAL PREDICTION VALIDATOR")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 80)
    
    # Test parameters
    symbol = "BTCUSDT"
    interval = "1h"
    days = 3
    model_type = "balanced"
    confidence_threshold = 0.6
    
    print(f"\nTest configuration:")
    print(f"- Symbol: {symbol}")
    print(f"- Interval: {interval}")
    print(f"- Historical period: {days} days")
    print(f"- Model type: {model_type}")
    print(f"- Confidence threshold: {confidence_threshold}")
    
    # Create validator
    start_time = time.time()
    print("\nInitializing validator...")
    validator = HistoricalPredictionValidator(
        symbol=symbol,
        interval=interval,
        model_type=model_type,
        days=days,
        confidence_threshold=confidence_threshold
    )
    
    # Load model
    print("\nLoading prediction model...")
    if not validator.load_model():
        print("ERROR: Failed to load model")
        return False
    
    # Fetch historical data
    print("\nFetching historical data...")
    historical_data = validator.fetch_historical_data()
    if historical_data is None or historical_data.empty:
        print("ERROR: Failed to fetch historical data")
        return False
    
    print(f"Successfully fetched {len(historical_data)} candles")
    
    # Run validation
    print("\nRunning validation process...")
    results = validator.run_validation()
    if not results:
        print("ERROR: Validation process failed")
        return False
    
    print(f"Completed {len(results)} predictions")
    
    # Create report
    print("\nCreating validation report...")
    report = validator.create_report()
    if report is None or report.empty:
        print("ERROR: Failed to create report")
        return False
    
    # Save report
    print("\nSaving validation report...")
    report_path = validator.save_report()
    if not report_path or not os.path.exists(report_path):
        print("ERROR: Failed to save report")
        return False
    
    print(f"Report saved to: {report_path}")
    
    # Print summary
    print("\nValidation summary:")
    validator.print_summary()
    
    # Measure execution time
    end_time = time.time()
    elapsed_time = end_time - start_time
    print(f"\nTest completed in {elapsed_time:.2f} seconds")
    
    # Run report analyzer
    try:
        print("\nRunning report analyzer...")
        from simple_report_analyzer import main as analyze_report
        import sys
        sys.argv = ['simple_report_analyzer.py', f'--report={report_path}']
        analyze_report()
        print("\nReport analysis complete!")
    except Exception as e:
        print(f"WARNING: Failed to run report analyzer: {e}")
    
    return True

if __name__ == "__main__":
    success = run_test()
    sys.exit(0 if success else 1)