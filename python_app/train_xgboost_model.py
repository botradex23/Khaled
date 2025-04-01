"""
XGBoost Model Training for Cryptocurrency Price Direction Prediction

This script trains an XGBoost classifier on the BTCUSDT dataset with class imbalance handling
using class weights. It includes the following steps:
1. Load the pre-processed training and test data
2. Calculate class weights to address class imbalance
3. Train the XGBoost model with appropriate parameters
4. Evaluate the model performance on test data
5. Save the trained model for future use

The model classifies price movements as BUY, SELL, or HOLD based on technical indicators.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import xgboost as xgb
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, classification_report, confusion_matrix
from sklearn.preprocessing import LabelEncoder
from typing import Dict, Tuple, List, Any

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'xgboost_training.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

def load_train_test_data(data_dir: str, symbol: str = 'btcusdt') -> Tuple[pd.DataFrame, pd.DataFrame, np.ndarray, np.ndarray]:
    """
    Load the training and test data for model training.
    
    Args:
        data_dir: Directory containing the training and test data files
        symbol: Symbol name used in file names
        
    Returns:
        Tuple containing (X_train, X_test, y_train, y_test)
    """
    logging.info(f"Loading training and test data for {symbol} from {data_dir}")
    
    X_train = pd.read_csv(os.path.join(data_dir, f'X_train_{symbol}.csv'))
    X_test = pd.read_csv(os.path.join(data_dir, f'X_test_{symbol}.csv'))
    y_train = pd.read_csv(os.path.join(data_dir, f'y_train_{symbol}.csv'))['target'].values
    y_test = pd.read_csv(os.path.join(data_dir, f'y_test_{symbol}.csv'))['target'].values
    
    logging.info(f"Loaded X_train: {X_train.shape}, X_test: {X_test.shape}, y_train: {len(y_train)}, y_test: {len(y_test)}")
    
    # Check for any remaining NaN or infinite values
    if X_train.isnull().any().any() or np.isinf(X_train.values).any():
        logging.warning("NaN or infinite values found in training data. Replacing with median values.")
        X_train = X_train.replace([np.inf, -np.inf], np.nan)
        for col in X_train.columns:
            if X_train[col].isnull().any():
                logging.info(f"Filling NaN values in training column {col}")
                X_train[col] = X_train[col].fillna(X_train[col].median())
    
    if X_test.isnull().any().any() or np.isinf(X_test.values).any():
        logging.warning("NaN or infinite values found in test data. Replacing with median values.")
        X_test = X_test.replace([np.inf, -np.inf], np.nan)
        for col in X_test.columns:
            if X_test[col].isnull().any():
                logging.info(f"Filling NaN values in test column {col}")
                X_test[col] = X_test[col].fillna(X_test[col].median())
    
    return X_train, X_test, y_train, y_test

def calculate_class_weights(y_train: np.ndarray) -> Dict[int, float]:
    """
    Calculate class weights to address class imbalance.
    
    Args:
        y_train: Training labels
        
    Returns:
        Dictionary mapping class indices to weights
    """
    logging.info("Calculating class weights to handle imbalance")
    
    # Count instances of each class
    unique_classes, class_counts = np.unique(y_train, return_counts=True)
    n_samples = len(y_train)
    n_classes = len(unique_classes)
    
    # Calculate weights using the formula: weight = n_samples / (n_classes * class_count)
    weights = {}
    for i, cls in enumerate(unique_classes):
        # Convert numpy types to native Python types for JSON serialization
        weights[int(cls)] = float(n_samples / (n_classes * class_counts[i]))
    
    # Create class counts dictionary with Python native types for logging
    class_counts_dict = {int(cls): int(count) for cls, count in zip(unique_classes, class_counts)}
    logging.info(f"Class counts: {class_counts_dict}")
    logging.info(f"Class weights: {weights}")
    
    return weights

def create_sample_weights(y_train: np.ndarray, class_weights: Dict[int, float]) -> np.ndarray:
    """
    Create sample weights array based on class weights.
    
    Args:
        y_train: Training labels
        class_weights: Dictionary mapping class indices to weights
        
    Returns:
        Array of sample weights
    """
    logging.info("Creating sample weights array")
    # Convert numpy int to Python int for dictionary lookup
    sample_weights = np.array([class_weights[int(y)] for y in y_train])
    return sample_weights

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
    logging.info("Training XGBoost model with class weights")
    
    if params is None:
        # Default parameters for XGBoost
        params = {
            'objective': 'multi:softmax',
            'num_class': len(np.unique(y_train)),
            'learning_rate': 0.1,
            'max_depth': 6,
            'min_child_weight': 1,
            'gamma': 0,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'scale_pos_weight': 1,
            'seed': 42,
            'verbosity': 1
        }
    
    logging.info(f"XGBoost parameters: {params}")
    
    # Create and train the model
    model = xgb.XGBClassifier(**params)
    model.fit(X_train, y_train, sample_weight=sample_weights, verbose=True)
    
    # Get feature importance
    feature_importance = model.feature_importances_
    features = X_train.columns
    
    # Log top 10 most important features
    importance_df = pd.DataFrame({'Feature': features, 'Importance': feature_importance})
    importance_df = importance_df.sort_values('Importance', ascending=False)
    logging.info(f"Top 10 most important features:\n{importance_df.head(10)}")
    
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
    logging.info("Evaluating model on test data")
    
    # Make predictions
    y_pred = model.predict(X_test)
    
    # Calculate basic metrics
    accuracy = float(accuracy_score(y_test, y_pred))
    precision, recall, f1, support = precision_recall_fscore_support(y_test, y_pred, average=None)
    
    # Convert numpy arrays to Python lists with native types
    precision_list = [float(p) for p in precision]
    recall_list = [float(r) for r in recall]
    f1_list = [float(f) for f in f1]
    support_list = [int(s) for s in support]
    
    # Generate detailed classification report
    if class_mapping:
        target_names = [class_mapping[i] for i in sorted(class_mapping.keys())]
        report = classification_report(y_test, y_pred, target_names=target_names, output_dict=True)
    else:
        report = classification_report(y_test, y_pred, output_dict=True)
    
    # Generate confusion matrix
    cm = confusion_matrix(y_test, y_pred)
    
    # Convert confusion matrix to native Python types
    cm_list = [[int(cell) for cell in row] for row in cm]
    
    # Log evaluation results
    logging.info(f"Accuracy: {accuracy:.4f}")
    logging.info(f"Classification report:\n{classification_report(y_test, y_pred, target_names=target_names if class_mapping else None)}")
    
    # Create evaluation report with native Python types for JSON serialization
    evaluation = {
        'accuracy': accuracy,
        'precision': precision_list,
        'recall': recall_list,
        'f1': f1_list,
        'support': support_list,
        'classification_report': report,
        'confusion_matrix': cm_list
    }
    
    return evaluation

def plot_confusion_matrix(cm: np.ndarray, class_names: List[str], output_file: str):
    """
    Plot confusion matrix and save it to a file.
    
    Args:
        cm: Confusion matrix
        class_names: List of class names
        output_file: File path to save the plot
    """
    logging.info(f"Plotting confusion matrix and saving to {output_file}")
    
    plt.figure(figsize=(10, 8))
    plt.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    plt.title('Confusion Matrix')
    plt.colorbar()
    
    tick_marks = np.arange(len(class_names))
    plt.xticks(tick_marks, class_names, rotation=45)
    plt.yticks(tick_marks, class_names)
    
    fmt = 'd'
    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            plt.text(j, i, format(cm[i, j], fmt),
                    horizontalalignment="center",
                    color="white" if cm[i, j] > thresh else "black")
    
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    
    # Save plot
    plt.savefig(output_file)
    plt.close()

def plot_feature_importance(model: xgb.XGBClassifier, feature_names: List[str], output_file: str, top_n: int = 20):
    """
    Plot feature importance and save it to a file.
    
    Args:
        model: Trained XGBoost model
        feature_names: List of feature names
        output_file: File path to save the plot
        top_n: Number of top features to show (default: 20)
    """
    logging.info(f"Plotting feature importance and saving to {output_file}")
    
    # Extract feature importance
    importance = model.feature_importances_
    
    # Create dataframe for easier sorting and plotting
    feature_importance = pd.DataFrame({
        'Feature': feature_names,
        'Importance': importance
    }).sort_values('Importance', ascending=False)
    
    # Plot top N features
    plt.figure(figsize=(12, 8))
    plt.barh(feature_importance['Feature'][:top_n], feature_importance['Importance'][:top_n])
    plt.xlabel('Importance')
    plt.ylabel('Feature')
    plt.title(f'Top {top_n} Feature Importance')
    plt.tight_layout()
    
    # Save plot
    plt.savefig(output_file)
    plt.close()

def save_model(model: xgb.XGBClassifier, model_path: str, metadata: Dict[str, Any] = None):
    """
    Save the trained model and metadata to file.
    
    Args:
        model: Trained XGBoost model
        model_path: Path to save the model
        metadata: Dictionary containing model metadata
    """
    logging.info(f"Saving model to {model_path}")
    
    # Create directory if it doesn't exist
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    
    # Save model
    model.save_model(model_path)
    
    # Save metadata if provided
    if metadata:
        metadata_path = model_path.replace('.model', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        logging.info(f"Saved model metadata to {metadata_path}")

def main():
    """
    Main function to train and evaluate the XGBoost model.
    """
    # Paths
    data_dir = 'data/training'
    model_dir = 'models'
    symbol = 'btcusdt'
    
    # Create directories
    os.makedirs(model_dir, exist_ok=True)
    
    # Load data
    X_train, X_test, y_train, y_test = load_train_test_data(data_dir, symbol)
    
    # Define class mapping
    class_mapping = {0: 'BUY', 1: 'HOLD', 2: 'SELL'}
    inverse_class_mapping = {v: k for k, v in class_mapping.items()}
    
    # Calculate class weights
    class_weights = calculate_class_weights(y_train)
    
    # Create sample weights
    sample_weights = create_sample_weights(y_train, class_weights)
    
    # XGBoost parameters with native Python types
    params = {
        'objective': 'multi:softmax',
        'num_class': int(len(np.unique(y_train))),
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
    
    # Train model
    model = train_xgboost_model(X_train, y_train, sample_weights, class_weights, params)
    
    # Evaluate model
    evaluation = evaluate_model(model, X_test, y_test, class_mapping)
    
    # Plot confusion matrix
    cm = np.array(evaluation['confusion_matrix'])
    plot_confusion_matrix(cm, list(class_mapping.values()), f'{model_dir}/confusion_matrix_{symbol}.png')
    
    # Plot feature importance
    plot_feature_importance(model, X_train.columns.tolist(), f'{model_dir}/feature_importance_{symbol}.png')
    
    # Prepare metadata with all native Python types
    metadata = {
        'symbol': symbol,
        'feature_count': int(X_train.shape[1]),
        'training_samples': int(len(y_train)),
        'test_samples': int(len(y_test)),
        'class_mapping': class_mapping,
        'class_weights': class_weights,
        'params': params,
        'evaluation': evaluation,
        'features': X_train.columns.tolist()
    }
    
    # Save model
    model_path = f'{model_dir}/xgboost_{symbol}.model'
    save_model(model, model_path, metadata)
    
    # Print summary
    print("\n=== XGBoost MODEL TRAINING SUMMARY ===")
    print(f"Symbol: {symbol.upper()}")
    print(f"Training samples: {len(y_train)}")
    print(f"Test samples: {len(y_test)}")
    print(f"\nClass distribution (training):")
    for cls, count in zip(*np.unique(y_train, return_counts=True)):
        cls_name = class_mapping[cls]
        pct = (count / len(y_train)) * 100
        print(f"  {cls_name}: {count} ({pct:.2f}%)")
    
    print(f"\nClass weights:")
    for cls, weight in class_weights.items():
        cls_name = class_mapping[cls]
        print(f"  {cls_name}: {weight:.4f}")
    
    print(f"\nModel performance:")
    print(f"  Accuracy: {evaluation['accuracy']:.4f}")
    
    for cls in sorted(class_mapping.keys()):
        cls_name = class_mapping[cls]
        cls_idx = cls  # Class index in the evaluation metrics
        
        precision = evaluation['precision'][cls_idx]
        recall = evaluation['recall'][cls_idx]
        f1 = evaluation['f1'][cls_idx]
        
        print(f"  {cls_name} - Precision: {precision:.4f}, Recall: {recall:.4f}, F1: {f1:.4f}")
    
    print(f"\nModel saved to: {model_path}")
    print(f"Confusion matrix saved to: {model_dir}/confusion_matrix_{symbol}.png")
    print(f"Feature importance saved to: {model_dir}/feature_importance_{symbol}.png")

if __name__ == "__main__":
    main()