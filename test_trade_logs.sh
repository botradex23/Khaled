#!/bin/bash

# This script tests the trade logs API endpoints
# It first starts the server if needed, then runs the test script

echo "===== Testing Trade Logs API ====="

# Check if the server is already running
SERVER_RUNNING=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/user || echo "error")

if [[ "$SERVER_RUNNING" == "error" || "$SERVER_RUNNING" == "000" ]]; then
  echo "Server is not running. Starting the server..."
  
  # Launch the server in the background
  npm run dev &
  SERVER_PID=$!
  
  # Wait for the server to start (typically takes a few seconds)
  echo "Waiting for the server to start..."
  for i in {1..30}; do
    sleep 1
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/user || echo "error")
    if [[ "$RESPONSE" != "error" && "$RESPONSE" != "000" ]]; then
      echo "Server is up and running!"
      break
    fi
    if [[ $i == 30 ]]; then
      echo "Timed out waiting for server to start. Exiting."
      kill $SERVER_PID
      exit 1
    fi
  done
else
  echo "Server is already running."
fi

# Run the test script
echo "Running trade logs API test..."
node test_trade_logs.js

# If we started the server, ask if we should stop it
if [[ -n "$SERVER_PID" ]]; then
  echo -n "Tests completed. Stop the server? (y/n): "
  read -r STOP_SERVER
  if [[ "$STOP_SERVER" == "y" ]]; then
    echo "Stopping server..."
    kill $SERVER_PID
    echo "Server stopped."
  else
    echo "Server left running (PID: $SERVER_PID). Remember to stop it manually when done."
  fi
fi

echo "===== Test Complete ====="