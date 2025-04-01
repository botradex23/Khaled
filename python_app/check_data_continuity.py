"""
Check the continuity of time intervals in the fetched data.

This script analyzes the fetched cryptocurrency data to ensure:
1. There are no gaps in the time series (all 5-minute intervals are present)
2. There are no duplicate timestamps
3. All necessary data columns are present and have the correct types

The validation results are saved to a log file and optionally copied to a validation report.
"""

import os
import sys
import json
import logging
import pandas as pd
from datetime import datetime

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'data_validation.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

def check_data_continuity(csv_path, validated_dir=None):
    """
    Check if there are any gaps in the time series data.
    
    Args:
        csv_path: Path to the CSV file to validate
        validated_dir: Optional directory to save validated data
        
    Returns:
        tuple: (success_flag, validation_report)
    """
    symbol = os.path.basename(csv_path).replace('binance_', '').replace('_5m_data.csv', '').upper()
    
    logging.info(f"Starting validation for {symbol} data: {csv_path}")
    
    validation_results = {
        "symbol": symbol,
        "file": csv_path,
        "validation_time": datetime.now().isoformat(),
        "tests": {},
        "overall_result": "PENDING"
    }
    
    # Test 1: File existence
    if not os.path.exists(csv_path):
        logging.error(f"File not found: {csv_path}")
        validation_results["tests"]["file_exists"] = False
        validation_results["overall_result"] = "FAILED"
        return False, validation_results
    
    validation_results["tests"]["file_exists"] = True
    
    # Load the data
    try:
        df = pd.read_csv(csv_path)
        validation_results["tests"]["file_readable"] = True
    except Exception as e:
        logging.error(f"Error reading file: {str(e)}")
        validation_results["tests"]["file_readable"] = False
        validation_results["overall_result"] = "FAILED"
        return False, validation_results
    
    # Test 2: Required columns
    required_columns = ["timestamp", "open", "high", "low", "close", "volume"]
    missing_columns = [col for col in required_columns if col not in df.columns]
    
    if missing_columns:
        logging.error(f"Missing required columns: {missing_columns}")
        validation_results["tests"]["required_columns"] = False
        validation_results["missing_columns"] = missing_columns
        validation_results["overall_result"] = "FAILED"
        return False, validation_results
    
    validation_results["tests"]["required_columns"] = True
    
    # Test 3: No null values
    null_counts = df[required_columns].isnull().sum().to_dict()
    has_nulls = any(count > 0 for count in null_counts.values())
    
    validation_results["tests"]["no_null_values"] = not has_nulls
    validation_results["null_counts"] = null_counts
    
    if has_nulls:
        logging.error(f"Found null values in data: {null_counts}")
        validation_results["overall_result"] = "FAILED"
        return False, validation_results
    
    # Convert timestamp to datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Test 4: Sort by timestamp to ensure proper order
    df = df.sort_values('timestamp')
    
    # Test 5: Calculate time differences
    time_diff = df['timestamp'].diff()
    
    # Expected interval
    expected_interval = pd.Timedelta(minutes=5)
    
    # Check for unexpected intervals (excluding first row which has NaN diff)
    unexpected = time_diff[1:][time_diff[1:] != expected_interval]
    
    # Store dataset stats
    validation_results["dataset_stats"] = {
        "total_records": len(df),
        "time_range_start": df['timestamp'].min().isoformat(),
        "time_range_end": df['timestamp'].max().isoformat(),
        "min_time_diff": str(time_diff.min()),
        "max_time_diff": str(time_diff.max()),
        "std_dev_time_diff": str(time_diff.std()),
        "unexpected_intervals_count": len(unexpected),
        "total_intervals": len(df) - 1
    }
    
    logging.info(f"Dataset stats for {symbol}:")
    logging.info(f"  Total records: {len(df)}")
    logging.info(f"  Time range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    logging.info(f"  Unexpected intervals: {len(unexpected)} out of {len(df)-1}")
    
    # Test 6: No time gaps
    validation_results["tests"]["no_time_gaps"] = len(unexpected) == 0
    
    if len(unexpected) > 0:
        logging.warning(f"Found {len(unexpected)} unexpected time intervals in {symbol} data")
        validation_results["unexpected_intervals"] = []
        
        display_rows = min(5, len(unexpected))
        for idx in unexpected.index[:display_rows]:
            prev_time = df.loc[idx-1, 'timestamp'] if idx > 0 else None
            curr_time = df.loc[idx, 'timestamp']
            diff = time_diff.loc[idx]
            
            interval_info = {
                "row_index": int(idx),
                "previous_timestamp": prev_time.isoformat() if prev_time else None,
                "current_timestamp": curr_time.isoformat(),
                "time_difference": str(diff)
            }
            
            validation_results["unexpected_intervals"].append(interval_info)
            logging.warning(f"  Row {idx}: {prev_time} -> {curr_time} (diff: {diff})")
    else:
        logging.info("No gaps found in the data - all intervals are exactly 5 minutes.")
    
    # Test 7: No duplicate timestamps
    duplicates = df[df.duplicated('timestamp')]
    validation_results["tests"]["no_duplicate_timestamps"] = len(duplicates) == 0
    
    if len(duplicates) > 0:
        logging.warning(f"Found {len(duplicates)} duplicate timestamps in {symbol} data")
        validation_results["duplicate_timestamps_count"] = len(duplicates)
        validation_results["duplicate_timestamps_sample"] = duplicates.head().to_dict('records')
    else:
        logging.info("No duplicate timestamps found.")
    
    # Test 8: Basic data range checks
    validation_results["tests"]["price_range_check"] = True
    
    # Check for unrealistic values (e.g., negative prices)
    for col in ['open', 'high', 'low', 'close', 'volume']:
        min_val = df[col].min()
        max_val = df[col].max()
        
        if col != 'volume' and min_val <= 0:
            logging.warning(f"Found invalid {col} price <= 0: {min_val}")
            validation_results["tests"]["price_range_check"] = False
        
        validation_results[f"{col}_range"] = {"min": float(min_val), "max": float(max_val)}
    
    # Check if high is always >= low
    invalid_high_low = df[df['high'] < df['low']]
    validation_results["tests"]["high_gte_low"] = len(invalid_high_low) == 0
    
    if len(invalid_high_low) > 0:
        logging.warning(f"Found {len(invalid_high_low)} records where high < low")
        validation_results["invalid_high_low_count"] = len(invalid_high_low)
        validation_results["invalid_high_low_sample"] = invalid_high_low.head().to_dict('records')
    
    # Determine overall validation result
    all_tests_passed = all(validation_results["tests"].values())
    validation_results["overall_result"] = "PASSED" if all_tests_passed else "FAILED"
    
    # Save validated data if validation passed and output directory provided
    if all_tests_passed and validated_dir:
        os.makedirs(validated_dir, exist_ok=True)
        output_path = os.path.join(validated_dir, os.path.basename(csv_path))
        df.to_csv(output_path, index=False)
        logging.info(f"Saved validated data to {output_path}")
        validation_results["validated_data_path"] = output_path
    
    logging.info(f"Validation for {symbol} {validation_results['overall_result']}")
    
    return all_tests_passed, validation_results

def validate_and_report(file_paths, validated_dir=None, report_path=None):
    """
    Validate multiple data files and generate a consolidated report.
    
    Args:
        file_paths: List of CSV files to validate
        validated_dir: Directory to save validated data
        report_path: Path to save the validation report
        
    Returns:
        bool: True if all validations passed
    """
    validation_results = []
    all_passed = True
    
    logging.info(f"Starting validation for {len(file_paths)} files")
    
    # Process each file
    for file_path in file_paths:
        success, result = check_data_continuity(file_path, validated_dir)
        validation_results.append(result)
        all_passed = all_passed and success
    
    # Generate report
    report = {
        "validation_time": datetime.now().isoformat(),
        "files_processed": len(file_paths),
        "files_passed": sum(1 for r in validation_results if r["overall_result"] == "PASSED"),
        "files_failed": sum(1 for r in validation_results if r["overall_result"] == "FAILED"),
        "results": validation_results
    }
    
    # Save report if path provided
    if report_path:
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        logging.info(f"Validation report saved to {report_path}")
    
    # Generate CSV report for a summary view
    if report_path:
        csv_report_path = report_path.replace('.json', '.csv')
        summary_rows = []
        
        for result in validation_results:
            row = {
                "symbol": result["symbol"],
                "file": result["file"],
                "result": result["overall_result"],
                "records": result["dataset_stats"]["total_records"] if "dataset_stats" in result else 0,
                "time_range": f"{result['dataset_stats']['time_range_start']} to {result['dataset_stats']['time_range_end']}" if "dataset_stats" in result else "N/A",
                "gaps": result["dataset_stats"]["unexpected_intervals_count"] if "dataset_stats" in result else "N/A",
                "duplicates": result.get("duplicate_timestamps_count", 0),
                "validated_path": result.get("validated_data_path", "Not saved")
            }
            summary_rows.append(row)
        
        # Convert to DataFrame and save as CSV
        summary_df = pd.DataFrame(summary_rows)
        summary_df.to_csv(csv_report_path, index=False)
        logging.info(f"CSV summary report saved to {csv_report_path}")
    
    # Print summary
    logging.info(f"Validation summary: {report['files_passed']} passed, {report['files_failed']} failed")
    
    return all_passed

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Validate cryptocurrency data files')
    parser.add_argument('--files', nargs='+', help='Paths to CSV files to validate')
    parser.add_argument('--validated-dir', default='data/validated', help='Directory to save validated data')
    parser.add_argument('--report', default='data/validation_report.json', help='Path to save validation report')
    
    args = parser.parse_args()
    
    # Use default files if none provided
    if not args.files:
        args.files = [
            "data/binance_btcusdt_5m_data.csv",
            "data/binance_ethusdt_5m_data.csv",
            "data/binance_solusdt_5m_data.csv"
        ]
    
    success = validate_and_report(args.files, args.validated_dir, args.report)
    
    logging.info(f"\nOverall data validation {'PASSED' if success else 'FAILED'}")
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)