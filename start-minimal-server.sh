#!/bin/bash

# Start Minimal Server Script
# This script starts the minimal server to ensure a quick startup

# Record start time
start_time=$(date +%s.%N)

# Log startup
echo "Starting minimal server at $(date)"
echo "================================================"

# Run the minimal server with Node.js
node minimal-server.js &
SERVER_PID=$!

# Save the PID for later cleanup
echo $SERVER_PID > minimal-server.pid
echo "Server started with PID: $SERVER_PID"

# Calculate elapsed time
end_time=$(date +%s.%N)
elapsed=$(echo "$end_time - $start_time" | bc)
echo "Server started in ${elapsed} seconds"

# Wait for server to exit
wait $SERVER_PID