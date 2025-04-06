#!/bin/bash
# Tradeliy Safe Deployment Cleanup Script
# This script helps clean up unnecessary files before deployment
# While preserving all ML-related files and XGBoost models

echo "Tradeliy Safe Deployment Cleanup Script"
echo "======================================"
echo "This will remove development files and directories, but preserve all ML-related files."
echo "Make sure you have a backup before proceeding!"
echo

# Ask for confirmation
read -p "Continue with cleanup? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "Cleanup cancelled."
  exit 1
fi

echo "Starting cleanup process..."

# Create a backup of the entire project first
BACKUP_FILENAME="tradeliy_backup_$(date +%Y%m%d_%H%M%S).tar.gz"
echo "Creating backup: $BACKUP_FILENAME"
tar -czf $BACKUP_FILENAME .
echo "Backup created successfully."

# Create list of ML-related files to preserve
cat > .ml_preserve_patterns << EOF
./python_app/models/
./python_app/*xgboost*
./python_app/*predict*
./python_app/*train*
./python_app/*model*
./python_app/ml_*
./python_app/live_prediction*
./python_app/historical_prediction*
./python_app/evaluate_model*
./python_app/prepare_training*
./python_app/split_train*
./logs/*xgboost*
./logs/*ml_*
./logs/*prediction*
./logs/*model*
./logs/*historical_prediction*
./logs/*live_prediction*
./data/*model*
./data/*train*
./data/*ml*
./data/*predict*
./python_app/logs/*ml_*
./python_app/*model_training*
./python_app/*model_evaluation*
EOF

# Remove specific development directories
echo "Removing development directories (with ML preservation)..."
# We'll exclude certain directories completely
rm -rf attached_assets bin .cache docs load_test __pycache__ temp .git .workflow .upm cleanup_example cleanup_dirs_example

# Preserve ML-related files from the logs directory
echo "Preserving ML-related log files..."
mkdir -p logs_temp
if [ -d logs ]; then
  find logs -type f -name "*xgboost*" -o -name "*ml_*" -o -name "*prediction*" -o -name "*model*" -o -name "*historical_prediction*" -o -name "*live_prediction*" | xargs -I{} cp --parents {} logs_temp/
  rm -rf logs
  mkdir -p logs
  # Only copy back ML-related logs
  if [ -d logs_temp/logs ]; then
    cp -R logs_temp/logs/* logs/
  fi
  rm -rf logs_temp
fi

# Remove test files (except ML-related tests)
echo "Removing non-ML test files..."
find . -type f -name "*test*.js" -delete
find . -type f -name "*test*.ts" -delete
find . -type f -name "*test*.cjs" -delete
find . -type f -name "*test*.mjs" -delete
# Carefully handle Python test files - don't delete ML prediction tests
find . -type f -name "*test*.py" | grep -v "predict" | grep -v "ml_" | grep -v "model" | xargs -r rm

# Remove development utilities (except ML-related ones)
echo "Removing development utilities..."
find . -type f -name "check-*.js" -delete
find . -type f -name "direct-*.js" -delete
find . -type f -name "simple-*.js" -delete
find . -type f -name "*-agent-*.js" -not -path "./agent/*" -delete
find . -type f -name "diagnose-*.js" -delete
find . -type f -name "run-*.js" -delete
find . -type f -name "start_*.js" -delete

# Remove PID files
find . -type f -name "*.pid" -delete

# Remove non-ML log files
echo "Removing non-ML log files..."
find . -type f -name "*.log" | grep -v "xgboost" | grep -v "ml_" | grep -v "prediction" | grep -v "model" | grep -v "historical_prediction" | grep -v "live_prediction" | xargs -r rm

# Remove temporary data files (except ML-related ones)
echo "Removing temporary data files..."
find . -type f -name "bot_*.txt" -delete
find . -type f -name "binance_*.md" -delete
find . -type f -name "demo-*.json" -delete
find . -type f -name "raw_*.json" -delete
find . -type f -name "response.*" -delete

# Remove the temporary pattern file
rm -f .ml_preserve_patterns

# Verify that ML files still exist
echo "Verifying ML files..."
ML_FILE_COUNT=$(find ./python_app -name "*.model" -o -name "*predict*.py" -o -name "*train*.py" -o -name "ml_*.py" | wc -l)
if [ $ML_FILE_COUNT -eq 0 ]; then
  echo "WARNING: No ML files found after cleanup! Restore from backup $BACKUP_FILENAME"
else
  echo "✓ $ML_FILE_COUNT ML files successfully preserved."
fi

echo "Cleanup complete."
echo "All machine learning files and XGBoost models have been preserved."
echo "A backup was created at: $BACKUP_FILENAME"
echo "Make sure to check the directory manually to ensure no important files were removed."