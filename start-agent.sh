#!/bin/bash
#
# Start Agent Script
# 
# This script starts the enhanced agent server as a background process
# and ensures it continues running even if the terminal is closed
#

# Navigate to the project directory
# Update this path to your project directory on the VPS
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "Starting agent server from directory: $PROJECT_DIR"

# Ensure logs directory exists
mkdir -p "$PROJECT_DIR/logs"

# Set up log file
LOG_FILE="$PROJECT_DIR/logs/agent-start-$(date +"%Y-%m-%d_%H-%M-%S").log"
echo "Logging to: $LOG_FILE"

# Check if OpenAI API key is set
if [ -z "$OPENAI_API_KEY" ]; then
  if [ -f "$PROJECT_DIR/.env" ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' "$PROJECT_DIR/.env" | xargs)
  else
    echo "Warning: OPENAI_API_KEY not set and no .env file found"
    echo "The agent may not function correctly without an API key"
  fi
fi

# Check if node is installed
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed" | tee -a "$LOG_FILE"
  echo "Please install Node.js before running this script" | tee -a "$LOG_FILE"
  exit 1
fi

# Run the agent server in the background with nohup to keep it running after terminal closes
echo "Starting enhanced agent server..." | tee -a "$LOG_FILE"
nohup node run-enhanced-agent.js >> "$LOG_FILE" 2>&1 &

# Get the process ID
AGENT_PID=$!
echo "Agent server started with PID: $AGENT_PID" | tee -a "$LOG_FILE"

# Save the PID to a file for later reference
echo $AGENT_PID > "$PROJECT_DIR/agent-server.pid"
echo "PID saved to: $PROJECT_DIR/agent-server.pid" | tee -a "$LOG_FILE"

echo "Agent server is running in the background"
echo "To check the logs, run: tail -f $LOG_FILE"
echo "To stop the server, run: kill $(cat $PROJECT_DIR/agent-server.pid)"
