#!/bin/bash
# Run both the Node.js server and Python Flask service

echo "Starting Python Flask service..."
python python_app/run_flask_service.py & 
PYTHON_PID=$!

echo "Starting Node.js server..."
npm run dev &
NODE_PID=$!

# Function to handle shutdown
function cleanup {
  echo "Stopping services..."
  kill $PYTHON_PID
  kill $NODE_PID
  exit 0
}

# Trap SIGINT and SIGTERM signals
trap cleanup SIGINT SIGTERM

# Wait for either process to exit
wait $PYTHON_PID $NODE_PID