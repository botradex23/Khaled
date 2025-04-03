#!/bin/bash

# Simple wrapper to run the proper server script
# This script is used as an entry point for the Replit workflow

echo "Starting the trading platform wrapper..."

# Make sure scripts are executable
chmod +x run_server.cjs
chmod +x minimal_server.cjs

# Run the server using our CommonJS script
node run_server.cjs