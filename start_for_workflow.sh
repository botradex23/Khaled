#!/bin/bash
# Start script for the Replit workflow with debug output

echo "Starting Cryptocurrency Trading Platform via shell script..."
node start.cjs > server_output.log 2>&1 &
sleep 2
echo "Check server_output.log for details"
