#!/bin/bash
# Run the Binance API server with improved error handling

echo "Starting Binance API server in the background..."
python binance_api_server.py &
PID=$!
echo "Server started with PID $PID"

# Wait a moment for it to initialize
echo "Waiting for server to initialize..."
sleep 15

# Check if process is still running
if ps -p $PID > /dev/null; then
    echo "Server is running! Checking API..."
    RESPONSE=$(curl -s http://localhost:5001/api/status)
    if [ $? -eq 0 ]; then
        echo "API is accessible: $RESPONSE"
    else
        echo "API is not responding, but process is running"
    fi
else
    echo "Server process exited. Check logs below:"
    cat binance_api_server.log
fi
