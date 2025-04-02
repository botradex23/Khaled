#!/usr/bin/env python3
"""
Feature Importance Analyzer for XGBoost Models

This module analyzes the feature importance of trained XGBoost models
and provides utilities to extract, visualize, and save the results.

Usage:
    python feature_importance_analyzer.py --symbol=BTCUSDT --model=balanced

Functions:
    - load_xgboost_model: Load an XGBoost model from a model file
    - get_feature_importance: Extract feature importance from a model
    - rank_features: Rank features by importance score
    - print_feature_importance: Print feature importance in a readable format
    - export_feature_importance: Export feature importance to a CSV file
    - analyze_model: Analyze a model and generate all outputs
    - main: Parse arguments and run the analyzer
"""

import os
import sys
import json
import logging
import argparse
import numpy as np
import pandas as pd
import xgboost as xgb
from typing import Dict, List, Tuple, Any, Optional, Union

# Add the parent directory to the path to import from python_app
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
grandparent_dir = os.path.dirname(parent_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)
if grandparent_dir not in sys.path:
    sys.path.append(grandparent_dir)

# Configure logging
log_dir = os.path.join(grandparent_dir, 'logs')
os.makedirs(log_dir, exist_ok=True)

log_file = os.path.join(log_dir, 'feature_importance.log')
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

def load_xgboost_model(symbol: str, model_type: str = "balanced") -> Tuple[Optional[xgb.XGBClassifier], Optional[Dict[str, Any]]]:
    """
    Load an XGBoost model from the model directory.
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        model_type: Type of model to load ('standard' or 'balanced')
        
    Returns:
        Tuple containing:
        - XGBoost model object (or None if loading fails)
        - Model metadata dictionary (or None if loading fails)
    """
    symbol = symbol.lower()
    model_dir = os.path.join(parent_dir, 'models')
    model_suffix = "_balanced" if model_type == "balanced" else ""
    
    model_path = os.path.join(model_dir, f'xgboost_{symbol}{model_suffix}.model')
    metadata_path = os.path.join(model_dir, f'xgboost_{symbol}{model_suffix}_metadata.json')
    
    if not os.path.exists(model_path):
        logging.error(f"Model file not found: {model_path}")
        return None, None
    
    if not os.path.exists(metadata_path):
        logging.error(f"Metadata file not found: {metadata_path}")
        return None, None
    
    try:
        # Load the model
        model = xgb.XGBClassifier()
        model.load_model(model_path)
        
        # Load the metadata
        with open(metadata_path, 'r') as f:
            metadata = json.load(f)
        
        logging.info(f"Successfully loaded {model_type} model for {symbol}")
        return model, metadata
    
    except Exception as e:
        logging.error(f"Error loading {model_type} model for {symbol}: {str(e)}")
        return None, None

def get_feature_importance(model: xgb.XGBClassifier, features: List[str], 
                          importance_type: str = 'gain') -> pd.DataFrame:
    """
    Extract feature importance from an XGBoost model.
    
    Args:
        model: Trained XGBoost model
        features: List of feature names in the same order as used for training
        importance_type: Type of importance to extract ('gain', 'weight', 'cover', 
                       'total_gain', or 'total_cover')
        
    Returns:
        DataFrame with feature names and importance scores
    """
    # Get feature importance
    importance_score = model.get_booster().get_score(importance_type=importance_type)
    
    # Convert to DataFrame
    importance_df = pd.DataFrame({
        'feature': list(importance_score.keys()),
        f'importance_{importance_type}': list(importance_score.values())
    })
    
    # Add features that have zero importance but were used in training
    missing_features = [f for f in features if f'f{features.index(f)}' not in importance_score]
    
    if missing_features:
        missing_df = pd.DataFrame({
            'feature': [f'f{features.index(f)}' for f in missing_features],
            f'importance_{importance_type}': [0.0] * len(missing_features)
        })
        importance_df = pd.concat([importance_df, missing_df], ignore_index=True)
    
    # Map feature indices (f0, f1, ...) to actual feature names
    feature_mapping = {f'f{i}': feature for i, feature in enumerate(features)}
    importance_df['feature_name'] = importance_df['feature'].map(
        lambda x: feature_mapping.get(x, x)
    )
    
    # Normalize importance to percentages
    total_importance = importance_df[f'importance_{importance_type}'].sum()
    if total_importance > 0:
        importance_df['importance_pct'] = (
            importance_df[f'importance_{importance_type}'] / total_importance * 100
        )
    else:
        importance_df['importance_pct'] = 0.0
    
    return importance_df

