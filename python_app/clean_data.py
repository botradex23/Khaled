"""
Data Cleaning Script for OHLCV Datasets

This script performs thorough data cleaning on OHLCV datasets to prepare them for
feature engineering and model training. The cleaning process includes:
1. Removing duplicate rows
2. Handling missing values
3. Detecting and handling outliers
4. Normalizing timestamps
5. Logging cleaning results
6. Saving cleaned datasets

"""

import os
import sys
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timezone
import pytz
from typing import Dict, List, Tuple, Any

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'data_cleaning.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

def remove_duplicates(df: pd.DataFrame) -> Tuple[pd.DataFrame, int]:
    """
    Remove duplicate rows from the DataFrame.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Tuple containing the cleaned DataFrame and the number of duplicates removed
    """
    initial_rows = len(df)
    
    # Check for duplicate timestamps
    df = df.drop_duplicates(subset=['timestamp'], keep='first')
    
    # Calculate number of duplicates removed
    duplicates_removed = initial_rows - len(df)
    
    if duplicates_removed > 0:
        logging.info(f"Removed {duplicates_removed} duplicate rows")
    else:
        logging.info("No duplicate rows found")
    
    return df, duplicates_removed

def handle_missing_values(df: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, int], int]:
    """
    Detect and handle missing values in the DataFrame.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Tuple containing the cleaned DataFrame, a dictionary of missing values count by column,
        and the total number of rows with missing values
    """
    # Check for missing values
    missing_values = df.isnull().sum().to_dict()
    total_missing_rows = df.isnull().any(axis=1).sum()
    
    if total_missing_rows > 0:
        logging.info(f"Found {total_missing_rows} rows with missing values")
        logging.info(f"Missing values by column: {missing_values}")
        
        # Handle missing timestamps
        if missing_values.get('timestamp', 0) > 0:
            logging.warning("Found missing timestamps - these rows will be dropped")
            df = df.dropna(subset=['timestamp'])
        
        # For OHLCV data, use forward fill for missing prices
        price_columns = ['open', 'high', 'low', 'close']
        for col in price_columns:
            if missing_values.get(col, 0) > 0:
                logging.info(f"Forward filling missing values in {col}")
                df[col] = df[col].fillna(method='ffill')
        
        # For volume, use zero for missing values
        if missing_values.get('volume', 0) > 0:
            logging.info("Filling missing volume values with zero")
            df['volume'] = df['volume'].fillna(0)
        
        # Check if any missing values remain
        remaining_missing = df.isnull().sum().sum()
        if remaining_missing > 0:
            logging.warning(f"{remaining_missing} missing values remain after handling")
            # Drop any remaining rows with missing values
            df = df.dropna()
            logging.info(f"Dropped remaining rows with missing values. New row count: {len(df)}")
    else:
        logging.info("No missing values found")
    
    return df, missing_values, total_missing_rows

