#!/bin/bash
# Tradeliy Safe Deployment Cleanup Dry Run Script
# This script shows what files would be removed by the cleanup script
# without actually deleting anything

echo "Tradeliy Safe Deployment Cleanup Dry Run"
echo "========================================"
echo "This will show what files would be removed by the cleanup script."
echo "No files will be deleted in this dry run."
echo

# Development directories that would be removed
echo "Development directories that would be removed:"
for dir in attached_assets bin .cache docs load_test __pycache__ temp .git .workflow .upm cleanup_example cleanup_dirs_example; do
  if [ -d "$dir" ]; then
    echo "- $dir"
  fi
done

# Test files that would be removed (excluding ML-related)
echo -e "\nTest files that would be removed (sample):"
find . -type f -name "*test*.js" -o -name "*test*.ts" -o -name "*test*.cjs" -o -name "*test*.mjs" | head -10
echo "... and more"

# Python test files (excluding ML-related)
echo -e "\nPython test files that would be removed (sample):"
find . -type f -name "*test*.py" | grep -v "predict" | grep -v "ml_" | grep -v "model" | head -10
echo "... and more"

# Development utilities that would be removed
echo -e "\nDevelopment utilities that would be removed (sample):"
find . -type f -name "check-*.js" -o -name "direct-*.js" -o -name "simple-*.js" -o -name "*-agent-*.js" -not -path "./agent/*" -o -name "diagnose-*.js" -o -name "run-*.js" -o -name "start_*.js" | head -10
echo "... and more"

# Log files that would be removed (excluding ML-related)
echo -e "\nLog files that would be removed (sample):"
find . -type f -name "*.log" | grep -v "xgboost" | grep -v "ml_" | grep -v "prediction" | grep -v "model" | head -10
echo "... and more"

# Temporary files that would be removed
echo -e "\nTemporary files that would be removed (sample):"
find . -type f -name "bot_*.txt" -o -name "binance_*.md" -o -name "demo-*.json" -o -name "raw_*.json" -o -name "response.*" | head -10
echo "... and more"

# ML-related files that would be preserved
echo -e "\nML-related files that would be preserved (sample):"
find ./python_app -type f -name "*xgboost*" -o -name "*predict*" -o -name "*train*" -o -name "*model*" -o -name "ml_*" | head -20
echo "... and more"

# XGBoost model files that would be preserved
echo -e "\nXGBoost model files that would be preserved:"
find . -name "*.model" | sort

echo -e "\nEstimated space that would be freed:"
TOTAL_SIZE=0
for dir in attached_assets bin .cache docs load_test __pycache__ temp .git .workflow .upm cleanup_example cleanup_dirs_example; do
  if [ -d "$dir" ]; then
    SIZE=$(du -sk "$dir" | awk '{print $1}')
    TOTAL_SIZE=$((TOTAL_SIZE + SIZE))
  fi
done
echo "Approximately $((TOTAL_SIZE / 1024)) MB"

echo -e "\nTo actually perform the cleanup, run the 'safe-cleanup.sh' script."
echo "IMPORTANT: Make sure you have a backup before running the actual cleanup."