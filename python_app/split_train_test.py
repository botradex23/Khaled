"""
Train/Test Split for ML Datasets

This script performs a chronological train/test split on the BTCUSDT dataset,
separating features from target labels and ensuring all data is properly prepared
for XGBoost training.

The split is done with 80% of data for training and 20% for testing, with the most
recent data being used for testing to simulate real-world prediction scenarios.
"""

import os
import pandas as pd
import numpy as np
import logging
from typing import Tuple
from sklearn.preprocessing import LabelEncoder

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'train_test_split.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)

def load_processed_data(file_path: str) -> pd.DataFrame:
    """
    Load the processed data file and convert categorical target to numerical
    if necessary.
    
    Args:
        file_path: Path to the processed CSV file
        
    Returns:
        DataFrame with loaded data
    """
    logging.info(f"Loading data from {file_path}")
    df = pd.read_csv(file_path)
    
    # Check if the timestamp is in datetime format
    if not pd.api.types.is_datetime64_any_dtype(df['timestamp']):
        logging.info("Converting timestamp to datetime format")
        df['timestamp'] = pd.to_datetime(df['timestamp'])
    
    logging.info(f"Loaded {len(df)} rows with {len(df.columns)} columns")
    return df

def preprocess_for_ml(df: pd.DataFrame) -> Tuple[pd.DataFrame, pd.Series, dict]:
    """
    Prepare the dataset for machine learning by:
    1. Separating features from target
    2. Converting categorical target to numerical labels
    3. Handling any NaN or infinite values
    
    Args:
        df: Input DataFrame with features and target
        
    Returns:
        Tuple containing (X, y, label_mapping)
    """
    logging.info("Preprocessing data for ML")
    
    # Drop timestamp column as it's not a feature
    X = df.drop(['timestamp', 'target', 'target_buy', 'target_sell', 'target_hold'], axis=1, errors='ignore')
    
    # Ensure all features are numerical
    for col in X.columns:
        if not pd.api.types.is_numeric_dtype(X[col]):
            logging.warning(f"Column {col} is not numeric. Converting to numeric.")
            X[col] = pd.to_numeric(X[col], errors='coerce')
    
    # Handle NaN values
    nan_cols = X.columns[X.isna().any()].tolist()
    if nan_cols:
        logging.warning(f"Found NaN values in columns: {nan_cols}")
        for col in nan_cols:
            logging.info(f"Filling NaN values in {col} with median")
            X[col] = X[col].fillna(X[col].median())
    
    # Handle infinite values
    inf_cols = X.columns[(np.isinf(X)).any()].tolist()
    if inf_cols:
        logging.warning(f"Found infinite values in columns: {inf_cols}")
        for col in inf_cols:
            logging.info(f"Replacing infinite values in {col} with median")
            X.loc[np.isinf(X[col]), col] = X[col].replace([np.inf, -np.inf], np.nan).median()
    
    # Get target variable
    y = df['target']
    
    # Check if target is categorical and needs encoding
    if y.dtype == object or y.dtype == 'category':
        logging.info("Target is categorical, encoding to numerical values")
        label_encoder = LabelEncoder()
        y = label_encoder.fit_transform(y)
        
        # Create mapping for later reference
        label_mapping = {index: label for index, label in enumerate(label_encoder.classes_)}
        logging.info(f"Label mapping: {label_mapping}")
    else:
        logging.info("Target is already numerical")
        label_mapping = {}
    
    logging.info(f"X shape: {X.shape}, y shape: {y.shape}")
    return X, y, label_mapping

def chronological_train_test_split(X: pd.DataFrame, y: pd.Series, test_size: float = 0.2) -> Tuple[pd.DataFrame, pd.DataFrame, pd.Series, pd.Series]:
    """
    Split the data chronologically, with the most recent data in the test set.
    
    Args:
        X: Feature DataFrame
        y: Target Series
        test_size: Proportion of data to use for testing (default: 0.2)
        
    Returns:
        Tuple containing (X_train, X_test, y_train, y_test)
    """
    logging.info(f"Performing chronological train/test split with test_size={test_size}")
    
    # Calculate the split point
    split_idx = int(len(X) * (1 - test_size))
    
    # Split the data
    X_train = X.iloc[:split_idx, :]
    X_test = X.iloc[split_idx:, :]
    y_train = y[:split_idx]
    y_test = y[split_idx:]
    
    logging.info(f"Training set size: {len(X_train)}, Test set size: {len(X_test)}")
    return X_train, X_test, y_train, y_test

