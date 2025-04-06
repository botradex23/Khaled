#!/bin/bash
# Tradeliy Deployment Cleanup Script
# This script helps clean up unnecessary files before deployment
# WARNING: Run this in a copy of your project directory, not the original!

echo "Tradeliy Deployment Cleanup Script"
echo "=================================="
echo "This will remove development files and directories."
echo "Make sure you have a backup before proceeding!"
echo

# Ask for confirmation
read -p "Continue with cleanup? (y/n): " confirm
if [[ "$confirm" != "y" ]]; then
  echo "Cleanup cancelled."
  exit 1
fi

echo "Starting cleanup process..."

# Remove development directories
echo "Removing development directories..."
rm -rf attached_assets bin .cache docs load_test logs __pycache__ temp tests unit_tests .git .workflow .upm .pythonlibs cleanup_example cleanup_dirs_example

# Remove test files
echo "Removing test files..."
find . -type f -name "*test*.js" -delete
find . -type f -name "*test*.py" -delete
find . -type f -name "*test*.ts" -delete
find . -type f -name "*test*.cjs" -delete
find . -type f -name "*test*.mjs" -delete

# Remove development utilities
echo "Removing development utilities..."
find . -type f -name "check-*.js" -delete
find . -type f -name "direct-*.js" -delete
find . -type f -name "simple-*.js" -delete
find . -type f -name "*-agent-*.js" -not -path "./agent/*" -delete
find . -type f -name "*.log" -delete
find . -type f -name "*.pid" -delete
find . -type f -name "diagnose-*.js" -delete
find . -type f -name "run-*.js" -delete
find . -type f -name "start_*.js" -delete

# Remove temporary data files
echo "Removing temporary data files..."
find . -type f -name "bot_*.txt" -delete
find . -type f -name "binance_*.md" -delete
find . -type f -name "demo-*.json" -delete
find . -type f -name "raw_*.json" -delete
find . -type f -name "response.*" -delete

echo "Cleanup complete."
echo "Make sure to check the directory manually to ensure no important files were removed."