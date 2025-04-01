"""
Check the continuity of time intervals in the fetched data.
"""

import pandas as pd
import sys

def check_data_continuity(csv_path):
    """Check if there are any gaps in the time series data."""
    print(f"Checking continuity for: {csv_path}")
    
    # Load the data
    df = pd.read_csv(csv_path)
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    # Sort by timestamp to ensure proper order
    df = df.sort_values('timestamp')
    
    # Calculate time differences
    time_diff = df['timestamp'].diff()
    
    # Expected interval
    expected_interval = pd.Timedelta(minutes=5)
    
    # Check for unexpected intervals (excluding first row which has NaN diff)
    unexpected = time_diff[1:][time_diff[1:] != expected_interval]
    
    # Output statistics
    print(f"Total records: {len(df)}")
    print(f"Time range: {df['timestamp'].min()} to {df['timestamp'].max()}")
    print(f"Min time difference: {time_diff.min()}")
    print(f"Max time difference: {time_diff.max()}")
    print(f"Standard deviation: {time_diff.std()}")
    print(f"Unexpected intervals: {len(unexpected)} out of {len(df)-1}")
    
    if len(unexpected) > 0:
        print(f"Sample unexpected intervals:")
        display_rows = min(5, len(unexpected))
        for idx in unexpected.index[:display_rows]:
            prev_time = df.loc[idx-1, 'timestamp'] if idx > 0 else None
            curr_time = df.loc[idx, 'timestamp']
            diff = time_diff.loc[idx]
            print(f"  Row {idx}: {prev_time} -> {curr_time} (diff: {diff})")
    else:
        print("No gaps found in the data - all intervals are exactly 5 minutes.")
    
    # Check for duplicate timestamps
    duplicates = df[df.duplicated('timestamp')]
    if len(duplicates) > 0:
        print(f"Found {len(duplicates)} duplicate timestamps:")
        print(duplicates.head())
    else:
        print("No duplicate timestamps found.")
    
    return len(unexpected) == 0 and len(duplicates) == 0

if __name__ == "__main__":
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    else:
        csv_path = "data/binance_btcusdt_5m_data.csv"
    
    success = check_data_continuity(csv_path)
    print(f"\nData continuity check {'PASSED' if success else 'FAILED'}")
    
    # Return appropriate exit code
    sys.exit(0 if success else 1)