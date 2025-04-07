#!/bin/bash
#
# Stop Agent Script
# 
# This script safely stops the enhanced agent server running in the background
#

# Navigate to the project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "Stopping agent server from directory: $PROJECT_DIR"

# Check if PID file exists
PID_FILE="$PROJECT_DIR/agent-server.pid"
if [ ! -f "$PID_FILE" ]; then
  echo "PID file not found: $PID_FILE"
  echo "Agent server may not be running"
  exit 1
fi

# Read the PID from the file
PID=$(cat "$PID_FILE")
if [ -z "$PID" ]; then
  echo "PID file is empty"
  exit 1
fi

echo "Found agent server with PID: $PID"

# Check if the process is running
if ! ps -p $PID > /dev/null; then
  echo "Process with PID $PID is not running"
  echo "Removing stale PID file"
  rm "$PID_FILE"
  exit 0
fi

# Send SIGTERM to the process
echo "Sending SIGTERM to process $PID"
kill $PID

# Wait for the process to terminate
echo "Waiting for process to terminate..."
for i in {1..10}; do
  if ! ps -p $PID > /dev/null; then
    echo "Process terminated successfully"
    rm "$PID_FILE"
    exit 0
  fi
  sleep 1
done

# If the process hasn't terminated, send SIGKILL
echo "Process did not terminate gracefully, sending SIGKILL"
kill -9 $PID

# Final check
if ! ps -p $PID > /dev/null; then
  echo "Process terminated with SIGKILL"
  rm "$PID_FILE"
  exit 0
else
  echo "Failed to terminate process $PID"
  exit 1
fi
