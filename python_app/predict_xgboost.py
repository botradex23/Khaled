"""
XGBoost Model Prediction Module for Cryptocurrency Price Direction

This script loads the trained XGBoost model and provides functions for making predictions
on new market data. It handles:
1. Loading the trained model and its metadata
2. Processing new market data to create feature vectors
3. Making predictions with appropriate confidence scores
4. Translating numerical predictions to human-readable signals (BUY, HOLD, SELL)

The predictions can be used by trading bots or displayed in the UI for decision support.
"""

import os
import sys
import json
import logging
import numpy as np
import pandas as pd
import xgboost as xgb
from typing import Dict, List, Tuple, Any, Optional, Union

# Configure logging
log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'xgboost_prediction.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

class XGBoostPredictor:
    """Class for making predictions using trained XGBoost models"""
    
    def __init__(self, model_dir: str = 'models'):
        """
        Initialize the XGBoost predictor.
        
        Args:
            model_dir: Directory containing trained models
        """
        self.model_dir = model_dir
        self.models = {}
        self.metadata = {}
        self.features = {}
        self.class_mappings = {}
        
        logging.info(f"Initializing XGBoost predictor with model directory: {model_dir}")
    
    def load_model(self, symbol: str, model_type: str = "standard") -> bool:
        """
        Load a trained model for a specific symbol.
        
        Args:
            symbol: Symbol name (e.g., 'btcusdt')
            model_type: Type of model to load - 'standard' or 'balanced'
            
        Returns:
            Boolean indicating if model was loaded successfully
        """
        symbol = symbol.lower()
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        model_path = os.path.join(self.model_dir, f'xgboost_{symbol}{model_suffix}.model')
        metadata_path = os.path.join(self.model_dir, f'xgboost_{symbol}{model_suffix}_metadata.json')
        
        if not os.path.exists(model_path):
            logging.error(f"Model file not found: {model_path}")
            return False
        
        if not os.path.exists(metadata_path):
            logging.error(f"Metadata file not found: {metadata_path}")
            return False
        
        try:
            # Load the model
            model = xgb.XGBClassifier()
            model.load_model(model_path)
            self.models[model_key] = model
            
            # Load the metadata
            with open(metadata_path, 'r') as f:
                metadata = json.load(f)
            
            self.metadata[model_key] = metadata
            self.features[model_key] = metadata['features']
            
            # Convert class mapping keys to integers if they're stored as strings
            class_mapping = metadata['class_mapping']
            if all(isinstance(k, str) for k in class_mapping.keys()):
                self.class_mappings[model_key] = {int(k): v for k, v in class_mapping.items()}
            else:
                self.class_mappings[model_key] = class_mapping
            
            logging.info(f"Successfully loaded {model_type} model for {symbol}")
            logging.info(f"Model features: {len(self.features[model_key])} features")
            logging.info(f"Class mapping: {self.class_mappings[model_key]}")
            
            return True
        
        except Exception as e:
            logging.error(f"Error loading {model_type} model for {symbol}: {str(e)}")
            return False
            
    def load_all_models(self, symbol: str) -> Dict[str, bool]:
        """
        Load both standard and balanced models for a specific symbol, if available.
        
        Args:
            symbol: Symbol name (e.g., 'btcusdt')
            
        Returns:
            Dictionary with results of loading each model type
        """
        results = {}
        
        # Try to load standard model
        results["standard"] = self.load_model(symbol, "standard")
        
        # Try to load balanced model
        results["balanced"] = self.load_model(symbol, "balanced")
        
        return results
    
    def prepare_features(self, market_data: Dict[str, Any], symbol: str, model_type: str = "standard") -> Optional[pd.DataFrame]:
        """
        Prepare feature vector from market data for prediction.
        
        Args:
            market_data: Dictionary containing market data with technical indicators
            symbol: Symbol name (e.g., 'btcusdt')
            model_type: Type of model to use - 'standard' or 'balanced'
            
        Returns:
            DataFrame with features in the correct order, or None if preparation fails
        """
        symbol = symbol.lower()
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        if model_key not in self.features:
            logging.error(f"No feature list available for {model_key}. Load model first.")
            return None
        
        try:
            # Make a copy of the market data to avoid modifying the original
            market_data_copy = market_data.copy()
            
            # Check if 'future_price' and 'price_change_pct' are missing and add them if needed
            if 'future_price' not in market_data_copy:
                # In live prediction, use current price as future price placeholder
                market_data_copy['future_price'] = market_data_copy.get('close', 0.0)
            
            if 'price_change_pct' not in market_data_copy:
                # In live prediction, assume no price change as placeholder
                market_data_copy['price_change_pct'] = 0.0
            
            # Create a DataFrame with all required features
            features_df = pd.DataFrame([market_data_copy])
            
            # Check if all required features are present
            missing_features = [f for f in self.features[model_key] if f not in features_df.columns]
            if missing_features:
                logging.error(f"Missing features for {model_key}: {missing_features}")
                
                # Add missing features with default values
                for feature in missing_features:
                    features_df[feature] = 0.0
                    logging.warning(f"Added missing feature '{feature}' with default value 0.0")
            
            # Select and order features according to the model's expected feature list
            features_df = features_df[self.features[model_key]]
            
            # Check for NaN or infinite values
            if features_df.isnull().any().any() or np.isinf(features_df.values).any():
                logging.warning(f"NaN or infinite values found in features for {model_key}. Replacing with zeros.")
                features_df = features_df.replace([np.inf, -np.inf], np.nan)
                features_df = features_df.fillna(0)
            
            return features_df
        
        except Exception as e:
            logging.error(f"Error preparing features for {model_key}: {str(e)}")
            return None
    
    def predict(self, market_data: Dict[str, Any], symbol: str, model_type: str = "standard") -> Dict[str, Any]:
        """
        Make a prediction using the loaded model.
        
        Args:
            market_data: Dictionary containing market data with technical indicators
            symbol: Symbol name (e.g., 'btcusdt')
            model_type: Type of model to use - 'standard' or 'balanced'
            
        Returns:
            Dictionary containing prediction result with:
                - predicted_class: Numerical class (0, 1, 2)
                - predicted_label: String label (BUY, HOLD, SELL)
                - probabilities: Probability for each class
                - confidence: Confidence score for the prediction
                - timestamp: Current timestamp
                - model_type: Type of model used for the prediction
        """
        symbol = symbol.lower()
        model_suffix = "_balanced" if model_type == "balanced" else ""
        model_key = f"{symbol}{model_suffix}"
        
        result = {
            'symbol': symbol,
            'predicted_class': None,
            'predicted_label': None,
            'probabilities': None,
            'confidence': None,
            'model_type': model_type,
            'timestamp': pd.Timestamp.now().isoformat()
        }
        
        # Check if model is loaded
        if model_key not in self.models:
            if not self.load_model(symbol, model_type):
                logging.error(f"Failed to load {model_type} model for {symbol}")
                return result
        
        # Prepare features
        features_df = self.prepare_features(market_data, symbol, model_type)
        if features_df is None:
            logging.error(f"Failed to prepare features for {model_key}")
            return result
        
        try:
            # Make prediction
            predicted_class = self.models[model_key].predict(features_df)[0]
            probabilities = self.models[model_key].predict_proba(features_df)[0]
            
            # Convert numpy types to Python native types
            predicted_class = int(predicted_class)
            probabilities = [float(p) for p in probabilities]
            confidence = float(probabilities[predicted_class])
            
            # Get the label
            predicted_label = self.class_mappings[model_key].get(predicted_class, "UNKNOWN")
            
            # Update result
            result['predicted_class'] = predicted_class
            result['predicted_label'] = predicted_label
            result['probabilities'] = probabilities
            result['confidence'] = confidence
            
            logging.info(f"Prediction for {symbol} using {model_type} model: {predicted_label} (Class {predicted_class}) with {confidence:.4f} confidence")
            
            return result
        
        except Exception as e:
            logging.error(f"Error making prediction for {model_key}: {str(e)}")
            return result
            
    def predict_with_both_models(self, market_data: Dict[str, Any], symbol: str) -> Dict[str, Dict[str, Any]]:
        """
        Make predictions using both standard and balanced models and return the results.
        
        Args:
            market_data: Dictionary containing market data with technical indicators
            symbol: Symbol name (e.g., 'btcusdt')
            
        Returns:
            Dictionary with results from both models
        """
        results = {}
        
        # Try to load both models if not already loaded
        self.load_all_models(symbol)
        
        # Try standard model
        standard_result = self.predict(market_data, symbol, "standard")
        results["standard"] = standard_result
        
        # Try balanced model
        balanced_result = self.predict(market_data, symbol, "balanced")
        results["balanced"] = balanced_result
        
        return results
    
    def predict_batch(self, market_data_batch: List[Dict[str, Any]], symbols: List[str]) -> List[Dict[str, Any]]:
        """
        Make predictions for multiple market data points and symbols.
        
        Args:
            market_data_batch: List of dictionaries containing market data
            symbols: List of symbol names
            
        Returns:
            List of prediction results
        """
        if len(market_data_batch) != len(symbols):
            logging.error(f"Length mismatch: {len(market_data_batch)} data points vs {len(symbols)} symbols")
            return []
        
        results = []
        for market_data, symbol in zip(market_data_batch, symbols):
            result = self.predict(market_data, symbol)
            results.append(result)
        
        return results


