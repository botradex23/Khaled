#!/usr/bin/env python3
"""
Test script for Feature Importance Analyzer

This script tests the feature importance analyzer module to ensure it works correctly.
"""

import os
import sys
import logging

# Reduce logging level to minimize output
logging.basicConfig(level=logging.ERROR)  # Only show ERROR logs

# Add necessary paths
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(current_dir)

# Import the feature importance analyzer
from ml_analysis.feature_importance_analyzer import (
    load_xgboost_model,
    get_feature_importance,
    rank_features,
    print_feature_importance,
    export_feature_importance,
    analyze_model
)

def test_load_model():
    """Test loading the XGBoost model"""
    print("\n=== Testing Model Loading ===")
    model, metadata = load_xgboost_model('btcusdt', 'balanced')
    
    if model is not None and metadata is not None:
        print("✓ Successfully loaded the balanced model for BTCUSDT")
        print(f"  - Model type: {type(model).__name__}")
        print(f"  - Number of features: {len(metadata.get('features', []))}")
        print(f"  - Model trained at: {metadata.get('trained_at', 'unknown')}")
        return True
    else:
        print("✗ Failed to load the model or metadata")
        return False

def test_feature_importance():
    """Test feature importance extraction"""
    print("\n=== Testing Feature Importance Extraction ===")
    model, metadata = load_xgboost_model('btcusdt', 'balanced')
    
    if model is None or metadata is None:
        print("✗ Cannot test feature importance - model loading failed")
        return False
    
    features = metadata.get('features', [])
    if not features:
        print("✗ No features found in metadata")
        return False
    
    # Test with gain importance
    importance_df = get_feature_importance(model, features, 'gain')
    
    if importance_df is not None and not importance_df.empty:
        print("✓ Successfully extracted feature importance")
        print(f"  - Found importance scores for {len(importance_df)} features")
        print(f"  - Top feature: {importance_df.iloc[0]['feature_name']} "
              f"with {importance_df.iloc[0]['importance_pct']:.2f}% importance")
        return True
    else:
        print("✗ Failed to extract feature importance")
        return False

def test_full_analysis():
    """Test the full analysis workflow"""
    print("\n=== Testing Full Analysis Workflow ===")
    
    # Run analysis with minimal output
    results = analyze_model('btcusdt', 'balanced', ['gain'], 5)
    
    if results['success']:
        print("✓ Full analysis completed successfully")
        print(f"  - Symbol: {results['symbol']}")
        print(f"  - Model type: {results['model_type']}")
        print(f"  - Total features: {results['analysis']['feature_count']}")
        
        # Show top features
        top_features = results['analysis']['importance_types']['gain']['top_features']
        print(f"  - Top 5 features:")
        for feature in top_features:
            print(f"    {feature['rank']}. {feature['feature_name']} ({feature['importance_pct']:.2f}%)")
        
        # Show output file
        if 'gain' in results['output_files']:
            print(f"  - Output file: {os.path.basename(results['output_files']['gain'])}")
        
        return True
    else:
        print(f"✗ Analysis failed: {results['message']}")
        return False

def main():
    """Run all tests"""
    print("\n=== Feature Importance Analyzer Tests ===")
    
    success_count = 0
    
    # Test 1: Model loading
    if test_load_model():
        success_count += 1
    
    # Test 2: Feature importance extraction
    if test_feature_importance():
        success_count += 1
    
    # Test 3: Full analysis workflow
    if test_full_analysis():
        success_count += 1
    
    # Print summary
    print("\n=== Test Summary ===")
    print(f"Passed {success_count}/3 tests")
    
    if success_count == 3:
        print("✓ All tests passed!")
        return 0
    else:
        print("✗ Some tests failed.")
        return 1

if __name__ == "__main__":
    sys.exit(main())