#!/bin/bash

# Crypto Trading Platform Launcher
echo "========================================================"
echo "      Crypto Trading Platform - Launcher Script         "
echo "========================================================"

# Check Python environment
echo "Checking Python environment..."
if ! command -v python &> /dev/null; then
    echo "Python not found. Installing Python 3.11..."
    # Python installation will be handled by Replit
else
    python_version=$(python --version)
    echo "Using $python_version"
fi

# Check if binance_api_server.py exists
if [ ! -f "binance_api_server.py" ]; then
    echo "Error: binance_api_server.py not found!"
    exit 1
fi

# Start the minimal Node.js server in the background
echo "Starting minimal Node.js server..."
node minimal_server.cjs &
SERVER_PID=$!

# Wait for server to fully start
echo "Waiting for server to initialize..."
sleep 5

# Verify API server is running
echo "Verifying Binance API server..."
curl -s http://localhost:5000/api/status > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Server is running at http://localhost:5000"
else
    echo "❌ Server failed to start"
    kill $SERVER_PID
    exit 1
fi

# Check Python server is running
curl -s http://localhost:5001/ping > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Python Binance API server is running at http://localhost:5001"
else
    echo "❌ Python Binance API server failed to start"
    kill $SERVER_PID
    exit 1
fi

echo ""
echo "========================================================"
echo "      Crypto Trading Platform is now running!           "
echo "========================================================"
echo "  - Main interface: http://localhost:5000              "
echo "  - API endpoints:                                      "
echo "    * System status: http://localhost:5000/api/status   "
echo "    * Binance API:   http://localhost:5000/api/python/* "
echo "========================================================"
echo ""

# Keep the script running (in foreground mode)
wait $SERVER_PID
