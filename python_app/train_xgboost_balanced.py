"""
XGBoost Model Training with Advanced Class Imbalance Handling

This script addresses severe class imbalance in cryptocurrency price direction prediction
by using two complementary techniques:
1. SMOTE Oversampling: To synthetically generate minority class examples in the training set
2. Class Weighting: To further adjust the model to focus on minority classes

The combination of these techniques should improve prediction for BUY and SELL signals
while maintaining good performance on the HOLD class.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import xgboost as xgb
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, precision_recall_fscore_support
from sklearn.preprocessing import LabelEncoder
from typing import Dict, List, Tuple, Any

# Import imblearn for oversampling techniques
from imblearn.over_sampling import SMOTE, RandomOverSampler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

def load_train_test_data(data_dir: str, symbol: str = 'btcusdt') -> Tuple[pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Load the training and test data for model training.
    
    Args:
        data_dir: Directory containing the training and test data files
        symbol: Symbol name used in file names
        
    Returns:
        Tuple containing (X_train, X_test, y_train, y_test)
    """
    try:
        # Load training and test sets (use same file naming pattern as original script)
        X_train = pd.read_csv(os.path.join(data_dir, f'X_train_{symbol}.csv'))
        X_test = pd.read_csv(os.path.join(data_dir, f'X_test_{symbol}.csv'))
        y_train = pd.read_csv(os.path.join(data_dir, f'y_train_{symbol}.csv'))['target'].values
        y_test = pd.read_csv(os.path.join(data_dir, f'y_test_{symbol}.csv'))['target'].values
        
        logger.info(f"Loaded training and test data for {symbol}")
        logger.info(f"X_train shape: {X_train.shape}")
        logger.info(f"X_test shape: {X_test.shape}")
        logger.info(f"y_train shape: {y_train.shape}")
        logger.info(f"y_test shape: {y_test.shape}")
        
        # Check for any remaining NaN or infinite values
        if X_train.isnull().any().any() or np.isinf(X_train.values).any():
            logger.warning("NaN or infinite values found in training data. Replacing with median values.")
            X_train = X_train.replace([np.inf, -np.inf], np.nan)
            for col in X_train.columns:
                if X_train[col].isnull().any():
                    logger.info(f"Filling NaN values in training column {col}")
                    X_train[col] = X_train[col].fillna(X_train[col].median())
        
        if X_test.isnull().any().any() or np.isinf(X_test.values).any():
            logger.warning("NaN or infinite values found in test data. Replacing with median values.")
            X_test = X_test.replace([np.inf, -np.inf], np.nan)
            for col in X_test.columns:
                if X_test[col].isnull().any():
                    logger.info(f"Filling NaN values in test column {col}")
                    X_test[col] = X_test[col].fillna(X_test[col].median())
        
        # Check class distribution
        train_class_counts = np.bincount(y_train)
        test_class_counts = np.bincount(y_test)
        
        logger.info(f"Training set class distribution: {train_class_counts}")
        logger.info(f"Test set class distribution: {test_class_counts}")
        
        # Calculate class imbalance
        total_train = len(y_train)
        class_percentages = [count / total_train * 100 for count in train_class_counts]
        
        logger.info(f"Class percentages in training set: {class_percentages}")
        
        return X_train, X_test, y_train, y_test
    
    except Exception as e:
        logger.error(f"Error loading train/test data: {str(e)}")
        return None, None, None, None

def apply_smote_oversampling(X_train: pd.DataFrame, y_train: np.ndarray) -> Tuple[pd.DataFrame, np.ndarray]:
    """
    Apply SMOTE oversampling to the training data to address class imbalance.
    
    Args:
        X_train: Training features
        y_train: Training labels
        
    Returns:
        Tuple containing (X_train_resampled, y_train_resampled)
    """
    try:
        logger.info("Applying SMOTE oversampling to training data...")
        
        # Log original class distribution
        original_class_counts = np.bincount(y_train)
        logger.info(f"Original class distribution: {original_class_counts}")
        
        # Apply SMOTE
        smote = SMOTE(random_state=42)
        X_train_resampled, y_train_resampled = smote.fit_resample(X_train, y_train)
        
        # Log new class distribution
        new_class_counts = np.bincount(y_train_resampled)
        logger.info(f"Class distribution after SMOTE: {new_class_counts}")
        
        return X_train_resampled, y_train_resampled
    
    except Exception as e:
        logger.error(f"Error applying SMOTE oversampling: {str(e)}")
        logger.warning("Falling back to RandomOverSampler...")
        
        try:
            # Try RandomOverSampler as a fallback (simpler than SMOTE)
            ros = RandomOverSampler(random_state=42)
            X_train_resampled, y_train_resampled = ros.fit_resample(X_train, y_train)
            
            # Log new class distribution
            new_class_counts = np.bincount(y_train_resampled)
            logger.info(f"Class distribution after RandomOverSampler: {new_class_counts}")
            
            return X_train_resampled, y_train_resampled
        
        except Exception as e2:
            logger.error(f"Error applying RandomOverSampler: {str(e2)}")
            logger.warning("Using original imbalanced data...")
            return X_train, y_train

