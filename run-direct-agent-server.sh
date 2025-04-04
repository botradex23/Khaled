#!/bin/bash

# Run the direct agent server
node direct-agent-server.js > direct-agent-server.log 2>&1 &
echo $! > direct-agent-server.pid
echo "Direct agent server started with PID $(cat direct-agent-server.pid)"
sleep 2
echo "Testing server..."
curl -s http://localhost:5002/health | jq .