def get_available_models(model_dir: str = 'models', categorize: bool = False) -> Union[List[str], Dict[str, List[str]]]:
    """
    Get list of available trained models.
    
    Args:
        model_dir: Directory containing the models
        categorize: If True, return a dictionary with models categorized by type
        
    Returns:
        Either a list of model names or a dictionary categorizing models by type
    """
    if not os.path.exists(model_dir):
        logging.error(f"Model directory does not exist: {model_dir}")
        return [] if not categorize else {'standard': [], 'balanced': []}
    
    try:
        model_files = [f for f in os.listdir(model_dir) if f.startswith('xgboost_') and f.endswith('.model')]
        model_names = [f.replace('xgboost_', '').replace('.model', '') for f in model_files]
        
        if not categorize:
            return model_names
        
        # Categorize models
        result = {
            'standard': [],
            'balanced': []
        }
        
        for model in model_names:
            if model.endswith('_balanced'):
                base_symbol = model.replace('_balanced', '')
                result['balanced'].append(base_symbol)
            else:
                result['standard'].append(model)
        
        return result
    
    except Exception as e:
        logging.error(f"Error getting available models: {str(e)}")
        return [] if not categorize else {'standard': [], 'balanced': []}


def main():
    """
    Main function for testing the XGBoost predictor.
    """
    model_dir = 'models'
    
    # Get categorized list of models
    models = get_available_models(model_dir, categorize=True)
    
    # Print available models by category
    print("Available models:")
    print(f"  Standard models: {models['standard']}")
    print(f"  Balanced models: {models['balanced']}")
    
    # Get list of unique base symbols (without the _balanced suffix)
    symbols = list(set(models['standard'] + models['balanced']))
    
    if not symbols:
        print("No trained models found.")
        return
    
    # Initialize the predictor
    predictor = XGBoostPredictor(model_dir)
    
    # For testing, we'll use some sample market data
    # In a real application, this would come from the market data service
    
    # Sample data for BTCUSDT (you would need to replace this with real data)
    sample_data = {
        'open': 82491.31,
        'high': 82493.7,
        'low': 82392.52,
        'close': 82471.07,
        'volume': 85.63449,
        'sma_5': 82297.324,
        'sma_10': 82181.365,
        'sma_20': 82128.95,
        'sma_50': 81899.5804,
        'sma_100': 81963.6279,
        'ema_5': 82330.98380683674,
        'ema_10': 82237.19266099698,
        'ema_20': 82141.39877359924,
        'ema_50': 82015.54205376017,
        'ema_100': 81984.99161665728,
        'rsi_14': 74.96886012072812,
        'ema_12': 82213.45416089744,
        'ema_26': 82101.4217944416,
        'macd': 112.0323664558382,
        'macd_signal': 82.59444987631211,
        'macd_hist': 29.43791657952609,
        'bb_middle': 82128.95,
        'bb_std': 144.331960379675,
        'bb_upper': 82417.61392075935,
        'bb_lower': 81840.28607924064,
        'atr_14': 139.75571428571337,
        'roc_5': 0.5056904957241537,
        'roc_10': 0.3230440392621103,
        'roc_20': 0.5471929872687076,
        'stoch_k': 91.05060181009723,
        'stoch_d': 87.45739478414062,
        'future_price': 83434.71,
        'price_change_pct': 1.1684582241991033
    }
    
    # Make predictions with both models for each symbol
    for symbol in symbols:
        print(f"\n--- Predictions for {symbol.upper()} ---")
        
        # Try to make predictions with both models
        results = predictor.predict_with_both_models(sample_data, symbol)
        
        # Standard model results
        if results["standard"]["predicted_class"] is not None:
            print(f"\nStandard Model:")
            print(f"  Predicted class: {results['standard']['predicted_class']}")
            print(f"  Predicted label: {results['standard']['predicted_label']}")
            print(f"  Confidence: {results['standard']['confidence']:.4f}")
            
            if results['standard']['probabilities']:
                probs = results['standard']['probabilities']
                for i, prob in enumerate(probs):
                    model_key = symbol
                    label = predictor.class_mappings[model_key].get(i, "UNKNOWN")
                    print(f"  {label} probability: {prob:.4f}")
        else:
            print(f"\nStandard Model: Not available or failed to load")
        
        # Balanced model results
        if results["balanced"]["predicted_class"] is not None:
            print(f"\nBalanced Model:")
            print(f"  Predicted class: {results['balanced']['predicted_class']}")
            print(f"  Predicted label: {results['balanced']['predicted_label']}")
            print(f"  Confidence: {results['balanced']['confidence']:.4f}")
            
            if results['balanced']['probabilities']:
                probs = results['balanced']['probabilities']
                for i, prob in enumerate(probs):
                    model_key = f"{symbol}_balanced"
                    label = predictor.class_mappings[model_key].get(i, "UNKNOWN")
                    print(f"  {label} probability: {prob:.4f}")
        else:
            print(f"\nBalanced Model: Not available or failed to load")
        
        # Compare the predictions
        if (results["standard"]["predicted_class"] is not None and 
            results["balanced"]["predicted_class"] is not None):
            
            if results["standard"]["predicted_label"] == results["balanced"]["predicted_label"]:
                print(f"\nBoth models agree: {results['standard']['predicted_label']}")
            else:
                print(f"\nModels disagree:")
                print(f"  Standard model: {results['standard']['predicted_label']} with {results['standard']['confidence']:.4f} confidence")
                print(f"  Balanced model: {results['balanced']['predicted_label']} with {results['balanced']['confidence']:.4f} confidence")
                
                # Which model to trust more depends on the specific case
                if results["balanced"]["predicted_label"] != "HOLD" and results["standard"]["predicted_label"] == "HOLD":
                    print("  Balanced model might be more sensitive to BUY/SELL signals due to better handling of class imbalance")
                
                if results["balanced"]["confidence"] > results["standard"]["confidence"]:
                    print(f"  Balanced model has higher confidence")
                else:
                    print(f"  Standard model has higher confidence")


if __name__ == "__main__":
    main()