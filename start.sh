#!/bin/bash
# Start script for the Crypto Trading Platform
# This script ensures all dependencies are properly installed and starts the application

# Print banner
echo "=========================================="
echo "  STARTING CRYPTO TRADING PLATFORM"
echo "=========================================="

# Check for necessary dependencies
echo "Checking dependencies..."

# Node.js dependencies
echo "Installing Node.js dependencies..."
npm install express node-fetch

# Python dependencies
echo "Ensuring Python dependencies are installed..."
pip install flask flask-cors python-dotenv requests binance-connector

# Start the application
echo "Starting application..."

# Try different Node.js servers in order of complexity
if node minimal_server.js; then
  echo "Server started successfully using minimal_server.js"
else
  echo "Minimal server failed, trying server/simple_index.js..."
  if node server/simple_index.js; then
    echo "Server started successfully using server/simple_index.js"
  else
    echo "Simple server (ESM) failed, trying server/simple_index.cjs..."
    if node server/simple_index.cjs; then
      echo "Server started successfully using server/simple_index.cjs"
    else
      echo "All Node.js servers failed, starting Python server only..."
      python binance_api_server.py
    fi
  fi
fi