def calculate_class_weights(y_train: np.ndarray) -> Dict[int, float]:
    """
    Calculate class weights to address class imbalance.
    
    Args:
        y_train: Training labels (original, not oversampled)
        
    Returns:
        Dictionary mapping class indices to weights
    """
    class_counts = np.bincount(y_train)
    total_samples = len(y_train)
    
    # Calculate weights as inverse of class frequency
    class_weights = {
        i: total_samples / (len(class_counts) * count) 
        for i, count in enumerate(class_counts)
    }
    
    logger.info(f"Calculated class weights: {class_weights}")
    
    return class_weights

def create_sample_weights(y_train: np.ndarray, class_weights: Dict[int, float]) -> np.ndarray:
    """
    Create sample weights array based on class weights.
    
    Args:
        y_train: Training labels
        class_weights: Dictionary mapping class indices to weights
        
    Returns:
        Array of sample weights
    """
    return np.array([class_weights[y] for y in y_train])

def train_xgboost_model(X_train: pd.DataFrame, y_train: np.ndarray, 
                       sample_weights: np.ndarray, class_weights: Dict[int, float],
                       params: Dict[str, Any] = None) -> xgb.XGBClassifier:
    """
    Train an XGBoost model with sample weights.
    
    Args:
        X_train: Training features
        y_train: Training labels
        sample_weights: Sample weights array
        class_weights: Dictionary mapping class indices to weights
        params: XGBoost parameters
        
    Returns:
        Trained XGBoost model
    """
    # Default parameters if none provided
    if params is None:
        params = {
            'objective': 'multi:softmax',
            'num_class': 3,  # Assuming 3 classes: 0 (BUY), 1 (HOLD), 2 (SELL)
            'learning_rate': 0.05,
            'max_depth': 6,
            'min_child_weight': 2,
            'gamma': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'scale_pos_weight': 1,
            'seed': 42,
            'verbosity': 1,
            'n_estimators': 200,
            'use_label_encoder': False,
            'eval_metric': 'mlogloss'
        }
    
    logger.info(f"Training XGBoost model with parameters: {params}")
    
    # Initialize and train the XGBoost model
    model = xgb.XGBClassifier(**params)
    
    # Train with sample weights
    model.fit(X_train, y_train, sample_weight=sample_weights)
    
    logger.info("XGBoost model training completed")
    
    return model

def evaluate_model(model: xgb.XGBClassifier, X_test: pd.DataFrame, y_test: np.ndarray, 
                 class_mapping: Dict[int, str] = None) -> Dict[str, Any]:
    """
    Evaluate the trained model on test data.
    
    Args:
        model: Trained XGBoost model
        X_test: Test features
        y_test: Test labels
        class_mapping: Dictionary mapping numeric labels to class names
        
    Returns:
        Dictionary containing evaluation metrics
    """
    # If no class mapping is provided, use default
    if class_mapping is None:
        class_mapping = {0: 'BUY', 1: 'HOLD', 2: 'SELL'}
    
    # Make predictions
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)
    
    # Compute overall accuracy
    accuracy = accuracy_score(y_test, y_pred)
    logger.info(f"Test accuracy: {accuracy:.4f}")
    
    # Compute per-class metrics
    precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred)
    
    # Generate classification report
    class_names = [class_mapping[i] for i in range(len(class_mapping))]
    report = classification_report(y_test, y_pred, target_names=class_names, output_dict=True)
    logger.info(f"Classification report:\n{classification_report(y_test, y_pred, target_names=class_names)}")
    
    # Compute confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    logger.info(f"Confusion matrix:\n{cm}")
    
    # Return all metrics as a dictionary
    return {
        'accuracy': accuracy,
        'precision': precision.tolist(),
        'recall': recall.tolist(),
        'f1': f1.tolist(),
        'support': support.tolist(),
        'classification_report': report,
        'confusion_matrix': cm.tolist()
    }