def analyze_class_distribution(y_train: pd.Series, y_test: pd.Series, label_mapping: dict = None) -> dict:
    """
    Analyze the distribution of classes in the training and test sets.
    
    Args:
        y_train: Training target values
        y_test: Test target values
        label_mapping: Mapping from numeric labels to original class names
        
    Returns:
        Dictionary with class distribution statistics
    """
    logging.info("Analyzing class distribution")
    
    # Count occurrences of each class
    train_counts = pd.Series(y_train).value_counts().to_dict()
    test_counts = pd.Series(y_test).value_counts().to_dict()
    
    # If label mapping exists, map numeric labels back to class names
    if label_mapping:
        train_counts_named = {}
        test_counts_named = {}
        
        for num_label, count in train_counts.items():
            train_counts_named[label_mapping[num_label]] = count
            
        for num_label, count in test_counts.items():
            if num_label in label_mapping:  # Check if the label exists in the test set
                test_counts_named[label_mapping[num_label]] = count
            
        train_counts = train_counts_named
        test_counts = test_counts_named
    
    # Calculate percentages
    train_total = sum(train_counts.values())
    test_total = sum(test_counts.values())
    
    train_pct = {label: (count / train_total) * 100 for label, count in train_counts.items()}
    test_pct = {label: (count / test_total) * 100 for label, count in test_counts.items()}
    
    # Check for class imbalance
    class_counts = list(train_counts.values())
    imbalance_ratio = max(class_counts) / min(class_counts) if min(class_counts) > 0 else float('inf')
    
    # Create distribution report
    distribution = {
        'train_counts': train_counts,
        'train_percentages': train_pct,
        'test_counts': test_counts,
        'test_percentages': test_pct,
        'imbalance_ratio': imbalance_ratio,
        'has_significant_imbalance': imbalance_ratio > 10  # More than 10:1 ratio is considered significant
    }
    
    logging.info(f"Training class distribution: {train_counts}")
    logging.info(f"Testing class distribution: {test_counts}")
    logging.info(f"Class imbalance ratio: {imbalance_ratio:.2f}")
    
    if distribution['has_significant_imbalance']:
        logging.warning("Significant class imbalance detected. Consider using class balancing techniques.")
    
    return distribution

def save_train_test_data(X_train: pd.DataFrame, X_test: pd.DataFrame, y_train: pd.Series, 
                         y_test: pd.Series, output_dir: str, symbol: str = 'btcusdt') -> None:
    """
    Save the training and testing data to CSV files.
    
    Args:
        X_train: Training features
        X_test: Testing features
        y_train: Training target
        y_test: Testing target
        output_dir: Directory to save the output files
        symbol: Symbol name for the file prefix
    """
    logging.info(f"Saving train/test data to {output_dir}")
    os.makedirs(output_dir, exist_ok=True)
    
    # Convert y to DataFrame for easier CSV export
    y_train_df = pd.DataFrame(y_train, columns=['target'])
    y_test_df = pd.DataFrame(y_test, columns=['target'])
    
    # Save files
    X_train.to_csv(os.path.join(output_dir, f'X_train_{symbol}.csv'), index=False)
    X_test.to_csv(os.path.join(output_dir, f'X_test_{symbol}.csv'), index=False)
    y_train_df.to_csv(os.path.join(output_dir, f'y_train_{symbol}.csv'), index=False)
    y_test_df.to_csv(os.path.join(output_dir, f'y_test_{symbol}.csv'), index=False)
    
    logging.info(f"Saved X_train ({X_train.shape}), X_test ({X_test.shape}), y_train ({len(y_train)}), y_test ({len(y_test)})")
    
def main():
    """
    Main function to process the data, perform train/test split, and analyze class distribution.
    """
    # File paths
    processed_file_path = 'data/processed/binance_btcusdt_5m_processed.csv'
    output_dir = 'data/training'
    
    # Load data
    df = load_processed_data(processed_file_path)
    
    # Preprocess data for ML
    X, y, label_mapping = preprocess_for_ml(df)
    
    # Perform chronological train/test split
    X_train, X_test, y_train, y_test = chronological_train_test_split(X, y, test_size=0.2)
    
    # Analyze class distribution
    distribution = analyze_class_distribution(y_train, y_test, label_mapping)
    
    # Save train/test data
    save_train_test_data(X_train, X_test, y_train, y_test, output_dir)
    
    logging.info("Train/test split completed successfully")
    
    # Print summary with number of rows and columns in each file
    print("\n=== TRAIN/TEST SPLIT SUMMARY ===")
    print(f"X_train: {X_train.shape[0]} rows, {X_train.shape[1]} columns")
    print(f"X_test: {X_test.shape[0]} rows, {X_test.shape[1]} columns")
    print(f"y_train: {len(y_train)} rows")
    print(f"y_test: {len(y_test)} rows")
    print("\n=== CLASS DISTRIBUTION ===")
    print("Training set:")
    for label, count in distribution['train_counts'].items():
        print(f"  {label}: {count} ({distribution['train_percentages'][label]:.2f}%)")
    print("\nTest set:")
    for label, count in distribution['test_counts'].items():
        print(f"  {label}: {count} ({distribution['test_percentages'][label]:.2f}%)")
    print(f"\nClass imbalance ratio: {distribution['imbalance_ratio']:.2f}")
    if distribution['has_significant_imbalance']:
        print("WARNING: Significant class imbalance detected.")
        print("Consider using techniques like SMOTE, class weights, or stratified sampling.")

if __name__ == "__main__":
    main()