def rank_features(importance_df: pd.DataFrame, by_column: str = 'importance_pct') -> pd.DataFrame:
    """
    Rank features by their importance score.
    
    Args:
        importance_df: DataFrame with feature importance information
        by_column: Column to sort by (typically 'importance_pct' or 'importance_gain')
        
    Returns:
        DataFrame sorted by importance in descending order with rank column added
    """
    # Sort by importance (descending)
    ranked_df = importance_df.sort_values(by=by_column, ascending=False).reset_index(drop=True)
    
    # Add rank column (1-based)
    ranked_df['rank'] = ranked_df.index + 1
    
    # Reorder columns for better readability
    column_order = ['rank', 'feature_name', by_column]
    extra_columns = [col for col in ranked_df.columns if col not in column_order]
    ranked_df = ranked_df[column_order + extra_columns]
    
    return ranked_df

def print_feature_importance(ranked_df: pd.DataFrame, top_n: int = 20, 
                            importance_type: str = 'gain') -> None:
    """
    Print feature importance in a readable format to the console.
    
    Args:
        ranked_df: DataFrame with ranked feature importance
        top_n: Number of top features to display (0 for all)
        importance_type: Type of importance used ('gain', 'weight', etc.)
    """
    # Determine how many features to display
    if top_n <= 0 or top_n > len(ranked_df):
        display_df = ranked_df
        print(f"\nFeature Importance ({importance_type}) - All {len(ranked_df)} Features:")
    else:
        display_df = ranked_df.head(top_n)
        print(f"\nFeature Importance ({importance_type}) - Top {top_n} of {len(ranked_df)} Features:")
    
    # Format for easier reading
    for _, row in display_df.iterrows():
        print(f"{row['rank']:3d}. {row['feature_name']:<30} {row['importance_pct']:6.2f}%")
    
    # If showing top N, also show sum of importance for displayed features
    if top_n > 0 and top_n < len(ranked_df):
        top_importance_sum = display_df['importance_pct'].sum()
        print(f"\nTop {top_n} features account for {top_importance_sum:.2f}% of total importance")

def export_feature_importance(ranked_df: pd.DataFrame, symbol: str, 
                             model_type: str, importance_type: str) -> str:
    """
    Export feature importance to a CSV file.
    
    Args:
        ranked_df: DataFrame with ranked feature importance
        symbol: Trading pair symbol
        model_type: Type of model ('standard' or 'balanced')
        importance_type: Type of importance used ('gain', 'weight', etc.)
        
    Returns:
        Path to the saved CSV file
    """
    # Create output directory if it doesn't exist
    output_dir = os.path.join(current_dir, 'results')
    os.makedirs(output_dir, exist_ok=True)
    
    # Create filename with timestamp to avoid overwriting
    timestamp = pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')
    filename = f"feature_importance_{symbol.lower()}_{model_type}_{importance_type}_{timestamp}.csv"
    output_path = os.path.join(output_dir, filename)
    
    # Save to CSV
    ranked_df.to_csv(output_path, index=False)
    logging.info(f"Feature importance exported to {output_path}")
    
    # Also save a copy with a standard name that will be overwritten each time
    standard_filename = f"feature_importance_{symbol.lower()}_{model_type}.csv"
    standard_path = os.path.join(output_dir, standard_filename)
    ranked_df.to_csv(standard_path, index=False)
    
    return output_path

