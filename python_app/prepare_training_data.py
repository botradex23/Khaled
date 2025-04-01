"""
Prepare training data for ML models.

This script:
1. Loads validated OHLCV data
2. Calculates technical indicators
3. Generates target labels (BUY/SELL/HOLD)
4. Saves the processed data for ML training
"""

import os
import sys
import logging
import pandas as pd
import numpy as np
from datetime import datetime
import json

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'data_preparation.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

def calculate_technical_indicators(df):
    """
    Calculate technical indicators for the given DataFrame.
    
    Args:
        df: DataFrame with OHLCV data
        
    Returns:
        DataFrame with added technical indicators
    """
    # Make a copy to avoid modifying the original
    df = df.copy()
    
    # Ensure timestamp is the index for calculations
    df = df.set_index('timestamp')
    
    # 1. Simple Moving Averages (SMA)
    for window in [5, 10, 20, 50, 100]:
        df[f'sma_{window}'] = df['close'].rolling(window=window).mean()
    
    # 2. Exponential Moving Averages (EMA)
    for window in [5, 10, 20, 50, 100]:
        df[f'ema_{window}'] = df['close'].ewm(span=window, adjust=False).mean()
    
    # 3. Relative Strength Index (RSI)
    delta = df['close'].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    
    avg_gain = gain.rolling(window=14).mean()
    avg_loss = loss.rolling(window=14).mean()
    
    rs = avg_gain / avg_loss
    df['rsi_14'] = 100 - (100 / (1 + rs))
    
    # 4. MACD (Moving Average Convergence Divergence)
    df['ema_12'] = df['close'].ewm(span=12, adjust=False).mean()
    df['ema_26'] = df['close'].ewm(span=26, adjust=False).mean()
    df['macd'] = df['ema_12'] - df['ema_26']
    df['macd_signal'] = df['macd'].ewm(span=9, adjust=False).mean()
    df['macd_hist'] = df['macd'] - df['macd_signal']
    
    # 5. Bollinger Bands
    df['bb_middle'] = df['close'].rolling(window=20).mean()
    df['bb_std'] = df['close'].rolling(window=20).std()
    df['bb_upper'] = df['bb_middle'] + (df['bb_std'] * 2)
    df['bb_lower'] = df['bb_middle'] - (df['bb_std'] * 2)
    
    # 6. Average True Range (ATR)
    high_low = df['high'] - df['low']
    high_close = (df['high'] - df['close'].shift()).abs()
    low_close = (df['low'] - df['close'].shift()).abs()
    
    ranges = pd.concat([high_low, high_close, low_close], axis=1)
    true_range = ranges.max(axis=1)
    df['atr_14'] = true_range.rolling(14).mean()
    
    # 7. Price Rate of Change (ROC)
    df['roc_5'] = df['close'].pct_change(periods=5) * 100
    df['roc_10'] = df['close'].pct_change(periods=10) * 100
    df['roc_20'] = df['close'].pct_change(periods=20) * 100
    
    # 8. Stochastic Oscillator
    low_14 = df['low'].rolling(window=14).min()
    high_14 = df['high'].rolling(window=14).max()
    df['stoch_k'] = 100 * ((df['close'] - low_14) / (high_14 - low_14))
    df['stoch_d'] = df['stoch_k'].rolling(window=3).mean()
    
    # Reset index to get timestamp back as a column
    df = df.reset_index()
    
    return df

def generate_labels(df, forward_period=24, threshold_pct=1.5):
    """
    Generate target labels (BUY/SELL/HOLD) based on future price movement.
    
    Args:
        df: DataFrame with OHLCV data
        forward_period: Number of periods to look ahead
        threshold_pct: Price movement threshold to trigger BUY/SELL
        
    Returns:
        DataFrame with added target labels
    """
    # Make a copy to avoid modifying the original
    df = df.copy()
    
    # Calculate future price
    df['future_price'] = df['close'].shift(-forward_period)
    
    # Calculate price change percentage
    df['price_change_pct'] = (df['future_price'] - df['close']) / df['close'] * 100
    
    # Generate target labels
    conditions = [
        (df['price_change_pct'] > threshold_pct),  # Significant price increase
        (df['price_change_pct'] < -threshold_pct),  # Significant price decrease
    ]
    choices = ['BUY', 'SELL']
    df['target'] = np.select(conditions, choices, default='HOLD')
    
    # Create separate columns for one-hot encoding
    df['target_buy'] = (df['target'] == 'BUY').astype(int)
    df['target_sell'] = (df['target'] == 'SELL').astype(int)
    df['target_hold'] = (df['target'] == 'HOLD').astype(int)
    
    return df