def plot_confusion_matrix(cm: np.ndarray, class_names: List[str], output_file: str):
    """
    Plot confusion matrix and save it to a file.
    
    Args:
        cm: Confusion matrix
        class_names: List of class names
        output_file: File path to save the plot
    """
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)
    
    # Add text annotations to each cell
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, cm[i, j],
                    horizontalalignment="center",
                    color="white" if cm[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_file)
    logger.info(f"Confusion matrix plot saved to {output_file}")

def plot_feature_importance(model: xgb.XGBClassifier, feature_names: List[str], output_file: str, top_n: int = 20):
    """
    Plot feature importance and save it to a file.
    
    Args:
        model: Trained XGBoost model
        feature_names: List of feature names
        output_file: File path to save the plot
        top_n: Number of top features to show (default: 20)
    """
    # Get feature importance
    importance = model.feature_importances_
    
    # Sort features by importance
    indices = np.argsort(importance)
    indices = indices[-top_n:]  # Get top N features
    
    # Get corresponding feature names
    selected_features = [feature_names[i] for i in indices]
    selected_importance = importance[indices]
    
    # Plot
    plt.figure(figsize=(12, 8))
    plt.barh(range(len(selected_features)), selected_importance, align='center')
    plt.yticks(range(len(selected_features)), selected_features)
    plt.xlabel('Importance')
    plt.ylabel('Feature')
    plt.title(f'Top {top_n} Feature Importance')
    plt.tight_layout()
    
    # Save the figure
    plt.savefig(output_file)
    logger.info(f"Feature importance plot saved to {output_file}")

def save_model(model: xgb.XGBClassifier, model_path: str, metadata: Dict[str, Any] = None):
    """
    Save the trained model and metadata to file.
    
    Args:
        model: Trained XGBoost model
        model_path: Path to save the model
        metadata: Dictionary containing model metadata
    """
    # Save the XGBoost model
    model.save_model(model_path)
    logger.info(f"Model saved to {model_path}")
    
    # Save metadata if provided
    if metadata:
        metadata_path = model_path.replace('.model', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info(f"Metadata saved to {metadata_path}")

def main():
    """
    Main function to train and evaluate the XGBoost model.
    """
    # Define paths (use the same paths as in the original training script)
    data_dir = 'data/training'
    model_dir = 'models'
    
    # Make sure the model directory exists
    os.makedirs(model_dir, exist_ok=True)
    
    # Symbol to train model for
    symbol = 'btcusdt'
    
    # Load data
    X_train, X_test, y_train, y_test = load_train_test_data(data_dir, symbol)
    if X_train is None:
        logger.error("Failed to load data. Exiting.")
        return
    
    # Store original y_train for computing class weights
    original_y_train = y_train.copy()
    
    # Apply oversampling to training data
    X_train_resampled, y_train_resampled = apply_smote_oversampling(X_train, y_train)
    
    # Calculate class weights based on original data
    class_weights = calculate_class_weights(original_y_train)
    
    # Create sample weights
    sample_weights = create_sample_weights(y_train_resampled, class_weights)
    
    # Train the model with oversampled data and sample weights
    model = train_xgboost_model(X_train_resampled, y_train_resampled, sample_weights, class_weights)
    
    # Define class mapping
    class_mapping = {0: 'BUY', 1: 'HOLD', 2: 'SELL'}
    
    # Evaluate the model
    evaluation = evaluate_model(model, X_test, y_test, class_mapping)
    
    # Create confusion matrix plot
    cm_file = os.path.join(model_dir, f'confusion_matrix_{symbol}_balanced.png')
    plot_confusion_matrix(np.array(evaluation['confusion_matrix']), 
                         [class_mapping[i] for i in range(len(class_mapping))],
                         cm_file)
    
    # Create feature importance plot
    fi_file = os.path.join(model_dir, f'feature_importance_{symbol}_balanced.png')
    plot_feature_importance(model, X_train.columns.tolist(), fi_file)
    
    # Prepare metadata
    metadata = {
        'symbol': symbol,
        'feature_count': X_train.shape[1],
        'training_samples': {
            'original': len(original_y_train),
            'oversampled': len(y_train_resampled)
        },
        'test_samples': len(y_test),
        'class_mapping': class_mapping,
        'class_weights': class_weights,
        'params': model.get_params(),
        'evaluation': evaluation,
        'features': X_train.columns.tolist(),
        'resampling': 'SMOTE'
    }
    
    # Save the model
    model_path = os.path.join(model_dir, f'xgboost_{symbol}_balanced.model')
    save_model(model, model_path, metadata)
    
    logger.info("Model training and evaluation completed successfully.")

if __name__ == "__main__":
    main()