def analyze_model(symbol: str, model_type: str = "balanced", 
                 importance_types: List[str] = ['gain', 'weight'],
                 top_n: int = 20) -> Dict[str, Any]:
    """
    Analyze model feature importance and generate all outputs.
    
    Args:
        symbol: Trading pair symbol (e.g., 'BTCUSDT')
        model_type: Type of model to analyze ('standard' or 'balanced')
        importance_types: List of importance types to analyze
        top_n: Number of top features to display
        
    Returns:
        Dictionary with analysis results and paths to output files
    """
    results = {
        'symbol': symbol,
        'model_type': model_type,
        'success': False,
        'message': '',
        'output_files': {},
        'analysis': {}
    }
    
    # Load the model
    model, metadata = load_xgboost_model(symbol, model_type)
    if model is None or metadata is None:
        results['message'] = f"Failed to load {model_type} model for {symbol}"
        return results
    
    # Get features from metadata
    if 'features' not in metadata:
        results['message'] = f"Features list not found in metadata for {symbol} {model_type} model"
        return results
    
    features = metadata['features']
    results['analysis']['feature_count'] = len(features)
    results['analysis']['importance_types'] = {}
    
    # Generate importance analysis for each importance type
    for importance_type in importance_types:
        try:
            # Get feature importance
            importance_df = get_feature_importance(model, features, importance_type)
            
            # Rank features
            ranked_df = rank_features(importance_df, f'importance_{importance_type}')
            
            # Print to console
            print_feature_importance(ranked_df, top_n, importance_type)
            
            # Export to CSV
            output_path = export_feature_importance(ranked_df, symbol, model_type, importance_type)
            results['output_files'][importance_type] = output_path
            
            # Store analysis results
            results['analysis']['importance_types'][importance_type] = {
                'top_features': ranked_df.head(top_n)[['rank', 'feature_name', 'importance_pct']].to_dict('records'),
                'top_importance_sum': ranked_df.head(top_n)['importance_pct'].sum(),
                'zero_importance_count': len(ranked_df[ranked_df['importance_pct'] == 0])
            }
            
        except Exception as e:
            logging.error(f"Error analyzing {importance_type} importance: {str(e)}")
            results['analysis']['importance_types'][importance_type] = {
                'error': str(e)
            }
    
    # Set success if we analyzed at least one importance type
    if results['output_files']:
        results['success'] = True
        results['message'] = f"Successfully analyzed {len(results['output_files'])} importance types"
    
    return results

def main():
    """Main function to run the feature importance analyzer."""
    parser = argparse.ArgumentParser(description='Analyze feature importance of XGBoost models')
    parser.add_argument('--symbol', type=str, default='BTCUSDT', 
                        help='Trading pair symbol (e.g., BTCUSDT)')
    parser.add_argument('--model', type=str, choices=['standard', 'balanced'], default='balanced',
                        help='Model type to analyze (standard or balanced)')
    parser.add_argument('--importance', type=str, nargs='+', 
                        choices=['gain', 'weight', 'cover', 'total_gain', 'total_cover'],
                        default=['gain', 'weight'],
                        help='Types of importance to analyze')
    parser.add_argument('--top', type=int, default=20,
                        help='Number of top features to display (0 for all)')
    
    args = parser.parse_args()
    
    print(f"\n=== Feature Importance Analyzer for {args.symbol} {args.model} model ===\n")
    
    # Create the output directory for results
    os.makedirs(os.path.join(current_dir, 'results'), exist_ok=True)
    
    # Run analysis
    results = analyze_model(
        symbol=args.symbol,
        model_type=args.model,
        importance_types=args.importance,
        top_n=args.top
    )
    
    if results['success']:
        print(f"\nAnalysis completed successfully.")
        print(f"Output files:")
        for imp_type, path in results['output_files'].items():
            print(f"  - {imp_type}: {path}")
    else:
        print(f"\nAnalysis failed: {results['message']}")

if __name__ == "__main__":
    main()