def detect_and_handle_outliers(df: pd.DataFrame, method='iqr', threshold=3.0) -> Tuple[pd.DataFrame, Dict[str, List[Dict[str, Any]]]]:
    """
    Detect and handle outliers in the OHLCV data.
    
    Args:
        df: Input DataFrame
        method: Method to use for outlier detection ('iqr' or 'zscore')
        threshold: Threshold for outlier detection (for z-score)
        
    Returns:
        Tuple containing the cleaned DataFrame and a dictionary of outliers by column
    """
    price_columns = ['open', 'high', 'low', 'close']
    volume_column = ['volume']
    all_columns = price_columns + volume_column
    
    outliers_by_column = {}
    original_row_count = len(df)
    
    for col in all_columns:
        if method == 'iqr':
            # IQR method
            Q1 = df[col].quantile(0.25)
            Q3 = df[col].quantile(0.75)
            IQR = Q3 - Q1
            
            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR
            
            # Identify outliers
            outliers = df[(df[col] < lower_bound) | (df[col] > upper_bound)]
        else:
            # Z-score method
            mean = df[col].mean()
            std = df[col].std()
            
            z_scores = abs((df[col] - mean) / std)
            outliers = df[z_scores > threshold]
        
        # Store outliers information for reporting
        if len(outliers) > 0:
            outliers_by_column[col] = []
            for _, row in outliers.iterrows():
                outliers_by_column[col].append({
                    'timestamp': row['timestamp'].isoformat() if isinstance(row['timestamp'], pd.Timestamp) else row['timestamp'],
                    'value': float(row[col]),
                    'index': int(row.name)
                })
            
            logging.info(f"Found {len(outliers)} outliers in {col} column")
            
            # Handle outliers differently depending on the column type
            if col in price_columns:
                # For price columns, replace with rolling median
                window_size = 5  # 5-row window
                
                for idx in outliers.index:
                    # Get window indices around the outlier
                    window_start = max(0, idx - window_size // 2)
                    window_end = min(len(df), idx + window_size // 2 + 1)
                    
                    # Get nearby rows excluding the outlier itself
                    nearby_rows = df.iloc[window_start:window_end].drop(idx, errors='ignore')
                    
                    if len(nearby_rows) > 0:
                        # Replace with median of nearby values
                        df.at[idx, col] = nearby_rows[col].median()
                        logging.debug(f"Replaced outlier at index {idx} in {col} with median of nearby values")
                    else:
                        # If no nearby rows available, keep as is but log warning
                        logging.warning(f"Could not replace outlier at index {idx} in {col} - no nearby values")
            
            elif col == 'volume':
                # For volume, consider zero volumes as potential errors in data collection
                zero_volume = outliers[outliers[col] == 0]
                if len(zero_volume) > 0:
                    logging.warning(f"Found {len(zero_volume)} rows with zero volume")
                    
                    # Handle zero volume by using the median of nearby values
                    for idx in zero_volume.index:
                        window_start = max(0, idx - 5)
                        window_end = min(len(df), idx + 6)
                        nearby_volumes = df.iloc[window_start:window_end].drop(idx, errors='ignore')['volume']
                        
                        if len(nearby_volumes) > 0 and nearby_volumes.median() > 0:
                            df.at[idx, 'volume'] = nearby_volumes.median()
                            logging.debug(f"Replaced zero volume at index {idx} with median of nearby values")
                
                # For extreme high volume outliers, cap them
                high_volume = outliers[outliers[col] > upper_bound]
                if len(high_volume) > 0:
                    logging.warning(f"Found {len(high_volume)} rows with extremely high volume")
                    df.loc[high_volume.index, 'volume'] = upper_bound
                    logging.info(f"Capped {len(high_volume)} high volume outliers at {upper_bound}")
    
    # Check for price inconsistencies (high < low, close outside high-low range)
    inconsistent_prices = df[(df['high'] < df['low']) | 
                            (df['close'] > df['high']) | 
                            (df['close'] < df['low']) |
                            (df['open'] > df['high']) |
                            (df['open'] < df['low'])]
    
    if len(inconsistent_prices) > 0:
        logging.warning(f"Found {len(inconsistent_prices)} rows with inconsistent price data")
        
        # Fix inconsistencies
        for idx, row in inconsistent_prices.iterrows():
            if row['high'] < row['low']:
                # Swap high and low
                temp = df.at[idx, 'high']
                df.at[idx, 'high'] = df.at[idx, 'low']
                df.at[idx, 'low'] = temp
                logging.debug(f"Swapped high and low values at index {idx}")
            
            # Ensure close is within high-low range
            if row['close'] > row['high']:
                df.at[idx, 'high'] = row['close']
                logging.debug(f"Adjusted high value to match close at index {idx}")
            elif row['close'] < row['low']:
                df.at[idx, 'low'] = row['close']
                logging.debug(f"Adjusted low value to match close at index {idx}")
            
            # Ensure open is within high-low range
            if row['open'] > row['high']:
                df.at[idx, 'high'] = row['open']
                logging.debug(f"Adjusted high value to match open at index {idx}")
            elif row['open'] < row['low']:
                df.at[idx, 'low'] = row['open']
                logging.debug(f"Adjusted low value to match open at index {idx}")
    
    total_outliers = sum(len(outliers) for outliers in outliers_by_column.values())
    if total_outliers > 0:
        logging.info(f"Total outliers detected and handled: {total_outliers}")
    else:
        logging.info("No outliers detected")
    
    return df, outliers_by_column

def normalize_timestamps(df: pd.DataFrame) -> Tuple[pd.DataFrame, bool]:
    """
    Normalize timestamps to ensure they are in proper datetime format and UTC timezone.
    
    Args:
        df: Input DataFrame
        
    Returns:
        Tuple containing the DataFrame with normalized timestamps and a flag indicating changes made
    """
    # Check if timestamp is already in datetime format
    if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        logging.info("Converting timestamp column to datetime")
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Check for timezone information
    sample_tz = None
    if len(df) > 0:
        sample_timestamp = df['timestamp'].iloc[0]
        sample_tz = sample_timestamp.tzinfo
    
    if sample_tz is None:
        logging.info("Timestamps do not have timezone information - assuming UTC")
        # Add UTC timezone to timestamps
        df['timestamp'] = df['timestamp'].dt.tz_localize('UTC')
        changes_made = True
    elif str(sample_tz) != 'UTC':
        logging.info(f"Converting timestamps from {sample_tz} to UTC")
        # Convert to UTC
        df['timestamp'] = df['timestamp'].dt.tz_convert('UTC')
        changes_made = True
    else:
        logging.info("Timestamps are already in UTC timezone")
        changes_made = False
    
    # Ensure timestamps are sorted and have no gaps
    df = df.sort_values('timestamp')
    
    # Check for timestamp gaps
    time_diffs = df['timestamp'].diff()[1:]  # Skip first row which will be NaN
    expected_diff = pd.Timedelta(minutes=5)
    unexpected_diffs = time_diffs[time_diffs != expected_diff]
    
    if len(unexpected_diffs) > 0:
        logging.warning(f"Found {len(unexpected_diffs)} gaps in timestamps")
        logging.info("First few unexpected intervals:")
        for i, (idx, diff) in enumerate(unexpected_diffs.items()[:5]):
            curr_ts = df.loc[idx, 'timestamp']
            prev_ts = df.loc[idx-1, 'timestamp'] if idx > 0 else None
            logging.info(f"  {i+1}. Gap at {curr_ts}: {diff} (Previous: {prev_ts})")
    else:
        logging.info("No gaps in timestamps")
    
    return df, changes_made

def clean_dataset(input_file: str, output_file: str) -> Dict[str, Any]:
    """
    Clean a dataset by removing duplicates, handling missing values, and normalizing timestamps.
    
    Args:
        input_file: Path to the input CSV file
        output_file: Path to save the cleaned CSV file
        
    Returns:
        Dictionary containing cleaning statistics and results
    """
    symbol = os.path.basename(input_file).replace('binance_', '').replace('_5m_data.csv', '').upper()
    logging.info(f"=== Cleaning {symbol} data from {input_file} ===")
    
    # Load data
    try:
        df = pd.read_csv(input_file)
        initial_rows = len(df)
        logging.info(f"Loaded {initial_rows} rows from {input_file}")
    except Exception as e:
        logging.error(f"Error loading data: {str(e)}")
        return {
            'symbol': symbol,
            'input_file': input_file,
            'output_file': output_file,
            'success': False,
            'error': str(e)
        }
    
    # Store original min/max values for comparison
    original_stats = {
        'row_count': len(df),
        'min_values': {col: float(df[col].min()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'max_values': {col: float(df[col].max()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'mean_values': {col: float(df[col].mean()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'time_range': [
            df['timestamp'].min() if isinstance(df['timestamp'].min(), str) 
            else pd.to_datetime(df['timestamp'].min()).isoformat(),
            df['timestamp'].max() if isinstance(df['timestamp'].max(), str)
            else pd.to_datetime(df['timestamp'].max()).isoformat()
        ]
    }
    
    # 1. Normalize timestamps
    logging.info("Normalizing timestamps...")
    df, timestamps_changed = normalize_timestamps(df)
    
    # 2. Remove duplicates
    logging.info("Removing duplicates...")
    df, duplicates_removed = remove_duplicates(df)
    
    # 3. Handle missing values
    logging.info("Handling missing values...")
    df, missing_values, total_missing_rows = handle_missing_values(df)
    
    # 4. Detect and handle outliers
    logging.info("Detecting and handling outliers...")
    df, outliers = detect_and_handle_outliers(df, method='iqr')
    
    # Calculate statistics for the cleaned data
    final_rows = len(df)
    rows_removed = initial_rows - final_rows
    
    cleaned_stats = {
        'row_count': final_rows,
        'min_values': {col: float(df[col].min()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'max_values': {col: float(df[col].max()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'mean_values': {col: float(df[col].mean()) for col in ['open', 'high', 'low', 'close', 'volume']},
        'time_range': [
            df['timestamp'].min().isoformat() if hasattr(df['timestamp'].min(), 'isoformat') 
            else pd.to_datetime(df['timestamp'].min()).isoformat(),
            df['timestamp'].max().isoformat() if hasattr(df['timestamp'].max(), 'isoformat')
            else pd.to_datetime(df['timestamp'].max()).isoformat()
        ]
    }
    
    # Save the cleaned data
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        # Convert timestamps back to string format for storage
        df['timestamp'] = df['timestamp'].dt.strftime('%Y-%m-%d %H:%M:%S')
        df.to_csv(output_file, index=False)
        logging.info(f"Saved cleaned data ({final_rows} rows) to {output_file}")
        success = True
    except Exception as e:
        logging.error(f"Error saving cleaned data: {str(e)}")
        success = False
    
    # Prepare cleaning report
    cleaning_report = {
        'symbol': symbol,
        'input_file': input_file,
        'output_file': output_file,
        'success': success,
        'cleaning_timestamp': datetime.now().isoformat(),
        'original_rows': initial_rows,
        'cleaned_rows': final_rows,
        'rows_removed': rows_removed,
        'duplicates_removed': duplicates_removed,
        'missing_values': missing_values,
        'timestamps_changed': timestamps_changed,
        'outliers_detected': {col: len(outliers_list) for col, outliers_list in outliers.items()},
        'original_stats': original_stats,
        'cleaned_stats': cleaned_stats
    }
    
    # Log summary
    logging.info(f"=== Cleaning Summary for {symbol} ===")
    logging.info(f"Original rows: {initial_rows}")
    logging.info(f"Cleaned rows: {final_rows}")
    logging.info(f"Rows removed: {rows_removed}")
    logging.info(f"Duplicates removed: {duplicates_removed}")
    logging.info(f"Missing values handled: {total_missing_rows}")
    logging.info(f"Timestamps normalized: {timestamps_changed}")
    logging.info(f"Outliers detected and handled: {sum(len(outliers_list) for outliers_list in outliers.values())}")
    
    return cleaning_report

def clean_all_datasets(input_dir: str, output_dir: str, report_path: str = None) -> Dict[str, Any]:
    """
    Clean all datasets in the input directory.
    
    Args:
        input_dir: Directory containing the input CSV files
        output_dir: Directory to save the cleaned CSV files
        report_path: Path to save the cleaning report
        
    Returns:
        Dictionary containing cleaning report
    """
    os.makedirs(output_dir, exist_ok=True)
    
    # Get list of CSV files in input directory
    input_files = [os.path.join(input_dir, f) for f in os.listdir(input_dir) 
                 if f.endswith('.csv') and f.startswith('binance_')]
    
    logging.info(f"Found {len(input_files)} CSV files to clean in {input_dir}")
    
    # Clean each dataset
    cleaning_reports = []
    for input_file in input_files:
        output_file = os.path.join(output_dir, os.path.basename(input_file))
        cleaning_report = clean_dataset(input_file, output_file)
        cleaning_reports.append(cleaning_report)
    
    # Prepare overall report
    overall_report = {
        'cleaning_timestamp': datetime.now().isoformat(),
        'input_directory': input_dir,
        'output_directory': output_dir,
        'files_processed': len(input_files),
        'files_succeeded': sum(1 for report in cleaning_reports if report['success']),
        'files_failed': sum(1 for report in cleaning_reports if not report['success']),
        'cleaning_reports': cleaning_reports
    }
    
    # Save report
    if report_path:
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        with open(report_path, 'w') as f:
            json.dump(overall_report, f, indent=2)
        logging.info(f"Saved cleaning report to {report_path}")
        
        # Generate CSV summary report
        csv_report_path = report_path.replace('.json', '.csv')
        summary_rows = []
        
        for report in cleaning_reports:
            if not report['success']:
                continue
                
            row = {
                'symbol': report['symbol'],
                'input_file': report['input_file'],
                'output_file': report['output_file'],
                'original_rows': report['original_rows'],
                'cleaned_rows': report['cleaned_rows'],
                'rows_removed': report['rows_removed'],
                'duplicates_removed': report['duplicates_removed'],
                'timestamps_changed': report['timestamps_changed'],
                'outliers_detected': sum(report['outliers_detected'].values()),
                'time_range': f"{report['cleaned_stats']['time_range'][0]} to {report['cleaned_stats']['time_range'][1]}"
            }
            summary_rows.append(row)
        
        if summary_rows:
            summary_df = pd.DataFrame(summary_rows)
            summary_df.to_csv(csv_report_path, index=False)
            logging.info(f"Saved CSV summary report to {csv_report_path}")
    
    # Log summary
    logging.info("=== Overall Cleaning Summary ===")
    logging.info(f"Files processed: {len(input_files)}")
    logging.info(f"Files cleaned successfully: {overall_report['files_succeeded']}")
    logging.info(f"Files with errors: {overall_report['files_failed']}")
    
    return overall_report

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Clean OHLCV datasets for ML training')
    parser.add_argument('--input-dir', default='data/validated', help='Directory with validated data files')
    parser.add_argument('--output-dir', default='data/cleaned', help='Directory to save cleaned data')
    parser.add_argument('--report', default='data/cleaning_report.json', help='Path to save cleaning report')
    
    args = parser.parse_args()
    
    # Clean all datasets
    report = clean_all_datasets(args.input_dir, args.output_dir, args.report)
    
    # Exit with appropriate code
    success = report['files_succeeded'] == report['files_processed']
    sys.exit(0 if success else 1)