def prepare_dataset(input_file, output_file, params=None):
    """
    Prepare a dataset for training.
    
    Args:
        input_file: Path to input CSV file
        output_file: Path to save processed data
        params: Optional parameters for label generation
        
    Returns:
        success: Boolean indicating success
        stats: Dictionary with statistics about the processed data
    """
    if params is None:
        params = {
            'forward_period': 24,  # 24 periods of 5min = 2 hours
            'threshold_pct': 1.5  # 1.5% price movement threshold
        }
        
    symbol = os.path.basename(input_file).replace('binance_', '').replace('_5m_data.csv', '').upper()
    logging.info(f"Preparing training data for {symbol} from {input_file}")
    
    # Load data
    try:
        df = pd.read_csv(input_file)
        logging.info(f"Loaded {len(df)} rows from {input_file}")
    except Exception as e:
        logging.error(f"Error loading data: {str(e)}")
        return False, {'error': str(e)}
    
    # Convert timestamp to datetime
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Calculate technical indicators
    logging.info(f"Calculating technical indicators for {symbol}")
    try:
        df = calculate_technical_indicators(df)
        logging.info(f"Added technical indicators to the dataset")
    except Exception as e:
        logging.error(f"Error calculating indicators: {str(e)}")
        return False, {'error': str(e)}
    
    # Generate target labels
    logging.info(f"Generating target labels with forward_period={params['forward_period']}, threshold_pct={params['threshold_pct']}")
    try:
        df = generate_labels(df, forward_period=params['forward_period'], threshold_pct=params['threshold_pct'])
        logging.info(f"Added target labels to the dataset")
    except Exception as e:
        logging.error(f"Error generating labels: {str(e)}")
        return False, {'error': str(e)}
    
    # Drop rows with NaN values
    initial_rows = len(df)
    df = df.dropna()
    final_rows = len(df)
    logging.info(f"Dropped {initial_rows - final_rows} rows with NaN values")
    
    # Get label distribution
    label_counts = df['target'].value_counts()
    label_distribution = label_counts.to_dict()
    
    # Save processed data
    try:
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        df.to_csv(output_file, index=False)
        logging.info(f"Saved processed data ({len(df)} rows) to {output_file}")
    except Exception as e:
        logging.error(f"Error saving processed data: {str(e)}")
        return False, {'error': str(e)}
    
    # Calculate data statistics
    stats = {
        'symbol': symbol,
        'input_file': input_file,
        'output_file': output_file,
        'initial_rows': initial_rows,
        'final_rows': final_rows,
        'dropped_rows': initial_rows - final_rows,
        'label_distribution': label_distribution,
        'feature_count': len(df.columns) - 1,  # Excluding the target column
        'time_range_start': df['timestamp'].min().isoformat(),
        'time_range_end': df['timestamp'].max().isoformat()
    }
    
    return True, stats

def prepare_all_datasets(input_dir, output_dir, report_path=None, params=None):
    """
    Prepare all datasets in the input directory.
    
    Args:
        input_dir: Directory with validated data files
        output_dir: Directory to save processed data
        report_path: Path to save preparation report
        params: Optional parameters for label generation
        
    Returns:
        bool: True if all preparations were successful
    """
    if not os.path.exists(input_dir):
        logging.error(f"Input directory {input_dir} does not exist")
        return False
    
    os.makedirs(output_dir, exist_ok=True)
    
    input_files = [f for f in os.listdir(input_dir) if f.endswith('.csv')]
    logging.info(f"Found {len(input_files)} CSV files in {input_dir}")
    
    results = []
    all_success = True
    
    for input_file in input_files:
        input_path = os.path.join(input_dir, input_file)
        output_path = os.path.join(output_dir, input_file.replace('_data.csv', '_processed.csv'))
        
        success, stats = prepare_dataset(input_path, output_path, params)
        results.append(stats)
        all_success = all_success and success
        
        if not success:
            logging.error(f"Failed to prepare dataset from {input_file}")
    
    # Generate report
    if report_path:
        os.makedirs(os.path.dirname(report_path), exist_ok=True)
        report = {
            'preparation_time': datetime.now().isoformat(),
            'input_directory': input_dir,
            'output_directory': output_dir,
            'files_processed': len(input_files),
            'all_successful': all_success,
            'parameters': params,
            'results': results
        }
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        logging.info(f"Saved preparation report to {report_path}")
        
        # Generate CSV summary report
        csv_report_path = report_path.replace('.json', '.csv')
        summary_rows = []
        
        for result in results:
            if 'error' in result:
                continue
                
            row = {
                'symbol': result['symbol'],
                'input_file': result['input_file'],
                'output_file': result['output_file'],
                'initial_rows': result['initial_rows'],
                'final_rows': result['final_rows'],
                'dropped_rows': result['dropped_rows'],
                'feature_count': result['feature_count'],
                'buy_labels': result['label_distribution'].get('BUY', 0),
                'sell_labels': result['label_distribution'].get('SELL', 0),
                'hold_labels': result['label_distribution'].get('HOLD', 0),
                'time_range': f"{result['time_range_start']} to {result['time_range_end']}"
            }
            summary_rows.append(row)
        
        summary_df = pd.DataFrame(summary_rows)
        summary_df.to_csv(csv_report_path, index=False)
        logging.info(f"Saved CSV summary report to {csv_report_path}")
    
    logging.info(f"Processed {len(input_files)} files with {len(results)} successes")
    return all_success

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Prepare cryptocurrency data for ML training')
    parser.add_argument('--input-dir', default='data/validated', help='Directory with validated data files')
    parser.add_argument('--output-dir', default='data/processed', help='Directory to save processed data')
    parser.add_argument('--report', default='data/preparation_report.json', help='Path to save preparation report')
    parser.add_argument('--forward-period', type=int, default=24, help='Number of periods to look ahead for labeling')
    parser.add_argument('--threshold-pct', type=float, default=1.5, help='Price movement threshold percentage for buy/sell signals')
    
    args = parser.parse_args()
    
    params = {
        'forward_period': args.forward_period,
        'threshold_pct': args.threshold_pct
    }
    
    success = prepare_all_datasets(args.input_dir, args.output_dir, args.report, params)
    
    logging.info(f"\nData preparation {'COMPLETED SUCCESSFULLY' if success else 'FAILED'}")
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)