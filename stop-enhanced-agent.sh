#!/bin/bash

# Stop Enhanced Agent Script
# This script stops the enhanced agent terminal server

# Check if the server is running
if [ ! -f "agent-terminal-server.pid" ]; then
  echo "❌ Agent Terminal Server is not running (no PID file found)"
  exit 1
fi

# Get the process ID
PID=$(cat agent-terminal-server.pid)

# Check if the process exists
if ! ps -p $PID > /dev/null; then
  echo "❌ Process with PID $PID is not running (stale PID file)"
  rm agent-terminal-server.pid
  exit 1
fi

# Kill the process
echo "🛑 Stopping Agent Terminal Server with PID $PID..."
kill $PID

# Wait for the process to terminate
for i in {1..5}; do
  if ! ps -p $PID > /dev/null; then
    rm agent-terminal-server.pid
    echo "✅ Agent Terminal Server stopped successfully"
    exit 0
  fi
  echo "Waiting for process to terminate... ($i/5)"
  sleep 1
done

# Force kill if it's still running
if ps -p $PID > /dev/null; then
  echo "⚠️ Process is still running, force killing..."
  kill -9 $PID
  rm agent-terminal-server.pid
  echo "✅ Agent Terminal Server force stopped"
fi